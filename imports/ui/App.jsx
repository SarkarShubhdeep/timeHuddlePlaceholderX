import * as React from "react";
import { ExternalLink, Loader2, Moon, Sun } from "lucide-react";
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
            } catch (e) {
                setImportError(formatMeteorCallError(e));
            } finally {
                setImportLoading(false);
            }
        },
        [importSharedSecret],
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
