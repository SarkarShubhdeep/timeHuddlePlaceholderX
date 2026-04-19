import { validateSnapshotPayload } from "@sarkarshubh/activitywork-sdk";

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
 * Validates manual-import JSON using `@sarkarshubh/activitywork-sdk` {@link validateSnapshotPayload}.
 *
 * @param {unknown} parsed
 * @returns {{ ok: true, payload: import("@sarkarshubh/activitywork-sdk").SnapshotOkFields & { ok: true } } | { ok: false, code: string, message: string }}
 */
export function validateSnapshotPayloadObject(parsed) {
    const result = validateSnapshotPayload(parsed);
    if (!result.success) {
        const msg =
            result.issues
                .map((i) => `${i.path || "(root)"}: ${i.message}`)
                .join("; ") || "Invalid snapshot payload";
        return {
            ok: false,
            code: IMPORT_ERROR_CODES.invalid,
            message: msg,
        };
    }
    const snap = result.snapshot;
    if (snap.ok !== true) {
        return {
            ok: false,
            code: IMPORT_ERROR_CODES.invalid,
            message:
                snap.ok === false && "error" in snap
                    ? `Snapshot reports ok: false (${String(snap.error)})`
                    : "Snapshot must have ok: true for import",
        };
    }
    return { ok: true, payload: snap };
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
