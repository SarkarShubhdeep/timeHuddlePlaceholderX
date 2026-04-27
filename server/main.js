import { Meteor } from "meteor/meteor";
import "/imports/api/activityWork/importHttp.js";
import "/imports/api/activityWork/methods.js";
import "/imports/api/activityWork/publications.js";
import "/imports/api/pushToken/methods.js";
import { ActivityWorkImports } from "/imports/api/activityWork/imports.collection.js";
import { ActivityWorkPushTokens } from "/imports/api/pushToken/pushTokens.collection.js";

Meteor.startup(async () => {
    try {
        const tokens = ActivityWorkPushTokens.rawCollection();
        await tokens.createIndex({ userId: 1 }, { unique: true });
        await tokens.createIndex({ tokenHash: 1 }, { unique: true });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[activitywork-push-token-index]", err);
    }
    try {
        const imports = ActivityWorkImports.rawCollection();
        await imports.createIndex({ userId: 1, receivedAt: -1 });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[activitywork-imports-index]", err);
    }
});
