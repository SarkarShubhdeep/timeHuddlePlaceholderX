import { Mongo } from "meteor/mongo";

/**
 * Per-user persisted imports. One document per successful POST to
 * `/api/activitywork/import` whose Bearer token resolved to a user.
 *
 * Published through user-scoped and shared log publications
 * (see `imports/api/activityWork/publications.js`).
 *
 * @typedef {{
 *   _id?: string;
 *   userId: string;
 *   ownerEmail?: string;
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
