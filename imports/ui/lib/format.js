/**
 * Shared formatting helpers for the import / pushed-snapshot views.
 *
 * Keep this file free of React / Meteor imports so it can be used from either
 * the client or (eventually) the server.
 */

/**
 * Formats a duration (in seconds) as `h:mm:ss`, `mm:ss`, or `0:ss`.
 * Returns `"—"` for non-finite input.
 * @param {unknown} seconds
 * @returns {string}
 */
export function formatDurationSeconds(seconds) {
    if (typeof seconds !== "number" || !Number.isFinite(seconds)) return "—";
    const total = Math.max(0, Math.round(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n) => n.toString().padStart(2, "0");
    if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
    return `${m}:${pad(s)}`;
}

/**
 * Formats an ISO timestamp as a locale-friendly date + time string. Returns
 * the original string if `Date` parsing fails.
 * @param {unknown} iso
 * @returns {string}
 */
export function formatTimestamp(iso) {
    if (typeof iso !== "string" || iso.length === 0) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
}

/**
 * Truncates long strings in the middle, keeping the head and tail visible.
 * Useful for long URLs / window titles in fixed-width table cells.
 * @param {unknown} value
 * @param {number} [max=80]
 * @returns {string}
 */
export function truncateMiddle(value, max = 80) {
    if (typeof value !== "string") return "";
    if (value.length <= max) return value;
    const keep = Math.max(10, Math.floor((max - 1) / 2));
    return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}

/**
 * Human-readable byte size (B / KB / MB). Returns `"—"` for non-finite input.
 * @param {unknown} n
 * @returns {string}
 */
export function formatByteSize(n) {
    if (typeof n !== "number" || !Number.isFinite(n)) return "—";
    if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
    if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${Math.round(n)} B`;
}

/**
 * Human label for the HTTP `User-Agent` of the client that pushed a snapshot.
 * @param {unknown} ua
 * @returns {string}
 */
export function pushSourceLabel(ua) {
    if (typeof ua !== "string" || ua.length === 0) return "Unknown client";
    if (ua.includes("activitywork-runtime/export")) {
        return "activitywork-runtime (Send to Time Huddle)";
    }
    if (ua.includes("aw-gateway")) {
        return "aw-gateway (Push)";
    }
    if (ua.includes("node-fetch") || ua.includes("undici")) {
        return "Server-to-server HTTP client";
    }
    return "Browser or other HTTP client";
}

/**
 * Normalizes the legacy string / range-block form into a display-friendly
 * preset id (e.g. `"1h"`).
 * @param {unknown} range
 * @returns {string | undefined}
 */
export function snapshotRangePreset(range) {
    if (typeof range === "string") return range;
    if (range && typeof range === "object" && !Array.isArray(range)) {
        const p = /** @type {{ preset?: unknown }} */ (range).preset;
        if (typeof p === "string") return p;
    }
    return undefined;
}
