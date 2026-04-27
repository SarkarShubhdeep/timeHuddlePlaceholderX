import { Mongo } from "meteor/mongo";

/**
 * Per-user persisted imports. One document per successful POST to
 * `/api/activitywork/import` whose Bearer token resolved to a user.
 *
 * NOTE: only the owning user's docs are published (see `imports/api/activityWork/publications.js`).
 *
 * @typedef {{
 *   _id?: string;
 *   userId: string;
 *   receivedAt: Date;
 *   byteLength: number;
 *   range?: string;
 *   eventCount?: number;
 *   bucketId?: string;
 *   truncated?: boolean;
 *   userAgent?: string;
 *   source?: string;
 *   payload: Record<string, unknown>;
 * }} ActivityWorkImportDoc
 */
export const ActivityWorkImports = new Mongo.Collection("activitywork_imports");
