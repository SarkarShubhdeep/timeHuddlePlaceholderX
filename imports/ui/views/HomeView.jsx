import * as React from "react";
import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import {
    ArrowLeftCircleIcon,
    ArrowLeftRight,
    ChevronDown,
    Coins,
    Copy,
    KeyRound,
    Loader2,
    LogOut,
    User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TimeHuddlePlaceholderIntroCard } from "@/ui/TimeHuddlePlaceholderIntroCard";
import { PushedSnapshotsSection } from "@/ui/views/PushedSnapshotsSection";

/** Same path as `ACTIVITYWORK_IMPORT_PATH` in `importHttp.js` (avoid importing server-only module on the client). */
const ACTIVITYWORK_IMPORT_PATH = "/api/activitywork/import";

function formatMeteorError(err) {
    if (!err) return "";
    if (typeof err.reason === "string" && err.reason.length > 0) {
        return err.reason;
    }
    if (typeof err.message === "string" && err.message.length > 0) {
        return err.message;
    }
    return "Something went wrong. Try again.";
}

function gridCellCardClassName(extra = "") {
    return [
        "flex h-full min-h-0 min-w-0 flex-col overflow-hidden shadow-none",
        extra,
    ]
        .filter(Boolean)
        .join(" ");
}

export const HomeView = ({ isDark, setIsDark }) => {
    const user = useTracker(() => Meteor.user());

    const email = user?.emails?.[0]?.address ?? null;
    const emailVerified = Boolean(user?.emails?.[0]?.verified);
    const userId = user?._id ?? null;

    const [oldPassword, setOldPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [passwordBusy, setPasswordBusy] = React.useState(false);
    const [passwordMessage, setPasswordMessage] = React.useState("");
    const [passwordError, setPasswordError] = React.useState("");
    const [passwordSectionOpen, setPasswordSectionOpen] = React.useState(false);

    const [pushStatus, setPushStatus] = React.useState(
        /** @type {{ configured: boolean; last4: string | null } | null} */ (
            null
        ),
    );
    const [pushStatusLoading, setPushStatusLoading] = React.useState(true);
    const [pushBusy, setPushBusy] = React.useState(false);
    const [pushError, setPushError] = React.useState("");
    const [newPushToken, setNewPushToken] = React.useState(
        /** @type {string | null} */ (null),
    );
    const [copyFlash, setCopyFlash] = React.useState(false);

    const refreshPushStatus = React.useCallback(() => {
        if (!userId) {
            setPushStatus(null);
            setPushStatusLoading(false);
            return;
        }
        setPushStatusLoading(true);
        Meteor.call("user.getPushTokenStatus", (err, res) => {
            setPushStatusLoading(false);
            if (err) {
                setPushError(formatMeteorError(err));
                setPushStatus(null);
                return;
            }
            setPushError("");
            setPushStatus(
                res && typeof res === "object"
                    ? {
                          configured: Boolean(res.configured),
                          last4:
                              typeof res.last4 === "string" ? res.last4 : null,
                      }
                    : { configured: false, last4: null },
            );
        });
    }, [userId]);

    React.useEffect(() => {
        refreshPushStatus();
    }, [refreshPushStatus]);

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        setPasswordError("");
        setPasswordMessage("");
        if (!oldPassword || !newPassword) {
            setPasswordError("Enter your current password and a new password.");
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError("New password must be at least 6 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("New password and confirmation do not match.");
            return;
        }
        setPasswordBusy(true);
        Accounts.changePassword(oldPassword, newPassword, (err) => {
            setPasswordBusy(false);
            if (err) {
                setPasswordError(formatMeteorError(err));
                return;
            }
            setPasswordMessage("Password updated.");
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        });
    };

    const handleGeneratePushToken = () => {
        if (
            pushStatus?.configured &&
            !window.confirm(
                "This replaces your existing token. Update aw-gateway PUSH_TOKEN with the new value. Continue?",
            )
        ) {
            return;
        }
        setPushError("");
        setNewPushToken(null);
        setPushBusy(true);
        Meteor.call("user.generatePushToken", (err, res) => {
            setPushBusy(false);
            if (err) {
                setPushError(formatMeteorError(err));
                return;
            }
            if (
                res &&
                typeof res === "object" &&
                typeof res.token === "string"
            ) {
                setNewPushToken(res.token);
            }
            refreshPushStatus();
        });
    };

    const handleCopyToken = async () => {
        if (!newPushToken) return;
        try {
            await navigator.clipboard.writeText(newPushToken);
            setCopyFlash(true);
            window.setTimeout(() => setCopyFlash(false), 1500);
        } catch {
            setPushError("Could not copy to the clipboard.");
        }
    };

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
            <div className="min-h-0 flex-1 overflow-hidden p-2">
                <div className="grid h-full min-h-0 w-full grid-cols-2 gap-2 [grid-template-rows:minmax(0,2fr)_minmax(0,1fr)]">
                    <Card
                        className={cn(
                            gridCellCardClassName(),
                            "col-start-1 row-start-1",
                        )}
                    >
                        <CardHeader className="shrink-0 space-y-2 p-3 pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <User className="h-4 w-4" aria-hidden /> Your
                                account
                            </CardTitle>
                            <CardDescription className="text-base">
                                Signed-in user for this test deploy.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 pt-0 text-sm">
                            <dl className="grid gap-2 text-muted-foreground">
                                <div className="grid grid-cols-[6.5rem_1fr] gap-x-2 gap-y-1">
                                    <dt className="font-medium text-foreground">
                                        Email
                                    </dt>
                                    <dd
                                        className="truncate text-foreground"
                                        title={email ?? ""}
                                    >
                                        {email ?? "—"}
                                    </dd>
                                    <dt className="font-medium text-foreground">
                                        Verified
                                    </dt>
                                    <dd>
                                        {email
                                            ? emailVerified
                                                ? "Yes"
                                                : "No"
                                            : "—"}
                                    </dd>
                                    <dt className="font-medium text-foreground">
                                        User ID
                                    </dt>
                                    <dd
                                        className="font-mono break-all text-muted-foreground"
                                        title={userId ?? ""}
                                    >
                                        {userId ?? "—"}
                                    </dd>
                                </div>
                            </dl>

                            <div className="border-t border-border pt-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="flex w-full items-center justify-between gap-2 rounded-md p-2 text-left font-semibold text-foreground hover:bg-muted/60 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    aria-expanded={passwordSectionOpen}
                                    onClick={() =>
                                        setPasswordSectionOpen((o) => !o)
                                    }
                                >
                                    <span className="flex items-center gap-2">
                                        <KeyRound
                                            className="h-4 w-4 shrink-0"
                                            aria-hidden
                                        />
                                        Password
                                    </span>
                                    <ChevronDown
                                        className={cn(
                                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                                            passwordSectionOpen && "rotate-180",
                                        )}
                                        aria-hidden
                                    />
                                </Button>
                                {passwordSectionOpen ? (
                                    <form
                                        className="mt-3 space-y-2"
                                        onSubmit={handlePasswordSubmit}
                                    >
                                        <div className="space-y-1">
                                            <Label htmlFor="acct-old-password">
                                                Current password
                                            </Label>
                                            <Input
                                                id="acct-old-password"
                                                type="password"
                                                autoComplete="current-password"
                                                value={oldPassword}
                                                onChange={(e) =>
                                                    setOldPassword(
                                                        e.target.value,
                                                    )
                                                }
                                                disabled={passwordBusy}
                                                className="w-full"
                                            />
                                        </div>
                                        <div className="flex min-w-0 flex-row gap-2">
                                            <div className="min-w-0 w-1/2 flex-1 space-y-1">
                                                <Label htmlFor="acct-new-password">
                                                    New password
                                                </Label>
                                                <Input
                                                    id="acct-new-password"
                                                    type="password"
                                                    autoComplete="new-password"
                                                    value={newPassword}
                                                    onChange={(e) =>
                                                        setNewPassword(
                                                            e.target.value,
                                                        )
                                                    }
                                                    disabled={passwordBusy}
                                                    className="w-full min-w-0"
                                                />
                                            </div>
                                            <div className="min-w-0 w-1/2 flex-1 space-y-1">
                                                <Label htmlFor="acct-confirm-password">
                                                    Confirm new password
                                                </Label>
                                                <Input
                                                    id="acct-confirm-password"
                                                    type="password"
                                                    autoComplete="new-password"
                                                    value={confirmPassword}
                                                    onChange={(e) =>
                                                        setConfirmPassword(
                                                            e.target.value,
                                                        )
                                                    }
                                                    disabled={passwordBusy}
                                                    className="w-full min-w-0"
                                                />
                                            </div>
                                        </div>
                                        {passwordError ? (
                                            <p className="text-xs text-destructive">
                                                {passwordError}
                                            </p>
                                        ) : null}
                                        {passwordMessage ? (
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                                {passwordMessage}
                                            </p>
                                        ) : null}
                                        <Button
                                            type="submit"
                                            size="sm"
                                            variant="secondary"
                                            className="shadow-none"
                                            disabled={passwordBusy}
                                        >
                                            {passwordBusy ? (
                                                <>
                                                    <Loader2
                                                        className="h-4 w-4 animate-spin"
                                                        aria-hidden
                                                    />
                                                    Updating…
                                                </>
                                            ) : (
                                                "Update password"
                                            )}
                                        </Button>
                                    </form>
                                ) : null}
                            </div>

                            <div className="space-y-3 border-t border-border pt-3 px-2">
                                <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                                    <ArrowLeftRight
                                        className="h-4 w-4 shrink-0"
                                        aria-hidden
                                    />
                                    Push token (aw-gateway)
                                </h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Paste this value into local aw-gateway as{" "}
                                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                                        PUSH_TOKEN
                                    </code>
                                    . Send it as{" "}
                                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                                        Authorization: Bearer &lt;token&gt;
                                    </code>{" "}
                                    on{" "}
                                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                                        {ACTIVITYWORK_IMPORT_PATH}
                                    </code>
                                    . When{" "}
                                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                                        ACTIVITYWORK_IMPORT_SHARED_SECRET
                                    </code>{" "}
                                    is configured on the server, the Bearer can
                                    be either that shared secret or this
                                    personal token. If the shared secret env is
                                    empty (typical local placeholder), imports
                                    are not gated.
                                </p>
                                {pushStatusLoading ? (
                                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Loader2
                                            className="h-3.5 w-3.5 animate-spin"
                                            aria-hidden
                                        />
                                        Loading token status…
                                    </p>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        {pushStatus?.configured
                                            ? `A token is configured (ends with …${pushStatus.last4 ?? "????"}).`
                                            : "No push token yet. Generate one to authenticate imports for your account."}
                                    </p>
                                )}
                                {pushError ? (
                                    <p className="text-xs text-destructive">
                                        {pushError}
                                    </p>
                                ) : null}
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="shadow-none"
                                    disabled={pushBusy || pushStatusLoading}
                                    onClick={handleGeneratePushToken}
                                >
                                    {pushBusy ? (
                                        <>
                                            <Loader2
                                                className="h-4 w-4 animate-spin"
                                                aria-hidden
                                            />
                                            Generating…
                                        </>
                                    ) : pushStatus?.configured ? (
                                        "Regenerate push token"
                                    ) : (
                                        "Generate push token"
                                    )}
                                </Button>
                                {newPushToken ? (
                                    <div className="space-y-2 rounded-md border border-border bg-muted/40 p-2">
                                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                            Copy this token now. It will not be
                                            shown again.
                                        </p>
                                        <div className="flex gap-2">
                                            <Input
                                                readOnly
                                                value={newPushToken}
                                                className="font-mono text-xs"
                                            />
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="secondary"
                                                className="shrink-0 shadow-none"
                                                onClick={() =>
                                                    void handleCopyToken()
                                                }
                                                aria-label="Copy token"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {copyFlash ? (
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                                Copied to clipboard.
                                            </p>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        </CardContent>
                        <CardFooter className="shrink-0 border-t border-border px-3 py-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="shadow-none"
                                onClick={() => Meteor.logout()}
                            >
                                <LogOut className="h-4 w-4" aria-hidden />
                                Sign out
                            </Button>
                        </CardFooter>
                    </Card>

                    <TimeHuddlePlaceholderIntroCard
                        fillHeight
                        isDark={isDark}
                        setIsDark={setIsDark}
                        className={cn(
                            gridCellCardClassName(),
                            "col-start-1 row-start-2",
                        )}
                    />

                    <PushedSnapshotsSection
                        className={cn(
                            gridCellCardClassName(),
                            "col-start-2 row-span-2 row-start-1",
                        )}
                    />
                </div>
            </div>
        </div>
    );
};
