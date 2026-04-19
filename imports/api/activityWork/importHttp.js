import { WebApp } from "meteor/webapp";
import {
    IMPORT_ERROR_CODES,
    getMaxImportBytes,
    parseJsonImportBody,
    validateSnapshotPayloadObject,
} from "./validateSnapshotImport.js";

/** Canonical path for manual snapshot import (`TIMEHUDDLE_IMPORT_URL` in runtime handoffs). */
export const ACTIVITYWORK_IMPORT_PATH = "/api/activitywork/import";

const IMPORT_HEADER_SECRET = "x-activitywork-import-secret";

/** @type {{ storedAt: string; byteLength: number; range?: string; eventCount?: number } | null} */
let lastImportRecord = null;

/** Production Time Huddle should persist imports in Mongo or another store; placeholder only. */
export function getLastImportRecord() {
    return lastImportRecord;
}

/**
 * Preset id for snapshot `range` (legacy string or {@link import("@sarkarshubh/activitywork-sdk").SnapshotRangeBlock}).
 * @param {import("@sarkarshubh/activitywork-sdk").SnapshotOkFields["range"]} range
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
 * @param {import('http').IncomingMessage} req
 * @param {string | undefined} secret
 */
function importSecretOk(req, secret) {
    if (secret == null || secret === "") return true;
    const h = req.headers[IMPORT_HEADER_SECRET];
    if (typeof h === "string" && h === secret) return true;
    const auth = req.headers.authorization;
    if (
        typeof auth === "string" &&
        auth.startsWith("Bearer ") &&
        auth.slice(7) === secret
    ) {
        return true;
    }
    return false;
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

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    const secret = process.env.ACTIVITYWORK_IMPORT_SHARED_SECRET;
    if (!importSecretOk(req, secret)) {
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

    const maxBytes = getMaxImportBytes();

    (async () => {
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

        lastImportRecord = {
            storedAt: new Date().toISOString(),
            byteLength: buf.length,
            ...(range != null ? { range } : {}),
            ...(eventCount != null ? { eventCount } : {}),
        };

        sendJson(res, 200, {
            ok: true,
            imported: lastImportRecord,
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
