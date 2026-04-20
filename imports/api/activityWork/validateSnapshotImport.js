/**
 * Lightweight validator for snapshot import bodies coming from
 * `activitywork-gateway` (or any equivalent local tool).
 *
 * Intentionally independent of `@sarkarshubh/activitywork-sdk`: the placeholder
 * Time Huddle just needs to receive the payload and render it. We accept any
 * plain JSON object, reject explicit `ok: false` error envelopes, and flag the
 * minimal shape we rely on for the metadata record + events table.
 */

/** Default max body size when `ACTIVITYWORK_IMPORT_MAX_BYTES` is unset (2 MiB). */
export const DEFAULT_IMPORT_MAX_BYTES = 2 * 1024 * 1024;

export const IMPORT_ERROR_CODES = {
    oversize: "activity-work-import-oversize",
    parse: "activity-work-import-parse",
    invalid: "activity-work-import-invalid",
    unauthorized: "activity-work-import-unauthorized",
    rateLimit: "activity-work-import-rate-limit",
};

/**
 * @returns {number}
 */
export function getMaxImportBytes() {
    const raw = process.env.ACTIVITYWORK_IMPORT_MAX_BYTES;
    if (raw == null || raw === "") return DEFAULT_IMPORT_MAX_BYTES;
    const n = Number.parseInt(String(raw), 10);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_IMPORT_MAX_BYTES;
}

/**
 * Shape of a successfully-imported snapshot payload. All fields are optional
 * from this layer's point of view — we extract whatever metadata is present
 * and let the UI handle missing fields gracefully.
 *
 * @typedef {{
 *   ok?: true;
 *   schemaVersion?: number;
 *   generatedAt?: string;
 *   range?: string | { preset?: string; label?: string; start?: string; end?: string };
 *   bucketId?: string;
 *   eventCount?: number;
 *   truncated?: boolean;
 *   limitPerBucket?: number;
 *   events?: unknown[];
 *   summary?: Array<{ app?: string; totalDurationSeconds?: number }>;
 *   source?: { app?: string; host?: string };
 *   [key: string]: unknown;
 * }} ImportedSnapshot
 */

/** @param {unknown} v */
function isPlainObject(v) {
    return (
        v !== null && typeof v === "object" && !Array.isArray(v)
    );
}

/**
 * Validates a parsed JSON body. Accepts any plain object that does not
 * explicitly set `ok: false` (which would be an error envelope).
 *
 * @param {unknown} parsed
 * @returns {{ ok: true, payload: ImportedSnapshot } | { ok: false, code: string, message: string }}
 */
export function validateSnapshotPayloadObject(parsed) {
    if (!isPlainObject(parsed)) {
        return {
            ok: false,
            code: IMPORT_ERROR_CODES.invalid,
            message:
                "Snapshot body must be a JSON object (got " +
                (parsed === null ? "null" : Array.isArray(parsed) ? "array" : typeof parsed) +
                ")",
        };
    }

    const obj = /** @type {Record<string, unknown>} */ (parsed);

    if (obj.ok === false) {
        const err =
            typeof obj.error === "string" && obj.error.length > 0
                ? obj.error
                : "Snapshot reports ok: false";
        return {
            ok: false,
            code: IMPORT_ERROR_CODES.invalid,
            message: err,
        };
    }

    if ("events" in obj && obj.events != null && !Array.isArray(obj.events)) {
        return {
            ok: false,
            code: IMPORT_ERROR_CODES.invalid,
            message: "Expected `events` to be an array when present",
        };
    }

    return { ok: true, payload: /** @type {ImportedSnapshot} */ (obj) };
}

/**
 * @param {string} text
 * @returns {{ ok: true, value: unknown } | { ok: false, code: string, message: string }}
 */
export function parseJsonImportBody(text) {
    try {
        return { ok: true, value: JSON.parse(text) };
    } catch {
        return {
            ok: false,
            code: IMPORT_ERROR_CODES.parse,
            message: "Body is not valid JSON",
        };
    }
}
