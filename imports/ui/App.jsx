import * as React from "react";
import {
    ExternalLink,
    Loader2,
    Moon,
    RefreshCw,
    Sun,
    Terminal,
} from "lucide-react";
import { Meteor } from "meteor/meteor";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const PLACEHOLDER_RENDER_URL = "https://timehuddleplaceholderx.onrender.com/";
const ACTIVITY_WORK_SWITCH_ID = "activity-work";
const THEME_STORAGE_KEY = "timehuddle-theme";

/** Same path as `ACTIVITYWORK_IMPORT_PATH` on the server (`TIMEHUDDLE_IMPORT_URL` for runtime POST). */
const ACTIVITYWORK_IMPORT_URL = "/api/activitywork/import";

/** Same path as `ACTIVITYWORK_IMPORT_LATEST_JSON_PATH` in `importHttp.js`. */
const ACTIVITYWORK_IMPORT_LATEST_JSON_URL = "/api/activitywork/import/latest";

/**
 * @param {string} secretTrimmed
 * @returns {Promise<{ res: Response; text: string }>}
 */
async function fetchLatestSnapshotJson(secretTrimmed) {
    const headers = {};
    if (secretTrimmed.length > 0) {
        headers["X-ActivityWork-Import-Secret"] = secretTrimmed;
        headers.Authorization = `Bearer ${secretTrimmed}`;
    }
    const res = await fetch(ACTIVITYWORK_IMPORT_LATEST_JSON_URL, {
        headers,
        credentials: "same-origin",
    });
    const text = await res.text();
    return { res, text };
}

/**
 * @param {Response} res
 * @param {string} text
 * @returns {{ ok: true; usedRaw: boolean } | { ok: false; errorMessage: string }}
 */
function writeSnapshotToConsole(res, text) {
    if (!res.ok) {
        // eslint-disable-next-line no-console
        console.error("[TimeHuddle] Latest snapshot GET failed", {
            status: res.status,
            body: text,
        });
        return {
            ok: false,
            errorMessage: `HTTP ${res.status}: ${text.slice(0, 280)}`,
        };
    }
    try {
        const data = JSON.parse(text);
        // eslint-disable-next-line no-console
        console.group("[TimeHuddle] Latest snapshot JSON");
        // eslint-disable-next-line no-console
        console.log(data);
        // eslint-disable-next-line no-console
        console.groupEnd();
        return { ok: true, usedRaw: false };
    } catch {
        // eslint-disable-next-line no-console
        console.group("[TimeHuddle] Latest snapshot (raw body)");
        // eslint-disable-next-line no-console
        console.log(text);
        // eslint-disable-next-line no-console
        console.groupEnd();
        return { ok: true, usedRaw: true };
    }
}

function readInitialDark() {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** @param {unknown} e */
function formatMeteorCallError(e) {
    if (e && typeof e === "object") {
        const reason = "reason" in e ? String(/** @type {{ reason?: unknown }} */ (e).reason) : "";
        const message =
            "message" in e ? String(/** @type {{ message?: unknown }} */ (e).message) : "";
        const code =
            "error" in e ? String(/** @type {{ error?: unknown }} */ (e).error) : "";
        return reason || message || code || "Request failed";
    }
    return e != null ? String(e) : "Request failed";
}

/** @param {Response} res @param {string} text */
function parseImportResponse(res, text) {
    /** @type {unknown} */
    let data;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        return {
            ok: false,
            message: text || `HTTP ${res.status}`,
            code: "activity-work-import-parse",
        };
    }
    if (!res.ok && data && typeof data === "object" && data !== null) {
        const o = /** @type {{ error?: unknown; code?: unknown }} */ (data);
        const errMsg =
            typeof o.error === "string"
                ? o.error
                : `Import failed (${res.status})`;
        const code =
            typeof o.code === "string" ? o.code : `http-${res.status}`;
        return { ok: false, message: errMsg, code };
    }
    if (!res.ok) {
        return {
            ok: false,
            message: text || `HTTP ${res.status}`,
            code: `http-${res.status}`,
        };
    }
    return { ok: true, data };
}

