import { WebApp } from "meteor/webapp";

import { hashActivityWorkPushToken } from "../pushToken/hashToken.js";
import { ActivityWorkPushTokens } from "../pushToken/pushTokens.collection.js";
import { ActivityWorkImports } from "./imports.collection.js";
import {
    IMPORT_ERROR_CODES,
    getMaxImportBytes,
    parseJsonImportBody,
    validateSnapshotPayloadObject,
} from "./validateSnapshotImport.js";

/** Canonical path for manual snapshot import (`TIMEHUDDLE_IMPORT_URL` in runtime handoffs). */
export const ACTIVITYWORK_IMPORT_PATH = "/api/activitywork/import";

/** GET returns the raw JSON body of the last successful import (same auth rules as POST when secret is set). */
export const ACTIVITYWORK_IMPORT_LATEST_JSON_PATH =
    "/api/activitywork/import/latest";

const IMPORT_HEADER_SECRET = "x-activitywork-import-secret";

/** @param {string | undefined} name */
function envTruthy(name) {
    const v = process.env[name];
    if (v == null || v === "") return false;
    const s = String(v).trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes";
}

/**
 * Last successful snapshot import (HTTP POST). In-memory only.
 * @typedef {{
 *   storedAt: string;
 *   byteLength: number;
 *   range?: string;
 *   eventCount?: number;
 *   bucketId?: string;
 *   truncated?: boolean;
 *   userAgent?: string;
 * }} LastImportRecord
 */

/** @type {LastImportRecord | null} */
let lastImportRecord = null;

/** @type {string | null} Raw UTF-8 body of the last successful import (for GET latest). */
let lastImportRawJsonBody = null;

/** Production Time Huddle should persist imports in Mongo or another store; placeholder only. */
export function getLastImportRecord() {
    return lastImportRecord;
}

/**
 * Raw UTF-8 JSON body of the last successful import. Used by the `Pushed Snapshot`
 * view to render the full payload (events) without re-shipping the shared secret
 * through the HTTP GET route.
 * @returns {string | null}
 */
export function getLastImportRawBody() {
    return lastImportRawJsonBody;
}

/**
 * Preset id for snapshot `range`. Accepts either the legacy `"1h"`-style string
 * or the modern `{ preset, label?, start?, end? }` object that aw-gateway sends.
 *
 * @param {unknown} range
 * @returns {string | undefined}
 */
function snapshotRangePreset(range) {
    if (typeof range === "string") return range;
    if (
        range &&
        typeof range === "object" &&
        !Array.isArray(range) &&
        typeof /** @type {{ preset?: unknown }} */ (range).preset === "string"
    ) {
        return /** @type {{ preset: string }} */ (range).preset;
    }
    return undefined;
}

const rateState = new Map();

/**
 * Placeholder rate limit (per client IP). TODO: replace with Redis / edge limiting in production.
 * @param {string} clientKey
 * @returns {boolean} true if allowed
 */
function checkRateLimit(clientKey) {
    const windowMs = Number.parseInt(
        process.env.ACTIVITYWORK_IMPORT_RATE_WINDOW_MS ?? "60000",
        10,
    );
    const max = Number.parseInt(
        process.env.ACTIVITYWORK_IMPORT_RATE_MAX ?? "30",
        10,
    );
    const windowMsSafe = Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60000;
    const maxSafe = Number.isFinite(max) && max > 0 ? max : 30;

    const now = Date.now();
    let entry = rateState.get(clientKey);
    if (!entry || now - entry.windowStart >= windowMsSafe) {
        rateState.set(clientKey, { windowStart: now, count: 1 });
        return true;
    }
    if (entry.count >= maxSafe) return false;
    entry.count += 1;
    return true;
}

/** @param {import('http').IncomingMessage} req */
function getClientKey(req) {
    const raw = req.headers["x-forwarded-for"];
    const fromFwd =
        typeof raw === "string" && raw.length > 0
            ? raw.split(",")[0].trim()
            : null;
    return fromFwd || req.socket?.remoteAddress || "unknown";
}

/**
 * Resolve a user's `_id` from the request's `Authorization: Bearer <token>` by
 * hashing the bearer and looking it up in {@link ActivityWorkPushTokens}.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<string | null>}
 */
async function resolveUserIdFromRequest(req) {
    const auth = req.headers.authorization;
    if (typeof auth !== "string" || !auth.startsWith("Bearer ")) return null;
    const bearer = auth.slice(7);
    if (bearer.length === 0) return null;
    const tokenHash = hashActivityWorkPushToken(bearer);
    const doc = await ActivityWorkPushTokens.findOneAsync(
        { tokenHash },
        { fields: { userId: 1 } },
    );
    return doc?.userId ?? null;
}

