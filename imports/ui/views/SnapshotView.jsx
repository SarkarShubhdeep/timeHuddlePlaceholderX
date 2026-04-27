import * as React from "react";
import {
    AppWindow,
    ArrowUpRight,
    ChevronDown,
    Chrome,
    Code2,
    Globe,
    Inbox,
    Loader2,
    MonitorPause,
    RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useLastImportPayload } from "@/ui/hooks/useLastImportPayload";
import {
    formatByteSize,
    formatDurationSeconds,
    formatTimestamp,
    pushSourceLabel,
    snapshotRangePreset,
    truncateMiddle,
} from "@/ui/lib/format";

/**
 * @param {unknown} v
 * @returns {string | undefined}
 */
function strOrUndef(v) {
    return typeof v === "string" && v.length > 0 ? v : undefined;
}

/**
 * @param {unknown} v
 * @returns {number | undefined}
 */
function numOrUndef(v) {
    return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

const WATCHER_STYLES = {
    window: "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/20",
    web: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20",
    vscode: "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/20",
    afk: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20",
    other: "bg-muted text-muted-foreground ring-border",
};

const WATCHER_ICONS = {
    window: AppWindow,
    web: Chrome,
    vscode: Code2,
    afk: MonitorPause,
    other: Globe,
};

/** @param {unknown} watcher */
function WatcherBadge({ watcher }) {
    const key =
        typeof watcher === "string" && watcher in WATCHER_STYLES
            ? /** @type {keyof typeof WATCHER_STYLES} */ (watcher)
            : "other";
    const Icon = WATCHER_ICONS[key];
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                WATCHER_STYLES[key],
            )}
        >
            <Icon className="h-3 w-3" aria-hidden />
            {key}
        </span>
    );
}

/**
 * @param {unknown} events
 * @returns {Array<Record<string, unknown>>}
 */
function normalizeEvents(events) {
    if (!Array.isArray(events)) return [];
    const arr = /** @type {Array<Record<string, unknown>>} */ (
        events.filter((e) => e && typeof e === "object")
    );
    return arr.slice().sort((a, b) => {
        const ta =
            typeof a.timestamp === "string" ? Date.parse(a.timestamp) : 0;
        const tb =
            typeof b.timestamp === "string" ? Date.parse(b.timestamp) : 0;
        return tb - ta;
    });
}

/** @param {{ loading: boolean; refresh: (opts?: { silent?: boolean }) => Promise<void> }} props */
export function SnapshotRefreshButton({ loading, refresh }) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 shadow-none"
            disabled={loading}
            onClick={() => void refresh({ silent: false })}
            aria-label="Refresh pushed snapshot"
        >
            {loading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
                <RefreshCw className="size-3.5" aria-hidden />
            )}
        </Button>
    );
}

/**
 * Snapshot metadata + events table (no outer card). Parent supplies `data`
 * and `error` from {@link useLastImportPayload}.
 *
 * @param {{ data: { record: Record<string, unknown>; payload: Record<string, unknown> } | null; error: string | null }} props
 */
