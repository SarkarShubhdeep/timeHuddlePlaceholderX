import { Meteor } from "meteor/meteor";

import { ActivityWorkImports } from "./imports.collection.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Latest pushed snapshots for the currently signed-in user. Reactive: as soon
 * as a new HTTP import arrives with this user's bearer token, the new doc
 * shows up on subscribed clients.
 */
Meteor.publish("activityWork.userImports", function userImports(rawLimit) {
    if (!this.userId) {
        this.ready();
        return undefined;
    }
    const n =
        typeof rawLimit === "number" && Number.isFinite(rawLimit)
            ? Math.min(Math.max(Math.floor(rawLimit), 1), MAX_LIMIT)
            : DEFAULT_LIMIT;
    return ActivityWorkImports.find(
        { userId: this.userId },
        { sort: { receivedAt: -1 }, limit: n },
    );
});

/**
 * Public log view of recent pushed snapshots across users. Currently available
 * to any signed-in user.
 */
Meteor.publish("activityWork.publicImports", function publicImports(rawLimit) {
    if (!this.userId) {
        this.ready();
        return undefined;
    }
    const n =
        typeof rawLimit === "number" && Number.isFinite(rawLimit)
            ? Math.min(Math.max(Math.floor(rawLimit), 1), MAX_LIMIT)
            : DEFAULT_LIMIT;
    return ActivityWorkImports.find({}, { sort: { receivedAt: -1 }, limit: n });
});
