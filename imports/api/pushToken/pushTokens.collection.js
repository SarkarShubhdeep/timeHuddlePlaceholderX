import { Mongo } from "meteor/mongo";

/**
 * One document per user. Never published to the client (methods only).
 *
 * @typedef {{ userId: string; tokenHash: string; tokenLast4: string; updatedAt: Date }} ActivityWorkPushTokenDoc
 */
export const ActivityWorkPushTokens = new Mongo.Collection(
    "activitywork_push_tokens",
);
