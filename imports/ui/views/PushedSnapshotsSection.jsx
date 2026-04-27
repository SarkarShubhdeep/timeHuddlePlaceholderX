import * as React from "react";
import {
    CalendarClock,
    Camera,
    ChevronLeft,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PushedSnapshotsLogList } from "@/ui/views/PushedSnapshotsLogList";
import { PUSHED_SNAPSHOTS_MOCK } from "@/ui/views/pushedSnapshotsMock";
import {
    SnapshotPayloadPanel,
    SnapshotRefreshButton,
} from "@/ui/views/SnapshotView";

// TODO(multitenant-phase-B/D): replace PUSHED_SNAPSHOTS_MOCK with a per-user
// Meteor method/publication listing the authenticated user's pushed snapshots,
// and wire the refresh button to re-subscribe / re-call the method.

/**
 * Home grid cell: a two-mode "file system" for pushed snapshots.
 *
 * - No selection → shows a list of mock snapshot entries with a kebab menu.
 * - Selection → shows the payload detail using {@link SnapshotPayloadPanel}.
 *
 * @param {{ className?: string }} props
 */
export const PushedSnapshotsSection = ({ className }) => {
    const [selectedId, setSelectedId] = React.useState(
        /** @type {string | null} */ (null),
    );
    const selected = React.useMemo(
        () =>
            selectedId
                ? (PUSHED_SNAPSHOTS_MOCK.find((e) => e.id === selectedId) ??
                  null)
                : null,
        [selectedId],
    );

    // Mock-only for now; real refresh will live alongside the method call.
    const loading = false;
    const refresh = React.useCallback(async () => {}, []);

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
                <div className="min-h-0 flex-1 overflow-y-auto">
                    {selected ? (
                        <SnapshotPayloadPanel
                            data={selected.data}
                            error={null}
                        />
                    ) : (
                        <PushedSnapshotsLogList
                            entries={PUSHED_SNAPSHOTS_MOCK}
                            onOpen={setSelectedId}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
