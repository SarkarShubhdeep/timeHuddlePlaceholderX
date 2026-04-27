import * as React from "react";
import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import {
    Camera,
    FileClock,
    ListTree,
} from "lucide-react";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ActivityWorkImports } from "@/api/activityWork/imports.collection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PushedSnapshotsLogList } from "@/ui/views/PushedSnapshotsLogList";
import {
    SnapshotPayloadPanel,
    SnapshotRefreshButton,
} from "@/ui/views/SnapshotView";

const PUBLIC_IMPORTS_LIMIT = 100;

/**
 * @param {unknown} value
 * @returns {Date | null}
 */
function toDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === "string" && value.length > 0) {
        const d = new Date(value);
        if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
}

/**
 * @param {Date} start
 * @param {Date} end
 * @returns {string}
 */
function formatRangeLabel(start, end) {
    const dateStr = start.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const timeFmt = (d) =>
        d.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });
    return `${dateStr}, ${timeFmt(start)} - ${timeFmt(end)}`;
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {{ startsAt: Date | null; endsAt: Date | null }}
 */
function getPayloadRange(payload) {
    const range = payload.range;
    if (!range || typeof range !== "object" || Array.isArray(range)) {
        return { startsAt: null, endsAt: null };
    }
    const startsAt = toDate(/** @type {{ start?: unknown }} */ (range).start);
    const endsAt = toDate(/** @type {{ end?: unknown }} */ (range).end);
    return { startsAt, endsAt };
}

/**
 * @param {import("@/api/activityWork/imports.collection").ActivityWorkImportDoc & { _id?: string }} doc
 */
function mapDocToLogEntry(doc) {
    const payload =
        doc.payload && typeof doc.payload === "object" && !Array.isArray(doc.payload)
            ? doc.payload
            : {};
    const receivedAt = toDate(doc.receivedAt) ?? new Date();
    const { startsAt, endsAt } = getPayloadRange(payload);
    const startDate = startsAt ?? receivedAt;
    const endDate = endsAt ?? startDate;
    const ownerEmail =
        typeof doc.ownerEmail === "string" && doc.ownerEmail.length > 0
            ? doc.ownerEmail
            : typeof doc.userId === "string" && doc.userId.length > 0
              ? `${doc.userId}@unknown.local`
              : "unknown@unknown.local";

    return {
        id: doc._id ?? `${receivedAt.toISOString()}-${doc.userId}`,
        startsAt: startDate.toISOString(),
        endsAt: endDate.toISOString(),
        label: formatRangeLabel(startDate, endDate),
        userEmail: ownerEmail,
        data: {
            record: {
                storedAt: receivedAt.toISOString(),
                byteLength:
                    typeof doc.byteLength === "number" &&
                    Number.isFinite(doc.byteLength)
                        ? doc.byteLength
                        : 0,
                userAgent:
                    typeof doc.userAgent === "string" ? doc.userAgent : "",
            },
            payload,
        },
    };
}

/**
 * Home grid cell: a two-mode "file system" for pushed snapshots.
 *
 * - No selection → shows a centralized list of pushed snapshot entries.
 * - Selection → shows the payload detail using {@link SnapshotPayloadPanel}.
 *
 * @param {{ className?: string }} props
 */
export const PushedSnapshotsSection = ({ className }) => {
    const [refreshTick, setRefreshTick] = React.useState(0);
    const [selectedId, setSelectedId] = React.useState(
        /** @type {string | null} */ (null),
    );
    const { entries, loading } = useTracker(
        () => {
            const handle = Meteor.subscribe(
                "activityWork.publicImports",
                PUBLIC_IMPORTS_LIMIT,
            );
            const docs = ActivityWorkImports.find(
                {},
                { sort: { receivedAt: -1 }, limit: PUBLIC_IMPORTS_LIMIT },
            ).fetch();
            return {
                entries: docs.map(mapDocToLogEntry),
                loading: !handle.ready(),
            };
        },
        [refreshTick],
    );

    const selected = React.useMemo(
        () => (selectedId ? entries.find((e) => e.id === selectedId) ?? null : null),
        [entries, selectedId],
    );

    React.useEffect(() => {
        if (!selectedId) return;
        if (entries.some((entry) => entry.id === selectedId)) return;
        setSelectedId(null);
    }, [entries, selectedId]);

    const refresh = React.useCallback(async () => {
        setRefreshTick((n) => n + 1);
    }, []);

    return (
        <Card className={className}>
            <CardHeader className="shrink-0 space-y-0 p-3 pb-2">
                <div className="flex h-8 flex-row items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Camera className="h-4 w-4 shrink-0" aria-hidden />
                        Pushed snapshot
                    </CardTitle>
                    <SnapshotRefreshButton
                        loading={loading}
                        refresh={refresh}
                    />
                </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 pt-3 text-sm">
                <Breadcrumb className="shrink-0">
                    <BreadcrumbList className="flex-nowrap gap-1 rounded-xl bg-muted p-1 text-foreground sm:gap-1">
                        <BreadcrumbItem>
                            {selected ? (
                                <BreadcrumbLink asChild>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedId(null)}
                                        className={cn(
                                            "inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground",
                                        )}
                                    >
                                        <ListTree
                                            className="h-4 w-4 shrink-0"
                                            aria-hidden
                                        />
                                        <span className="min-w-0 truncate font-mono text-[12px]">
                                            {" "}
                                            Logs list
                                        </span>
                                    </button>
                                </BreadcrumbLink>
                            ) : (
                                <BreadcrumbPage
                                    className={cn(
                                        "inline-flex max-w-full items-center gap-2 truncate rounded-lg bg-background px-2.5 py-1 font-medium shadow-sm",
                                    )}
                                >
                                    <ListTree
                                        className="h-4 w-4 shrink-0"
                                        aria-hidden
                                    />
                                    <span className="min-w-0 truncate font-mono text-[12px]">
                                        Logs list
                                    </span>
                                </BreadcrumbPage>
                            )}
                        </BreadcrumbItem>
                        {selected ? (
                            <>
                                <BreadcrumbSeparator className="mx-0 text-muted-foreground [&>svg]:size-3.5" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage
                                        className={cn(
                                            "inline-flex max-w-full min-w-0 items-center gap-2 truncate rounded-lg bg-background px-2.5 py-1 font-medium shadow-sm",
                                        )}
                                    >
                                        <FileClock
                                            className="h-4 w-4 shrink-0"
                                            aria-hidden
                                        />
                                        <span className="min-w-0 truncate font-mono text-[12px]">
                                            {selected.label}
                                        </span>
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </>
                        ) : null}
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                    {selected ? (
                        <SnapshotPayloadPanel
                            data={selected.data}
                            error={null}
                        />
                    ) : (
                        <PushedSnapshotsLogList
                            entries={entries}
                            onOpen={setSelectedId}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
