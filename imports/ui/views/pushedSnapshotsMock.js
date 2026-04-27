/**
 * Mock pushed-snapshot "file system" data.
 *
 * Each entry shape matches what {@link SnapshotPayloadPanel} expects to read:
 * `{ record: {...}, payload: {...} }`. The array below is a placeholder for a
 * future per-user Mongo-backed listing (see
 * `docs/plan-multitenant-activitywork-import.md` phase B/D).
 */

const DAY = "2026-04-23";
const USER_AGENT = "aw-gateway/0.2.0 (+push)";
const SOURCE = { app: "aw-gateway", host: "Shubhdeeps-MacBook-Pro.local" };
const BUCKET_ID = "aw-watcher-afk_Shubhdeeps-MacBook-Pro.local";

/**
 * @param {Date} d
 * @returns {string}
 */
function toIso(d) {
    return d.toISOString();
}

/**
 * Format a snapshot's time range for display, e.g. `"04/23/2026, 10:00 AM - 10:30 AM"`.
 *
 * @param {string} startsAt
 * @param {string} endsAt
 * @returns {string}
 */
export function formatRangeLabel(startsAt, endsAt) {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const dateStr = start.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const timeFmt = (d) =>
        d.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });
    return `${dateStr}, ${timeFmt(start)} - ${timeFmt(end)}`;
}

/**
 * Build a short-lived mock events list across the 30-min window.
 *
 * @param {Date} start
 * @param {Date} end
 * @returns {Array<Record<string, unknown>>}
 */
function mockEvents(start, end) {
    const windowMs = end.getTime() - start.getTime();
    const bumps = [
        { watcher: "web", app: "Google Chrome", title: "aw-gateway · Push snapshot", url: "http://localhost:5173/push", durationSeconds: 62 },
        { watcher: "window", app: "Google Chrome", title: "aw-gateway · Push snapshot", durationSeconds: 62 },
        { watcher: "vscode", app: "Code", title: "PushedSnapshotsSection.jsx — TimeHuddlePlaceholder", durationSeconds: 420 },
        { watcher: "window", app: "Cursor", title: "HomeView.jsx", durationSeconds: 180 },
        { watcher: "web", app: "TimeHuddlePlaceholder", title: "TimeHuddlePlaceholder", url: "https://timehuddleplaceholderx.onrender.com/", durationSeconds: 34 },
        { watcher: "afk", app: "afk", title: "not-afk", durationSeconds: 240 },
        { watcher: "window", app: "iTerm2", title: "meteor run", durationSeconds: 95 },
        { watcher: "web", app: "SarkarShubhdeep/aw-gateway", title: "GitHub · SarkarShubhdeep/aw-gateway", url: "https://github.com/SarkarShubhdeep/aw-gateway", durationSeconds: 55 },
    ];
    const step = Math.max(
        60_000,
        Math.floor(windowMs / Math.max(bumps.length, 1)),
    );
    return bumps.map((b, i) => ({
        timestamp: new Date(start.getTime() + i * step).toISOString(),
        ...b,
    }));
}

/**
 * @typedef PushedSnapshotMockEntry
 * @property {string} id
 * @property {string} startsAt
 * @property {string} endsAt
 * @property {string} label
 * @property {{
 *   record: { storedAt: string; byteLength: number; userAgent: string };
 *   payload: Record<string, unknown>;
 * }} data
 */

/**
 * @param {number} hour
 * @param {number} minute
 * @returns {PushedSnapshotMockEntry}
 */
function makeEntry(hour, minute) {
    const start = new Date(`${DAY}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`);
    const endMinuteTotal = minute + 30;
    const endHour = hour + Math.floor(endMinuteTotal / 60);
    const endMinute = endMinuteTotal % 60;
    const end = new Date(`${DAY}T${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}:00`);
    const events = mockEvents(start, end);
    const eventCount = events.length;
    const id = `${DAY}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const payload = {
        schemaVersion: 1,
        bucketId: BUCKET_ID,
        range: { preset: "30m", start: toIso(start), end: toIso(end) },
        generatedAt: toIso(end),
        eventCount,
        events,
        source: SOURCE,
        truncated: false,
    };
    const byteLength = JSON.stringify(payload).length;
    return {
        id,
        startsAt: toIso(start),
        endsAt: toIso(end),
        label: formatRangeLabel(toIso(start), toIso(end)),
        data: {
            record: {
                storedAt: toIso(new Date(end.getTime() + 5_000)),
                byteLength,
                userAgent: USER_AGENT,
            },
            payload,
        },
    };
}

/** Descending (newest first) list of 8 mock snapshot files. */
export const PUSHED_SNAPSHOTS_MOCK = [
    makeEntry(13, 30),
    makeEntry(13, 0),
    makeEntry(12, 30),
    makeEntry(12, 0),
    makeEntry(11, 30),
    makeEntry(11, 0),
    makeEntry(10, 30),
    makeEntry(10, 0),
];
