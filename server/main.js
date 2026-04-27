import { Meteor } from "meteor/meteor";
import "/imports/api/activityWork/importHttp.js";
import "/imports/api/activityWork/methods.js";
import "/imports/api/pushToken/methods.js";
import { ActivityWorkPushTokens } from "/imports/api/pushToken/pushTokens.collection.js";

Meteor.startup(async () => {
    try {
        const col = ActivityWorkPushTokens.rawCollection();
        await col.createIndex({ userId: 1 }, { unique: true });
        await col.createIndex({ tokenHash: 1 }, { unique: true });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[activitywork-push-token-index]", err);
    }
});
