import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ThemeToggleFooter = ({ isDark, setIsDark, className }) => (
    <footer
        className={cn("flex w-full justify-center py-3", className)}
    >
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
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
    </footer>
);
