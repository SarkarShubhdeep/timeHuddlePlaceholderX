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

const PLACEHOLDER_VERCEL_URL = "https://your-timehuddle-app.vercel.app";

export const App = () => (
    <div className="min-h-screen flex items-center justify-center bg-muted flex-grow">
        <Card className="w-full max-w-lg shadow-none">
            <CardHeader>
                <CardTitle className="text-2xl">
                    TimeHuddle placeholder
                </CardTitle>
                <CardDescription>
                    This Meteor + React app exists for testing and integration
                    checks. It is not the full TimeHuddle product.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                    Production TimeHuddle is hosted on{" "}
                    <span className="font-medium text-foreground">Vercel</span>.
                    Use the link below once you have the real deployment URL
                    (see README for the same placeholder).
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
                        href={PLACEHOLDER_VERCEL_URL}
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
    </div>
);