export function SnapshotPayloadPanel({ data, error }) {
    const [payloadMetaOpen, setPayloadMetaOpen] = React.useState(false);

    const events = React.useMemo(
        () => normalizeEvents(data?.payload?.events),
        [data],
    );

    const totalActiveSeconds = React.useMemo(() => {
        return events.reduce((acc, e) => {
            const d = numOrUndef(e.durationSeconds);
            return acc + (d ?? 0);
        }, 0);
    }, [events]);

    const payload = data?.payload ?? null;
    const record = data?.record ?? null;

    const rangePreset = payload
        ? snapshotRangePreset(payload.range)
        : undefined;
    const rangeStart =
        payload && payload.range && typeof payload.range === "object"
            ? strOrUndef(
                  /** @type {{ start?: unknown }} */ (payload.range).start,
              )
            : undefined;
    const rangeEnd =
        payload && payload.range && typeof payload.range === "object"
            ? strOrUndef(/** @type {{ end?: unknown }} */ (payload.range).end)
            : undefined;
    const bucketId = strOrUndef(payload?.bucketId);
    const generatedAt = strOrUndef(payload?.generatedAt);
    const eventCount =
        numOrUndef(payload?.eventCount) ??
        (payload ? events.length : undefined);
    const truncated = payload?.truncated === true;
    const schemaVersion = numOrUndef(payload?.schemaVersion);
    const sourceObj =
        payload && payload.source && typeof payload.source === "object"
            ? /** @type {{ app?: unknown; host?: unknown }} */ (payload.source)
            : null;
    const sourceApp = strOrUndef(sourceObj?.app);
    const sourceHost = strOrUndef(sourceObj?.host);
    const storedAt = strOrUndef(record?.storedAt);
    const byteLength = numOrUndef(record?.byteLength);
    const userAgent = record ? record.userAgent : undefined;

    return (
        <div className={cn(payload && "flex h-full min-h-0 flex-col gap-3")}>
            {error ? (
                <p className="text-destructive" role="alert">
                    {error}
                </p>
            ) : null}

            {!payload ? (
                <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border px-6 py-10 text-center">
                    <Inbox
                        className="h-8 w-8 text-muted-foreground"
                        aria-hidden
                    />
                    <div className="space-y-1">
                        <p className="text-base font-medium text-foreground">
                            No snapshot pushed yet
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Open{" "}
                            <span className="font-medium text-foreground">
                                aw-gateway
                            </span>{" "}
                            on your laptop and click{" "}
                            <span className="font-medium text-foreground">
                                Push snapshot
                            </span>
                            . This page will refresh automatically (every 6s
                            while visible).
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <Collapsible
                        open={payloadMetaOpen}
                        onOpenChange={setPayloadMetaOpen}
                        className="shrink-0 space-y-1"
                    >
                        <CollapsibleTrigger asChild>
                            <button
                                type="button"
                                className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <span>Payload details</span>
                                <ChevronDown
                                    className={cn(
                                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                                        payloadMetaOpen && "rotate-180",
                                    )}
                                    aria-hidden
                                />
                            </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 p-3 bg-muted/30 rounded-md border border-border">
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="inline-flex w-fit rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-foreground">
                                    {pushSourceLabel(userAgent)}
                                </span>
                                {rangePreset ? (
                                    <span className="inline-flex w-fit rounded-full border border-border bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                        range: {rangePreset}
                                    </span>
                                ) : null}
                                {truncated ? (
                                    <span className="inline-flex w-fit rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                        Truncated (per-bucket limit)
                                    </span>
                                ) : null}
                                {schemaVersion != null ? (
                                    <span className="inline-flex w-fit rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-mono text-muted-foreground">
                                        schemaVersion {schemaVersion}
                                    </span>
                                ) : null}
                            </div>

                            <dl className="grid gap-3 text-muted-foreground sm:grid-cols-2">
                                {storedAt ? (
                                    <div>
                                        <dt className="font-medium text-foreground">
                                            Received at
                                        </dt>
                                        <dd>
                                            {new Date(
                                                storedAt,
                                            ).toLocaleString()}
                                        </dd>
                                    </div>
                                ) : null}
                                {generatedAt ? (
                                    <div>
                                        <dt className="font-medium text-foreground">
                                            Generated at (source)
                                        </dt>
                                        <dd>
                                            {new Date(
                                                generatedAt,
                                            ).toLocaleString()}
                                        </dd>
                                    </div>
                                ) : null}
                                {rangeStart ? (
                                    <div>
                                        <dt className="font-medium text-foreground">
                                            Range start
                                        </dt>
                                        <dd className="font-mono text-xs">
                                            {new Date(
                                                rangeStart,
                                            ).toLocaleString()}
                                        </dd>
                                    </div>
                                ) : null}
                                {rangeEnd ? (
                                    <div>
                                        <dt className="font-medium text-foreground">
                                            Range end
                                        </dt>
                                        <dd className="font-mono text-xs">
                                            {new Date(
                                                rangeEnd,
                                            ).toLocaleString()}
                                        </dd>
                                    </div>
                                ) : null}
                                {eventCount != null ? (
                                    <div>
                                        <dt className="font-medium text-foreground">
                                            Event count
                                        </dt>
                                        <dd>{eventCount}</dd>
                                    </div>
                                ) : null}
                                <div>
                                    <dt className="font-medium text-foreground">
                                        Total active time
                                    </dt>
                                    <dd className="font-mono text-xs">
                                        {formatDurationSeconds(
                                            totalActiveSeconds,
                                        )}
                                    </dd>
                                </div>
                                {bucketId ? (
                                    <div className="sm:col-span-2">
                                        <dt className="font-medium text-foreground">
                                            Bucket
                                        </dt>
                                        <dd className="break-all font-mono text-xs">
                                            {bucketId}
                                        </dd>
                                    </div>
                                ) : null}
                                {sourceApp || sourceHost ? (
                                    <div className="sm:col-span-2">
                                        <dt className="font-medium text-foreground">
                                            Source
                                        </dt>
                                        <dd className="font-mono text-xs">
                                            {sourceApp ?? "unknown"}
                                            {sourceHost
                                                ? ` @ ${sourceHost}`
                                                : ""}
                                        </dd>
                                    </div>
                                ) : null}
                                {byteLength != null ? (
                                    <div>
                                        <dt className="font-medium text-foreground">
                                            Payload size
                                        </dt>
                                        <dd className="font-mono text-xs">
                                            {formatByteSize(byteLength)}
                                        </dd>
                                    </div>
                                ) : null}
                            </dl>
                        </CollapsibleContent>
                    </Collapsible>

                    <div className="flex min-h-0 flex-1 flex-col gap-2">
                        <div className="flex shrink-0 items-center justify-between pt-3 px-3">
                            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                                Events
                                <Button
                                    type="button"
                                    variant="default"
                                    className="shrink-0 shadow-none pl-3 rounded-full"
                                    size="sm"
                                >
                                    View JSON
                                    <ArrowUpRight
                                        className="h-4 w-4 shrink-0 transition-transform duration-200"
                                        aria-hidden
                                    />
                                </Button>
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {events.length} row
                                {events.length === 1 ? "" : "s"} · newest first
                            </p>
                        </div>
                        {events.length === 0 ? (
                            <p className="shrink-0 rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                                Snapshot contains no events for this range.
                            </p>
                        ) : (
                            <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border">
                                <Table className="text-xs">
                                    <TableHeader className="sticky top-0 z-10 bg-background shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
                                        <TableRow>
                                            <TableHead className="whitespace-nowrap">
                                                Start
                                            </TableHead>
                                            <TableHead className="whitespace-nowrap">
                                                Duration
                                            </TableHead>
                                            <TableHead className="whitespace-nowrap">
                                                Watcher
                                            </TableHead>
                                            <TableHead className="whitespace-nowrap">
                                                App
                                            </TableHead>
                                            <TableHead>Title</TableHead>
                                            <TableHead>URL</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {events.map((event, idx) => {
                                            const timestamp = strOrUndef(
                                                event.timestamp,
                                            );
                                            const durationSeconds = numOrUndef(
                                                event.durationSeconds,
                                            );
                                            const watcher = event.watcher;
                                            const app =
                                                strOrUndef(event.app) ?? "—";
                                            const title =
                                                strOrUndef(event.title) ?? "";
                                            const url = strOrUndef(event.url);
                                            return (
                                                <TableRow
                                                    key={`${timestamp ?? "t"}-${idx}`}
                                                >
                                                    <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                                                        {formatTimestamp(
                                                            timestamp,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap font-mono text-[11px]">
                                                        {formatDurationSeconds(
                                                            durationSeconds,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <WatcherBadge
                                                            watcher={watcher}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="max-w-[12rem] truncate font-medium text-foreground">
                                                        <span title={app}>
                                                            {app}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="max-w-[22rem] truncate text-muted-foreground">
                                                        <span title={title}>
                                                            {title || "—"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="max-w-[18rem] truncate font-mono text-[11px] text-muted-foreground">
                                                        {url ? (
                                                            <a
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-primary underline-offset-4 hover:underline"
                                                                title={url}
                                                            >
                                                                {truncateMiddle(
                                                                    url,
                                                                    60,
                                                                )}
                                                            </a>
                                                        ) : (
                                                            "—"
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        <p className="shrink-0 text-xs text-muted-foreground">
                            Refreshes automatically every 6s while this tab is
                            visible.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * Standalone pushed snapshot card. Polls every 6s via {@link useLastImportPayload}.
 */
export const SnapshotView = () => {
    const { data, loading, error, refresh } = useLastImportPayload();

    return (
        <div className="flex min-h-0 flex-1 flex-col items-center gap-2">
            <Card className="flex w-full max-w-3xl min-h-[min(32rem,85dvh)] flex-col shadow-none">
                <CardHeader className="flex shrink-0 flex-row items-start justify-between gap-3 space-y-0">
                    <div className="space-y-1.5">
                        <CardTitle className="text-lg">
                            Pushed snapshot
                        </CardTitle>
                        <CardDescription>
                            Full snapshot payload received from aw-gateway (or
                            any HTTP client posting to{" "}
                            <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                /api/activitywork/import
                            </code>
                            ). In-memory only — restarting this Meteor process
                            clears it.
                        </CardDescription>
                    </div>
                    <SnapshotRefreshButton
                        loading={loading}
                        refresh={refresh}
                    />
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 border-t pt-4 text-sm">
                    <SnapshotPayloadPanel data={data} error={error} />
                </CardContent>
            </Card>
        </div>
    );
};
