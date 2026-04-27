import crypto from "crypto";

/**
 * Deterministic hash for comparing inbound `Authorization: Bearer` values.
 *
 * @param {string} raw
 * @returns {string} hex digest
 */
export function hashActivityWorkPushToken(raw) {
    return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}