/**
 * Whether a request is allowed for the import endpoints. The Bearer can be:
 *   - a valid per-user push token (preferred; `userId` is also returned for attribution), or
 *   - the legacy `ACTIVITYWORK_IMPORT_SHARED_SECRET` (when configured).
 *
 * When the env secret is unset and no per-user token matches, requests pass
 * (placeholder mode) but `userId` will be `null`.
 *
 * @param {import('http').IncomingMessage} req
 * @param {string | undefined} secret
 * @returns {Promise<{ ok: boolean; userId: string | null }>}
 */
async function authorizeImport(req, secret) {
    const userId = await resolveUserIdFromRequest(req);
    if (userId) return { ok: true, userId };

    if (secret == null || secret === "") return { ok: true, userId: null };

    const h = req.headers[IMPORT_HEADER_SECRET];
    if (typeof h === "string" && h === secret) {
        return { ok: true, userId: null };
    }
    const auth = req.headers.authorization;
    if (
        typeof auth === "string" &&
        auth.startsWith("Bearer ") &&
        auth.slice(7) === secret
    ) {
        return { ok: true, userId: null };
    }
    return { ok: false, userId: null };
}

/**
 * Auth for `POST /api/activitywork/import` only.
 *
 * When `ACTIVITYWORK_IMPORT_POST_REQUIRES_USER_TOKEN` is `true` / `1` / `yes`,
 * only `Authorization: Bearer <raw per-user token>` that matches a document in
 * {@link ActivityWorkPushTokens} is accepted (multi-tenant production). Legacy
 * shared-secret Bearer / header is **not** accepted on POST.
 *
 * Otherwise uses {@link authorizeImport} (per-user Bearer **or** optional
 * `ACTIVITYWORK_IMPORT_SHARED_SECRET` for migration).
 *
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<{ ok: boolean; userId: string | null }>}
 */
async function authorizeImportPost(req) {
    if (envTruthy("ACTIVITYWORK_IMPORT_POST_REQUIRES_USER_TOKEN")) {
        const userId = await resolveUserIdFromRequest(req);
        return userId ? { ok: true, userId } : { ok: false, userId: null };
    }
    return authorizeImport(req, process.env.ACTIVITYWORK_IMPORT_SHARED_SECRET);
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {number} maxBytes
 * @returns {Promise<Buffer>}
 */
function readBodyLimited(req, maxBytes) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let total = 0;
        req.on("data", (chunk) => {
            total += chunk.length;
            if (total > maxBytes) {
                req.destroy();
                reject(new Error(IMPORT_ERROR_CODES.oversize));
                return;
            }
            chunks.push(chunk);
        });
        req.on("end", () => {
            resolve(Buffer.concat(chunks));
        });
        req.on("error", reject);
    });
}

/**
 * @param {{ methods?: string }} [opts]
 */
function corsHeaders(opts) {
    const methods = opts?.methods ?? "POST, OPTIONS";
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": methods,
        "Access-Control-Allow-Headers": `Content-Type, Authorization, ${IMPORT_HEADER_SECRET}`,
        "Access-Control-Max-Age": "86400",
    };
}

/**
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {Record<string, unknown>} body
 */
function sendJson(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        ...corsHeaders(),
    });
    res.end(payload);
}

const CORS_IMPORT_ALL = {
    methods: "GET, HEAD, OPTIONS, POST",
};

WebApp.connectHandlers.use((req, res, next) => {
    const pathOnly = (req.url ?? "").split("?")[0];
    if (pathOnly !== ACTIVITYWORK_IMPORT_LATEST_JSON_PATH) {
        next();
        return;
    }

    const secret = process.env.ACTIVITYWORK_IMPORT_SHARED_SECRET;

    (async () => {
        const authResult = await authorizeImport(req, secret);
        if (!authResult.ok) {
            res.writeHead(401, {
                "Content-Type": "application/json; charset=utf-8",
                ...corsHeaders(CORS_IMPORT_ALL),
            });
            res.end(
                JSON.stringify({
                    error: "Invalid or missing import credentials",
                    code: IMPORT_ERROR_CODES.unauthorized,
                }),
            );
            return;
        }

        if (req.method === "OPTIONS") {
            res.writeHead(204, corsHeaders(CORS_IMPORT_ALL));
            res.end();
            return;
        }

        if (req.method !== "GET" && req.method !== "HEAD") {
            res.writeHead(405, {
                "Content-Type": "application/json; charset=utf-8",
                ...corsHeaders(CORS_IMPORT_ALL),
            });
            res.end(
                JSON.stringify({
                    error: "Method not allowed",
                    code: "activity-work-import-latest-method",
                }),
            );
            return;
        }

        if (lastImportRawJsonBody == null) {
            res.writeHead(404, {
                "Content-Type": "application/json; charset=utf-8",
                ...corsHeaders(CORS_IMPORT_ALL),
            });
            res.end(
                JSON.stringify({
                    error: "No snapshot imported yet",
                    code: "activity-work-import-latest-empty",
                }),
            );
            return;
        }

        const byteLength = Buffer.byteLength(lastImportRawJsonBody, "utf8");
        if (req.method === "HEAD") {
            res.writeHead(200, {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Length": String(byteLength),
                "Cache-Control": "no-store",
                ...corsHeaders(CORS_IMPORT_ALL),
            });
            res.end();
            return;
        }

        res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            ...corsHeaders(CORS_IMPORT_ALL),
        });
        res.end(lastImportRawJsonBody, "utf8");
    })().catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[activitywork-import-latest]", err);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "Internal error", code: "activity-work-import-latest-unknown" }));
    });
});

