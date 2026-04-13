import * as React from "react";
import { ExternalLink, FlaskConical } from "lucide-react";

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

export const App = () => {
    const [activityWorkEnabled, setActivityWorkEnabled] = React.useState(false);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-muted flex-grow gap-2">
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
                        . Use the link below once you have the real deployment
                        URL (see README for the same placeholder).
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
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                    <Label
                        htmlFor={ACTIVITY_WORK_SWITCH_ID}
                        className="text-lg font-semibold leading-none tracking-tight cursor-pointer"
                    >
                        Enable ActivityWork
                    </Label>
                    <Switch
                        id={ACTIVITY_WORK_SWITCH_ID}
                        checked={activityWorkEnabled}
                        onCheckedChange={setActivityWorkEnabled}
                    />
                </CardHeader>

                <CardFooter>
                    <CardDescription>
                        ActivityWork is a feature that allows you to track your
                        work and projects via ActivityWatch. ActivityWatch
                        should be installed on your machine. Know more about it{" "}
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
        </div>
    );
};
