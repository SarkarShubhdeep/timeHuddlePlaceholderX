import { createActivityWorkClient } from "@sarkarshubh/activitywork-sdk";

/** @type {import("@sarkarshubh/activitywork-sdk").ActivityWorkClient | null} */
let client = null;

/**
 * Lazy singleton ActivityWork HTTP client (server-only; import this module only from server code).
 */
export function getActivityWorkClient() {
    if (!client) {
        const baseUrl = process.env.ACTIVITYWORK_URL ?? "http://localhost:5601";
        const token = process.env.ACTIVITYWORK_TOKEN;
        client = createActivityWorkClient({
            baseUrl,
            timeoutMs: 12_000,
            healthTimeoutMs: 3_000,
            ...(token
                ? {
                      getToken: () => token,
                  }
                : {}),
        });
    }
    return client;
}
