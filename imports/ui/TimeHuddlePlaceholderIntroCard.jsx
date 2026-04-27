import * as React from "react";
import { ExternalLink, Info, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PLACEHOLDER_RENDER_URL = "https://timehuddleplaceholderx.onrender.com/";
const AW_GATEWAY_REPO = "https://github.com/SarkarShubhdeep/aw-gateway";

export const TimeHuddlePlaceholderIntroCard = ({
    className,
    fillHeight = false,
    isDark,
    setIsDark,
}) => (
    <Card
        className={cn(
            "min-h-0 min-w-0 overflow-hidden",
            fillHeight && "flex h-full flex-col",
            className,
        )}
    >
        <CardHeader className={cn(fillHeight && "shrink-0 space-y-2 p-3 pb-2")}>
            <CardTitle
                className={cn(
                    fillHeight ? "text-lg" : "text-2xl",
                    "flex items-center gap-2",
                )}
            >
                <Info className="h-4 w-4" aria-hidden /> TimeHuddle placeholder
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
                A small Meteor + React host used to exercise the ActivityWork
                snapshot path from your machine to a deployed URL—not the
                production TimeHuddle product.
            </CardDescription>
        </CardHeader>
        <CardContent
            className={cn(
                "space-y-3 text-muted-foreground",
                fillHeight && "min-h-0 flex-1 overflow-y-auto p-3 pt-0",
            )}
        >
            <p>
                Local{" "}
                <a
                    href={AW_GATEWAY_REPO}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                    aw-gateway
                </a>{" "}
                can POST snapshot JSON here so you can confirm payloads, timing,
                and auth against a real HTTPS endpoint (for example the{" "}
                <a
                    href={PLACEHOLDER_RENDER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                    Render test deploy
                </a>
                ). Sign in below to reach the in-app overview and pushed
                snapshot tabs; accounts are stored in this app&apos;s MongoDB
                database.
            </p>
        </CardContent>
        <CardFooter
            className={cn(
                "flex flex-wrap items-center gap-2",
                fillHeight && "shrink-0 border-t border-border px-3 py-2",
            )}
        >
            {typeof setIsDark === "function" ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 rounded-full"
                    onClick={() => setIsDark((d) => !d)}
                    aria-label={
                        isDark ? "Switch to light mode" : "Switch to dark mode"
                    }
                >
                    {isDark ? (
                        <Sun className="h-5 w-5" aria-hidden />
                    ) : (
                        <Moon className="h-5 w-5" aria-hidden />
                    )}
                </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild className="shadow-none">
                <a
                    href={PLACEHOLDER_RENDER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2"
                >
                    Open placeholder deploy
                    <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
            </Button>
        </CardFooter>
    </Card>
);
