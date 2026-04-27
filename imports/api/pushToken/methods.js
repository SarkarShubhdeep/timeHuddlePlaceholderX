import { Meteor } from "meteor/meteor";
import crypto from "crypto";

import { hashActivityWorkPushToken } from "./hashToken.js";
import { ActivityWorkPushTokens } from "./pushTokens.collection.js";

const TOKEN_BYTES = 32;

Meteor.methods({
    /**
     * Whether this account has a push token configured, plus last four chars for display.
     * @returns {Promise<{ configured: boolean; last4: string | null }>}
     */
    async "user.getPushTokenStatus"() {
        if (!this.userId) {
            throw new Meteor.Error("not-authorized", "You must be signed in.");
        }
        const doc = await ActivityWorkPushTokens.findOneAsync(
            { userId: this.userId },
            { fields: { tokenLast4: 1 } },
        );
        return {
            configured: Boolean(doc),
            last4: typeof doc?.tokenLast4 === "string" ? doc.tokenLast4 : null,
        };
    },

    /**
     * Creates a new random push token, replaces any previous one, and returns the
     * secret **once** for pasting into aw-gateway (`PUSH_TOKEN`).
     *
     * @returns {Promise<{ token: string; last4: string }>}
     */
    async "user.generatePushToken"() {
        if (!this.userId) {
            throw new Meteor.Error("not-authorized", "You must be signed in.");
        }
        const raw = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
        const tokenHash = hashActivityWorkPushToken(raw);
        const tokenLast4 = raw.slice(-4);
        const updatedAt = new Date();

        await ActivityWorkPushTokens.updateAsync(
            { userId: this.userId },
            {
                $set: {
                    userId: this.userId,
                    tokenHash,
                    tokenLast4,
                    updatedAt,
                },
            },
            { upsert: true },
        );

        return { token: raw, last4: tokenLast4 };
    },
});
