import * as React from "react";
import { ExternalLink, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { OverviewView } from "@/ui/views/OverviewView";
import { SnapshotView } from "@/ui/views/SnapshotView";

const PLACEHOLDER_RENDER_URL = "https://timehuddleplaceholderx.onrender.com/";
const THEME_STORAGE_KEY = "timehuddle-theme";
const ACTIVE_TAB_STORAGE_KEY = "timehuddle-active-tab";

function readInitialDark() {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readInitialTab() {
    if (typeof window === "undefined") return "overview";
    const stored = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    return stored === "snapshot" ? "snapshot" : "overview";
}

export const App = () => {
    const [isDark, setIsDark] = React.useState(readInitialDark);
    const [activeTab, setActiveTab] = React.useState(readInitialTab);

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
        window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
    }, [activeTab]);

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <div className="flex flex-1 flex-col items-center gap-2 p-4 w-full max-w-3xl mx-auto">
                <Card className="w-full max-w-lg shadow-none">
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

                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full flex flex-col items-center gap-2"
                >
                    <TabsList className="w-full max-w-lg">
                        <TabsTrigger value="overview" className="flex-1">
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="snapshot" className="flex-1">
                            Pushed Snapshot
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="w-full mt-0">
                        <OverviewView />
                    </TabsContent>
                    <TabsContent value="snapshot" className="w-full mt-0">
                        <SnapshotView />
                    </TabsContent>
                </Tabs>

                <footer className="w-full flex justify-center py-3">
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
