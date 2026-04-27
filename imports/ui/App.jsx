import * as React from "react";
import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";

import { LandingView } from "@/ui/views/LandingView";
import { HomeView } from "@/ui/views/HomeView";
import { ThemeToggleFooter } from "@/ui/ThemeToggleFooter";

const THEME_STORAGE_KEY = "timehuddle-theme";

function readInitialDark() {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export const App = () => {
    const { user, loggingIn } = useTracker(() => ({
        user: Meteor.user(),
        loggingIn: Meteor.loggingIn(),
    }));
    const [isDark, setIsDark] = React.useState(readInitialDark);

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
        const onKeyDown = (e) => {
            if (e.defaultPrevented) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            if (e.key !== "k" && e.key !== "K") return;
            const t = e.target;
            if (t instanceof HTMLElement) {
                const tag = t.tagName;
                if (
                    tag === "INPUT" ||
                    tag === "TEXTAREA" ||
                    tag === "SELECT" ||
                    t.isContentEditable
                ) {
                    return;
                }
            }
            e.preventDefault();
            setIsDark((d) => !d);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [setIsDark]);

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col bg-background text-foreground">
                <div className="flex flex-1 flex-col items-center gap-4 p-4 w-full max-w-3xl mx-auto">
                    <LandingView loggingIn={loggingIn} />
                    <ThemeToggleFooter isDark={isDark} setIsDark={setIsDark} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
            <HomeView isDark={isDark} setIsDark={setIsDark} />
        </div>
    );
};
