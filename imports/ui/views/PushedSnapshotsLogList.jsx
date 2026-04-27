import * as React from "react";
import { Download, MoreHorizontal, SquareArrowOutUpRight, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * @typedef {import("./pushedSnapshotsMock.js").PushedSnapshotMockEntry} PushedSnapshotEntry
 */

/**
 * @param {PushedSnapshotEntry} entry
 */
function openSnapshotPayloadInNewTab(entry) {
    const json = JSON.stringify(entry.data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const child = window.open(url, "_blank", "noopener,noreferrer");
    if (child) {
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } else {
        URL.revokeObjectURL(url);
    }
}

/**
 * List of mock pushed-snapshot "files". Each row opens the entry on click; the
 * kebab reveals a small placeholder menu.
 *
 * @param {{
 *   entries: PushedSnapshotEntry[];
 *   onOpen: (id: string) => void;
 * }} props
 */
export const PushedSnapshotsLogList = ({ entries, onOpen }) => {
    const [openMenuId, setOpenMenuId] = React.useState(
        /** @type {string | null} */ (null),
    );
    const containerRef = React.useRef(/** @type {HTMLDivElement | null} */ (null));

    React.useEffect(() => {
        if (!openMenuId) return undefined;
        const onDown = (ev) => {
            if (
                containerRef.current &&
                ev.target instanceof Node &&
                !containerRef.current.contains(ev.target)
            ) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [openMenuId]);

    return (
        <div ref={containerRef} className="divide-y divide-border">
            {entries.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No snapshots yet.
                </p>
            ) : null}
            {entries.map((entry) => (
                <PushedSnapshotsLogRow
                    key={entry.id}
                    entry={entry}
                    menuOpen={openMenuId === entry.id}
                    onToggleMenu={() =>
                        setOpenMenuId((cur) =>
                            cur === entry.id ? null : entry.id,
                        )
                    }
                    onCloseMenu={() => setOpenMenuId(null)}
                    onOpen={onOpen}
                />
            ))}
        </div>
    );
};

/**
 * @param {{
 *   entry: PushedSnapshotEntry;
 *   menuOpen: boolean;
 *   onToggleMenu: () => void;
 *   onCloseMenu: () => void;
 *   onOpen: (id: string) => void;
 * }} props
 */
function PushedSnapshotsLogRow({ entry, menuOpen, onToggleMenu, onCloseMenu, onOpen }) {
    const handleRowClick = () => onOpen(entry.id);
    const handleRowKey = (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            onOpen(entry.id);
        }
    };

    const runAction = (action) => (ev) => {
        ev.stopPropagation();
        onCloseMenu();
        if (action === "openInNewTab") {
            openSnapshotPayloadInNewTab(entry);
            return;
        }
        console.log("[pushed-snapshots]", action, entry.id);
    };

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={handleRowClick}
            onKeyDown={handleRowKey}
            className="group relative flex cursor-pointer items-center justify-between gap-3 px-2 py-2 text-sm hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
        >
            <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">
                    {entry.userEmail}
                </p>
                <p className="truncate font-mono text-[12px] text-foreground">
                    {entry.label}
                </p>
            </div>
            <div className="relative shrink-0">
                <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label="Row actions"
                    onClick={(ev) => {
                        ev.stopPropagation();
                        onToggleMenu();
                    }}
                >
                    <MoreHorizontal className="h-4 w-4" aria-hidden />
                </button>
                {menuOpen ? (
                    <div
                        role="menu"
                        className={cn(
                            "absolute right-0 top-full z-20 mt-1 min-w-[11.5rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-sm shadow-md",
                        )}
                    >
                        <MenuItem
                            icon={SquareArrowOutUpRight}
                            label="Open in new tab"
                            onClick={runAction("openInNewTab")}
                        />
                        <MenuItem
                            icon={Download}
                            label="Download JSON"
                            onClick={runAction("download")}
                        />
                        <MenuItem
                            icon={Trash2}
                            label="Delete"
                            destructive
                            onClick={runAction("delete")}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}

/**
 * @param {{
 *   icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
 *   label: string;
 *   destructive?: boolean;
 *   onClick: (ev: React.MouseEvent<HTMLButtonElement>) => void;
 * }} props
 */
function MenuItem({ icon: Icon, label, destructive = false, onClick }) {
    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            className={cn(
                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                destructive && "text-destructive hover:bg-destructive/10",
            )}
        >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
        </button>
    );
}