/** @param {unknown} n */
function formatByteSizeForPush(n) {
    if (typeof n !== "number" || !Number.isFinite(n)) return "—";
    if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
    if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${Math.round(n)} B`;
}

/** @param {string} s */
function escapeHtmlForTab(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** @param {unknown} ua */
function pushSourceLabel(ua) {
    if (typeof ua !== "string" || ua.length === 0) return "Unknown client";
    if (ua.includes("activitywork-runtime/export")) {
        return "activitywork-runtime (Send to Time Huddle)";
    }
    return "Browser or other HTTP client";
}

/** @param {unknown} health */
function describeHealth(health) {
    if (!health || typeof health !== "object") return null;
    const h = /** @type {{ healthy?: boolean; reason?: string; error?: unknown; eventCount?: number; latestEventAt?: string | null }} */ (
        health
    );
    if (h.healthy === true) {
        const bits = ["ActivityWork responded."];
        if (typeof h.eventCount === "number") {
            bits.push(`Sample event count: ${h.eventCount}.`);
        }
        if (h.latestEventAt) {
            bits.push(`Latest event at: ${h.latestEventAt}.`);
        }
        return bits.join(" ");
    }
    if (h.healthy === false && h.reason === "api_error") {
        return typeof h.error === "string" ? h.error : "ActivityWork reported an error.";
    }
    if (h.healthy === false && h.reason === "transport") {
        const err = h.error;
        if (err && typeof err === "object" && "message" in err) {
            return String(/** @type {{ message: unknown }} */ (err).message);
        }
        return "Could not reach ActivityWork from the Meteor server.";
    }
    return "ActivityWork health check did not succeed.";
}

export const App = () => {
    const [activityWorkEnabled, setActivityWorkEnabled] = React.useState(false);
    const [isDark, setIsDark] = React.useState(readInitialDark);
    const [activityWorkLoading, setActivityWorkLoading] = React.useState(false);
    /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
    const [activityWorkError, setActivityWorkError] = React.useState(null);
    /** @type {[null | { health: unknown; preview: unknown; snapshotUrl: string }, React.Dispatch<React.SetStateAction<null | { health: unknown; preview: unknown; snapshotUrl: string }>>]} */
    const [activityWorkData, setActivityWorkData] = React.useState(null);

    const [importJsonText, setImportJsonText] = React.useState("");
    const [importSharedSecret, setImportSharedSecret] = React.useState("");
    const [importLoading, setImportLoading] = React.useState(false);
    /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
    const [importError, setImportError] = React.useState(null);
    /** @type {[null | { imported: unknown }, React.Dispatch<React.SetStateAction<null | { imported: unknown }>>]} */
    const [importSuccess, setImportSuccess] = React.useState(null);

    /** @type {[Record<string, unknown> | null, React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>]} */
    const [lastPushRecord, setLastPushRecord] = React.useState(null);
    const [lastPushLoading, setLastPushLoading] = React.useState(false);
    /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
    const [lastPushError, setLastPushError] = React.useState(null);
    /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
    const [snapshotJsonTabError, setSnapshotJsonTabError] =
        React.useState(null);
    /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
    const [snapshotJsonConsoleMessage, setSnapshotJsonConsoleMessage] =
        React.useState(null);
    const [consoleJsonLoading, setConsoleJsonLoading] = React.useState(false);

    const fetchLastPush = React.useCallback(async (options) => {
        const silent = options?.silent === true;
        if (!silent) {
            setLastPushLoading(true);
        }
        setLastPushError(null);
        try {
            const rec = await Meteor.callAsync("activityWork.getLastImport");
            setLastPushRecord(
                rec && typeof rec === "object"
                    ? /** @type {Record<string, unknown>} */ (rec)
                    : null,
            );
        } catch (e) {
            setLastPushError(formatMeteorCallError(e));
        } finally {
            if (!silent) {
                setLastPushLoading(false);
            }
        }
    }, []);

    const logLatestSnapshotJsonToConsole = React.useCallback(async () => {
        setSnapshotJsonTabError(null);
        setSnapshotJsonConsoleMessage(null);
        setConsoleJsonLoading(true);
        try {
            const { res, text } = await fetchLatestSnapshotJson(
                importSharedSecret.trim(),
            );
            const out = writeSnapshotToConsole(res, text);
            if (!out.ok) {
                setSnapshotJsonTabError(out.errorMessage);
                return;
            }
            setSnapshotJsonConsoleMessage(
                out.usedRaw
                    ? "Logged raw body to the console (open DevTools → Console). It may not be valid JSON."
                    : 'Logged parsed snapshot JSON to the console (DevTools → Console). Look for the group "[TimeHuddle] Latest snapshot JSON".',
            );
        } catch (e) {
            setSnapshotJsonTabError(formatMeteorCallError(e));
        } finally {
            setConsoleJsonLoading(false);
        }
    }, [importSharedSecret]);

    const openLatestSnapshotJsonInNewTab = React.useCallback(() => {
        setSnapshotJsonTabError(null);
        setSnapshotJsonConsoleMessage(null);
        // Do not pass `noopener` in the window features string: in Chrome (and
        // others) `window.open(..., "noopener")` returns `null`, so we never
        // get a handle to write the fetched JSON into the new tab.
        const w = window.open("about:blank", "_blank");
        if (w) {
            try {
                w.document.write(
                    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Loading snapshot…</title></head><body style="font-family:system-ui,sans-serif;padding:1rem;color:#555">Loading snapshot JSON…</body></html>',
                );
                w.document.close();
            } catch {
                /* ignore */
            }
            try {
                w.opener = null;
            } catch {
                /* ignore */
            }
        }
        void (async () => {
            try {
                const { res, text } = await fetchLatestSnapshotJson(
                    importSharedSecret.trim(),
                );
                if (!w) {
                    const out = writeSnapshotToConsole(res, text);
                    if (!out.ok) {
                        setSnapshotJsonTabError(out.errorMessage);
                        return;
                    }
                    setSnapshotJsonConsoleMessage(
                        out.usedRaw
                            ? "Could not open a new tab — logged raw body to the console (DevTools → Console). Allow pop-ups for this site, or use Log JSON to console."
                            : "Could not open a new tab — logged parsed JSON to the console (DevTools → Console). Allow pop-ups for this site, or use Log JSON to console.",
                    );
                    return;
                }
                if (!res.ok) {
                    const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Latest snapshot JSON</title></head><body><pre style="white-space:pre-wrap;font:13px/1.45 ui-monospace,monospace;padding:16px;margin:0">${escapeHtmlForTab(text)}</pre></body></html>`;
                    w.document.open();
                    w.document.write(doc);
                    w.document.close();
                    return;
                }
                const blob = new Blob([text], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                w.location.replace(url);
                window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
            } catch (e) {
                const msg = formatMeteorCallError(e);
                if (!w) {
                    setSnapshotJsonTabError(msg);
                    return;
                }
                const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error</title></head><body><pre style="padding:16px;margin:0">${escapeHtmlForTab(msg)}</pre></body></html>`;
                w.document.open();
                w.document.write(doc);
                w.document.close();
            }
        })();
    }, [importSharedSecret]);

    React.useEffect(() => {
        void fetchLastPush({ silent: true });
        const id = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                void fetchLastPush({ silent: true });
            }
        }, 6000);
        const onVis = () => {
            if (document.visibilityState === "visible") {
                void fetchLastPush({ silent: true });
            }
        };
        document.addEventListener("visibilitychange", onVis);
        return () => {
            window.clearInterval(id);
            document.removeEventListener("visibilitychange", onVis);
        };
    }, [fetchLastPush]);

    const runImport = React.useCallback(
        async (jsonString) => {
            const trimmed = jsonString.trim();
            if (!trimmed) {
                setImportError("Paste or choose a JSON file first.");
                setImportSuccess(null);
                return;
            }
            setImportLoading(true);
            setImportError(null);
            setImportSuccess(null);
            try {
                const headers = {
                    "Content-Type": "application/json",
                };
                const secret = importSharedSecret.trim();
                if (secret) {
                    headers["X-ActivityWork-Import-Secret"] = secret;
                }
                const res = await fetch(ACTIVITYWORK_IMPORT_URL, {
                    method: "POST",
                    headers,
                    body: trimmed,
                });
                const text = await res.text();
                const parsed = parseImportResponse(res, text);
                if (!parsed.ok) {
                    const suffix = parsed.code ? ` (${parsed.code})` : "";
                    setImportError(`${parsed.message}${suffix}`);
                    return;
                }
                if (
                    parsed.data &&
                    typeof parsed.data === "object" &&
                    parsed.data !== null &&
                    "imported" in parsed.data
                ) {
                    setImportSuccess({
                        imported: /** @type {{ imported: unknown }} */ (
                            parsed.data
                        ).imported,
                    });
                } else {
                    setImportSuccess({ imported: parsed.data });
                }
                void fetchLastPush({ silent: true });
            } catch (e) {
                setImportError(formatMeteorCallError(e));
            } finally {
                setImportLoading(false);
            }
        },
        [importSharedSecret, fetchLastPush],
    );

    React.useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add("dark");
            window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
        } else {
            root.classList.remove("dark");
            window.localStorage.setItem(THEME_STORAGE_KEY, "light");
        }
    }, [isDark]);

    React.useEffect(() => {
        if (!activityWorkEnabled) {
            setActivityWorkLoading(false);
            setActivityWorkError(null);
            setActivityWorkData(null);
            return;
        }

        let cancelled = false;
        setActivityWorkLoading(true);
        setActivityWorkError(null);
        setActivityWorkData(null);

        (async () => {
            try {
                const [health, preview, snapshot] = await Promise.all([
                    Meteor.callAsync("activityWork.checkHealth"),
                    Meteor.callAsync("activityWork.preview", { limit: 50 }),
                    Meteor.callAsync("activityWork.snapshotUrl"),
                ]);
                if (!cancelled) {
                    setActivityWorkData({
                        health,
                        preview,
                        snapshotUrl: snapshot.url,
                    });
                }
            } catch (e) {
                if (!cancelled) {
                    setActivityWorkError(formatMeteorCallError(e));
                }
            } finally {
                if (!cancelled) {
                    setActivityWorkLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activityWorkEnabled]);

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 max-w-lg mx-auto">
                <Card className="w-full shadow-none">
                    <CardHeader>
                        <CardTitle className="text-2xl">
                            TimeHuddle placeholder
                        </CardTitle>
                        <CardDescription>
                            This Meteor + React app exists for testing and
                            integration checks. It is not the full TimeHuddle
                            product.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <p>
                            Production TimeHuddle is hosted on{" "}
                            <span className="font-medium text-foreground">
                                Vercel
                            </span>
                            . Use the link below once you have the real
                            deployment URL (see README for the same
                            placeholder).
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="shadow-none"
                        >
                            <a
                                href={PLACEHOLDER_RENDER_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2"
                            >
                                Open TimeHuddle (placeholder URL)
                                <ExternalLink className="h-4 w-4" aria-hidden />
                            </a>
                        </Button>
                    </CardFooter>
                </Card>
                <Card className="w-full max-w-lg shadow-none">
                    <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                        <div className="space-y-1.5">
                            <CardTitle className="text-lg">
                                Latest snapshot push
                            </CardTitle>
                            <CardDescription>
                                Most recent successful POST to{" "}
                                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                    {ACTIVITYWORK_IMPORT_URL}
                                </code>{" "}
                                (e.g.{" "}
                                <span className="font-medium text-foreground">
                                    Send to Time Huddle
                                </span>{" "}
                                from activitywork-runtime). Stored in memory on
                                this Meteor process only.
                            </CardDescription>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="shrink-0 shadow-none"
                            disabled={lastPushLoading}
                            onClick={() => void fetchLastPush({ silent: false })}
                            aria-label="Refresh latest push"
                        >
                            {lastPushLoading ? (
                                <Loader2
                                    className="h-4 w-4 animate-spin"
                                    aria-hidden
                                />
                            ) : (
                                <RefreshCw className="h-4 w-4" aria-hidden />
                            )}
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3 border-t pt-4 text-sm">
                        {lastPushError ? (
                            <p className="text-destructive" role="alert">
                                {lastPushError}
                            </p>
                        ) : null}
                        {lastPushRecord &&
                        typeof lastPushRecord.storedAt === "string" ? (
                            <div className="space-y-3">
                                <p className="inline-flex w-fit rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-foreground">
                                    {pushSourceLabel(lastPushRecord.userAgent)}
                                </p>
                                <dl className="grid gap-2 text-muted-foreground sm:grid-cols-2">
                                    <div>
                                        <dt className="font-medium text-foreground">
                                            Received
                                        </dt>
                                        <dd>
                                            {new Date(
                                                lastPushRecord.storedAt,
                                            ).toLocaleString()}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium text-foreground">
                                            Payload size
                                        </dt>
                                        <dd className="font-mono text-xs">
                                            {formatByteSizeForPush(
                                                lastPushRecord.byteLength,
                                            )}
                                        </dd>
                                    </div>
                                    {typeof lastPushRecord.range === "string" ? (
                                        <div>
                                            <dt className="font-medium text-foreground">
                                                Range preset
                                            </dt>
                                            <dd className="font-mono text-xs">
                                                {lastPushRecord.range}
                                            </dd>
                                        </div>
                                    ) : null}
                                    {typeof lastPushRecord.bucketId ===
                                    "string" ? (
                                        <div className="sm:col-span-2">
                                            <dt className="font-medium text-foreground">
                                                Bucket
                                            </dt>
                                            <dd className="break-all font-mono text-xs">
                                                {lastPushRecord.bucketId}
                                            </dd>
                                        </div>
                                    ) : null}
                                    {typeof lastPushRecord.eventCount ===
                                    "number" ? (
                                        <div>
                                            <dt className="font-medium text-foreground">
                                                Event count
                                            </dt>
                                            <dd>{lastPushRecord.eventCount}</dd>
                                        </div>
                                    ) : null}
                                    {lastPushRecord.truncated === true ? (
                                        <div>
                                            <dt className="font-medium text-foreground">
                                                Truncated
                                            </dt>
                                            <dd>Yes (per-bucket limit)</dd>
                                        </div>
                                    ) : null}
                                    {typeof lastPushRecord.userAgent ===
                                    "string" ? (
                                        <div className="sm:col-span-2">
                                            <dt className="font-medium text-foreground">
                                                User-Agent
                                            </dt>
                                            <dd className="break-all font-mono text-[11px] leading-relaxed">
                                                {lastPushRecord.userAgent}
                                            </dd>
                                        </div>
                                    ) : null}
                                </dl>
                                <div className="space-y-2 border-t border-border pt-3">
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 shadow-none"
                                            onClick={openLatestSnapshotJsonInNewTab}
                                        >
                                            <ExternalLink
                                                className="h-4 w-4"
                                                aria-hidden
                                            />
                                            Open snapshot JSON in new tab
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            className="gap-2 shadow-none"
                                            disabled={consoleJsonLoading}
                                            onClick={() =>
                                                void logLatestSnapshotJsonToConsole()
                                            }
                                        >
                                            {consoleJsonLoading ? (
                                                <Loader2
                                                    className="h-4 w-4 animate-spin"
                                                    aria-hidden
                                                />
                                            ) : (
                                                <Terminal
                                                    className="h-4 w-4"
                                                    aria-hidden
                                                />
                                            )}
                                            Log JSON to console
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        If the server uses{" "}
                                        <code className="rounded bg-muted px-1 py-0.5">
                                            ACTIVITYWORK_IMPORT_SHARED_SECRET
                                        </code>
                                        , enter the same value under{" "}
                                        <span className="font-medium text-foreground">
                                            Import shared secret
                                        </span>{" "}
                                        below so this request can authorize.
                                    </p>
                                    {snapshotJsonTabError ? (
                                        <p
                                            className="text-xs text-destructive"
                                            role="alert"
                                        >
                                            {snapshotJsonTabError}
                                        </p>
                                    ) : null}
                                    {snapshotJsonConsoleMessage ? (
                                        <p
                                            className="text-xs text-emerald-700 dark:text-emerald-400"
                                            role="status"
                                        >
                                            {snapshotJsonConsoleMessage}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">
                                Nothing imported yet this session. Use{" "}
                                <span className="font-medium text-foreground">
                                    Send to Time Huddle
                                </span>{" "}
                                in activitywork-runtime, or import JSON below.
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Refreshes automatically every 6s while this tab is
                            visible.
                        </p>
                    </CardContent>
                </Card>
                <Card className="w-full max-w-lg shadow-none">
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Import from local ActivityWork
                        </CardTitle>
                        <CardDescription>
                            Send a snapshot JSON from your machine (e.g. after
                            you confirm it in ActivityWork-runtime). This app
                            does not read ActivityWatch or your laptop&apos;s{" "}
                            <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                localhost
                            </code>
                            — only data you post here is stored.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 border-t pt-4 text-sm">
                        <div className="space-y-2">
                            <Label
                                htmlFor="import-json"
                                className="text-foreground"
                            >
                                Snapshot JSON
                            </Label>
                            <textarea
                                id="import-json"
                                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder='{ "ok": true, ... }'
                                value={importJsonText}
                                onChange={(e) =>
                                    setImportJsonText(e.target.value)
                                }
                                spellCheck={false}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label
                                htmlFor="import-file"
                                className="text-foreground"
                            >
                                Or choose a file
                            </Label>
                            <input
                                id="import-file"
                                type="file"
                                accept="application/json,.json"
                                className="block w-full text-sm text-muted-foreground file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const text = await file.text();
                                    setImportJsonText(text);
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label
                                htmlFor="import-secret"
                                className="text-muted-foreground"
                            >
                                Import shared secret (optional)
                            </Label>
                            <input
                                id="import-secret"
                                type="password"
                                autoComplete="off"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="Only if ACTIVITYWORK_IMPORT_SHARED_SECRET is set on the server"
                                value={importSharedSecret}
                                onChange={(e) =>
                                    setImportSharedSecret(e.target.value)
                                }
                            />
                        </div>
                        {importLoading ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2
                                    className="h-4 w-4 shrink-0 animate-spin"
                                    aria-hidden
                                />
                                <span>Importing…</span>
                            </div>
                        ) : null}
                        {importError ? (
                            <p className="text-destructive" role="alert">
                                {importError}
                            </p>
                        ) : null}
                        {importSuccess ? (
                            <p className="text-foreground rounded-md bg-muted/50 p-2 text-xs">
                                Imported:{" "}
                                <span className="font-mono">
                                    {JSON.stringify(importSuccess.imported)}
                                </span>
                            </p>
                        ) : null}
                        <Button
                            type="button"
                            className="shadow-none"
                            disabled={importLoading}
                            onClick={() => runImport(importJsonText)}
                        >
                            Import snapshot
                        </Button>
                    </CardContent>
                </Card>
                <Card className="w-full max-w-lg shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                        <Label
                            htmlFor={ACTIVITY_WORK_SWITCH_ID}
                            className="text-lg font-semibold leading-none tracking-tight cursor-pointer"
                        >
                            ActivityWork reachable from this server
                        </Label>
                        <Switch
                            id={ACTIVITY_WORK_SWITCH_ID}
                            checked={activityWorkEnabled}
                            onCheckedChange={setActivityWorkEnabled}
                        />
                    </CardHeader>
                    {activityWorkEnabled ? (
                        <CardContent className="space-y-3 border-t pt-4 text-sm">
                            <p className="text-muted-foreground">
                                Calls run on the Meteor server. Point{" "}
                                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                    ACTIVITYWORK_URL
                                </code>{" "}
                                at your ActivityWork origin so the server can
                                reach it (default{" "}
                                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                    http://localhost:5601
                                </code>
                                ).
                            </p>
                            {activityWorkLoading ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2
                                        className="h-4 w-4 shrink-0 animate-spin"
                                        aria-hidden
                                    />
                                    <span>Talking to ActivityWork…</span>
                                </div>
                            ) : null}
                            {activityWorkError ? (
                                <p className="text-destructive" role="alert">
                                    {activityWorkError}
                                </p>
                            ) : null}
                            {!activityWorkLoading &&
                            activityWorkData &&
                            !activityWorkError ? (
                                <div className="space-y-2 text-muted-foreground">
                                    <p className="text-foreground">
                                        {describeHealth(activityWorkData.health)}
                                    </p>
                                    {activityWorkData.preview &&
                                    typeof activityWorkData.preview === "object" &&
                                    "ok" in activityWorkData.preview &&
                                    activityWorkData.preview.ok === true ? (
                                        <p>
                                            Preview:{" "}
                                            {typeof activityWorkData.preview
                                                .eventCount === "number"
                                                ? `${activityWorkData.preview.eventCount} events`
                                                : "ok"}
                                            {activityWorkData.preview
                                                .latestEventAt
                                                ? ` · latest ${activityWorkData.preview.latestEventAt}`
                                                : null}
                                            .
                                        </p>
                                    ) : activityWorkData.preview &&
                                      typeof activityWorkData.preview ===
                                          "object" &&
                                      "ok" in activityWorkData.preview &&
                                      activityWorkData.preview.ok === false ? (
                                        <p>
                                            Preview:{" "}
                                            {"error" in activityWorkData.preview
                                                ? String(
                                                      activityWorkData.preview
                                                          .error,
                                                  )
                                                : "unavailable"}
                                            .
                                        </p>
                                    ) : null}
                                    {activityWorkData.snapshotUrl ? (
                                        <p>
                                            <a
                                                href={
                                                    activityWorkData.snapshotUrl
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                                            >
                                                Open snapshot in ActivityWork
                                                <ExternalLink
                                                    className="h-3.5 w-3.5"
                                                    aria-hidden
                                                />
                                            </a>
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                        </CardContent>
                    ) : null}

                    <CardFooter>
                        <CardDescription>
                            ActivityWork is a feature that allows you to track
                            your work and projects via ActivityWatch.
                            ActivityWatch should be installed on your machine.
                            Know more about it{" "}
                            <a
                                href="https://activitywatch.net/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline-offset-4 hover:underline text-blue-600"
                            >
                                here
                            </a>
                            .
                        </CardDescription>
                    </CardFooter>
                </Card>
                <footer className="w-full py-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => setIsDark((d) => !d)}
                        aria-label={
                            isDark
                                ? "Switch to light mode"
                                : "Switch to dark mode"
                        }
                    >
                        {isDark ? (
                            <Sun className="h-5 w-5" aria-hidden />
                        ) : (
                            <Moon className="h-5 w-5" aria-hidden />
                        )}
                    </Button>
                </footer>
            </div>
        </div>
    );
};
