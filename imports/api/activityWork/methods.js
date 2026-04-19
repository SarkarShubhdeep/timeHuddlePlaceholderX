import { Meteor } from "meteor/meteor";
import {
    ActivityWorkHttpError,
    ActivityWorkParseError,
    ActivityWorkSDKError,
    ActivityWorkTimeoutError,
    SNAPSHOT_RANGE_IDS,
    getSnapshotUrl,
} from "@sarkarshubh/activitywork-sdk";
import { getActivityWorkClient } from "./createClient.js";

/** Preview sample cap to limit load and abuse (placeholder app; production should auth). */
const PREVIEW_LIMIT_MAX = 100;

/** Allowed snapshot range tokens (from SDK; must match ActivityWork). */
const SNAPSHOT_RANGES = new Set(SNAPSHOT_RANGE_IDS);

/**
 * Maps SDK errors to Meteor.Error for the client (no stack traces).
 * @param {unknown} err
 */
function mapSdkError(err) {
    if (err instanceof ActivityWorkTimeoutError) {
        return new Meteor.Error(
            "activity-work-timeout",
            err.message || "ActivityWork request timed out",
        );
    }
    if (err instanceof ActivityWorkHttpError) {
        const reason =
            `${err.status} ${err.statusText}`.trim() ||
            "ActivityWork returned an error";
        return new Meteor.Error("activity-work-http", reason);
    }
    if (err instanceof ActivityWorkParseError) {
        return new Meteor.Error(
            "activity-work-parse",
            err.message || "Invalid JSON from ActivityWork",
        );
    }
    if (err instanceof ActivityWorkSDKError) {
        return new Meteor.Error(
            "activity-work-sdk",
            err.message || "ActivityWork SDK error",
        );
    }
    const message =
        err && typeof err === "object" && "message" in err
            ? String(/** @type {{ message: unknown }} */ (err).message)
            : "Unknown error talking to ActivityWork";
    return new Meteor.Error("activity-work-unknown", message);
}

Meteor.methods({
    async "activityWork.checkHealth"() {
        // Production TimeHuddle should gate this behind authentication.
        try {
            const client = getActivityWorkClient();
            return await client.checkHealth();
        } catch (err) {
            throw mapSdkError(err);
        }
    },

    async "activityWork.preview"(args) {
        const raw =
            args && typeof args === "object" && typeof args.limit === "number"
                ? args.limit
                : 50;
        const n = Number.isFinite(raw) ? Math.floor(raw) : 50;
        const capped = Math.min(Math.max(n, 1), PREVIEW_LIMIT_MAX);
        try {
            const client = getActivityWorkClient();
            return await client.preview({ limit: capped });
        } catch (err) {
            throw mapSdkError(err);
        }
    },

    async "activityWork.snapshotUrl"() {
        const rangeRaw = process.env.ACTIVITYWORK_SNAPSHOT_RANGE ?? "1h";
        const range = SNAPSHOT_RANGES.has(rangeRaw) ? rangeRaw : "1h";
        const bucketId = process.env.ACTIVITYWORK_BUCKET_ID;
        const client = getActivityWorkClient();
        /** @type {import("@sarkarshubh/activitywork-sdk").SnapshotQuery} */
        const query = bucketId ? { range, bucketId } : { range };
        return { url: getSnapshotUrl(client.baseUrl, query) };
    },
});
