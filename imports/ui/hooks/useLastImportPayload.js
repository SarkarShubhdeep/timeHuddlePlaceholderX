import * as React from "react";
import { Meteor } from "meteor/meteor";

/** Same cadence as the Overview "Latest snapshot push" card (6s while visible). */
const POLL_INTERVAL_MS = 6000;

/** @param {unknown} e */
function formatCallError(e) {
    if (e && typeof e === "object") {
        const reason =
            "reason" in e
                ? String(/** @type {{ reason?: unknown }} */ (e).reason)
                : "";
        const message =
            "message" in e
                ? String(/** @type {{ message?: unknown }} */ (e).message)
                : "";
        const code =
            "error" in e
                ? String(/** @type {{ error?: unknown }} */ (e).error)
                : "";
        return reason || message || code || "Request failed";
    }
    return e != null ? String(e) : "Request failed";
}

/**
 * Client hook that polls `activityWork.getLastImportPayload` every 6s while the
 * tab is visible and exposes the parsed snapshot payload + record to the UI.
 *
 * @typedef {{
 *   record: Record<string, unknown>;
 *   payload: Record<string, unknown>;
 * } | null} LastImportResult
 *
 * @returns {{
 *   data: LastImportResult;
 *   loading: boolean;
 *   error: string | null;
 *   refresh: (options?: { silent?: boolean }) => Promise<void>;
 * }}
 */
export function useLastImportPayload() {
    /** @type {[LastImportResult, React.Dispatch<React.SetStateAction<LastImportResult>>]} */
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
    const [error, setError] = React.useState(null);

    const refresh = React.useCallback(async (options) => {
        const silent = options?.silent === true;
        if (!silent) setLoading(true);
        setError(null);
        try {
            const result = await Meteor.callAsync(
                "activityWork.getLastImportPayload",
            );
            if (
                result &&
                typeof result === "object" &&
                "record" in result &&
                "payload" in result
            ) {
                setData(
                    /** @type {LastImportResult} */ (
                        /** @type {unknown} */ (result)
                    ),
                );
            } else {
                setData(null);
            }
        } catch (e) {
            setError(formatCallError(e));
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void refresh({ silent: true });
        const id = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                void refresh({ silent: true });
            }
        }, POLL_INTERVAL_MS);
        const onVis = () => {
            if (document.visibilityState === "visible") {
                void refresh({ silent: true });
            }
        };
        document.addEventListener("visibilitychange", onVis);
        return () => {
            window.clearInterval(id);
            document.removeEventListener("visibilitychange", onVis);
        };
    }, [refresh]);

    return { data, loading, error, refresh };
}