WebApp.connectHandlers.use((req, res, next) => {
    const pathOnly = (req.url ?? "").split("?")[0];
    if (pathOnly !== ACTIVITYWORK_IMPORT_PATH) {
        next();
        return;
    }

    if (req.method === "OPTIONS") {
        res.writeHead(204, corsHeaders());
        res.end();
        return;
    }

    if (req.method !== "POST") {
        sendJson(res, 405, {
            error: "Method not allowed",
            code: "activity-work-import-method",
        });
        return;
    }

    const maxBytes = getMaxImportBytes();

    (async () => {
        const auth = await authorizeImportPost(req);
        if (!auth.ok) {
            sendJson(res, 401, {
                error: "Invalid or missing import credentials",
                code: IMPORT_ERROR_CODES.unauthorized,
            });
            return;
        }

        const clientKey = getClientKey(req);
        if (!checkRateLimit(clientKey)) {
            sendJson(res, 429, {
                error: "Too many import requests",
                code: IMPORT_ERROR_CODES.rateLimit,
            });
            return;
        }

        let buf;
        try {
            buf = await readBodyLimited(req, maxBytes);
        } catch (err) {
            const code =
                err && typeof err === "object" && "message" in err
                    ? String(/** @type {{ message: unknown }} */ (err).message)
                    : "";
            if (code === IMPORT_ERROR_CODES.oversize) {
                sendJson(res, 413, {
                    error: `Body exceeds ${maxBytes} bytes`,
                    code: IMPORT_ERROR_CODES.oversize,
                });
                return;
            }
            sendJson(res, 400, {
                error: "Could not read request body",
                code: IMPORT_ERROR_CODES.parse,
            });
            return;
        }

        if (buf.length > maxBytes) {
            sendJson(res, 413, {
                error: `Body exceeds ${maxBytes} bytes`,
                code: IMPORT_ERROR_CODES.oversize,
            });
            return;
        }

        const text = buf.toString("utf8");
        const parsedWrapper = parseJsonImportBody(text);
        if (!parsedWrapper.ok) {
            sendJson(res, 400, {
                error: parsedWrapper.message,
                code: parsedWrapper.code,
            });
            return;
        }

        const validated = validateSnapshotPayloadObject(parsedWrapper.value);
        if (!validated.ok) {
            sendJson(res, 400, {
                error: validated.message,
                code: validated.code,
            });
            return;
        }

        const p = validated.payload;
        const range = snapshotRangePreset(p.range);
        let eventCount;
        if (typeof p.eventCount === "number" && Number.isFinite(p.eventCount)) {
            eventCount = p.eventCount;
        } else if (Array.isArray(p.events)) {
            eventCount = p.events.length;
        }

        const uaRaw = req.headers["user-agent"];
        const userAgent =
            typeof uaRaw === "string" && uaRaw.length > 0
                ? uaRaw.length > 120
                    ? `${uaRaw.slice(0, 120)}…`
                    : uaRaw
                : undefined;
        const bucketId =
            typeof p.bucketId === "string" && p.bucketId.trim().length > 0
                ? p.bucketId.trim()
                : undefined;

        lastImportRecord = {
            storedAt: new Date().toISOString(),
            byteLength: buf.length,
            ...(range != null ? { range } : {}),
            ...(eventCount != null ? { eventCount } : {}),
            ...(bucketId != null ? { bucketId } : {}),
            ...(p.truncated === true ? { truncated: true } : {}),
            ...(userAgent != null ? { userAgent } : {}),
        };
        lastImportRawJsonBody = text;

        if (auth.userId) {
            try {
                await ActivityWorkImports.insertAsync({
                    userId: auth.userId,
                    receivedAt: new Date(),
                    byteLength: buf.length,
                    ...(range != null ? { range } : {}),
                    ...(eventCount != null ? { eventCount } : {}),
                    ...(bucketId != null ? { bucketId } : {}),
                    ...(p.truncated === true ? { truncated: true } : {}),
                    ...(userAgent != null ? { userAgent } : {}),
                    payload: parsedWrapper.value,
                });
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error("[activitywork-import-insert]", err);
            }
        }

        sendJson(res, 200, {
            ok: true,
            imported: lastImportRecord,
            attributed: auth.userId ? true : false,
        });
    })().catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[activitywork-import]", err);
        sendJson(res, 500, {
            error: "Import failed",
            code: "activity-work-import-unknown",
        });
    });
});
