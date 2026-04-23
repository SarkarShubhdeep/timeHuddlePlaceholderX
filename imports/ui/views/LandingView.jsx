import * as React from "react";
import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";
import { ExternalLink } from "lucide-react";

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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

const PLACEHOLDER_RENDER_URL = "https://timehuddleplaceholderx.onrender.com/";
const AW_GATEWAY_REPO = "https://github.com/SarkarShubhdeep/aw-gateway";

function formatAuthError(err) {
    if (!err) return "";
    if (err.reason) return err.reason;
    if (err.message) return err.message;
    return "Something went wrong. Try again.";
}

export const LandingView = ({ loggingIn }) => {
    const [authTab, setAuthTab] = React.useState("signin");
    const [signInEmail, setSignInEmail] = React.useState("");
    const [signInPassword, setSignInPassword] = React.useState("");
    const [signUpEmail, setSignUpEmail] = React.useState("");
    const [signUpPassword, setSignUpPassword] = React.useState("");
    const [signUpConfirm, setSignUpConfirm] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState("");

    const submitting = busy || loggingIn;

    const handleSignIn = (e) => {
        e.preventDefault();
        setError("");
        const email = signInEmail.trim();
        if (!email || !signInPassword) {
            setError("Enter your email and password.");
            return;
        }
        setBusy(true);
        Meteor.loginWithPassword(email, signInPassword, (err) => {
            setBusy(false);
            if (err) setError(formatAuthError(err));
        });
    };

    const handleSignUp = (e) => {
        e.preventDefault();
        setError("");
        const email = signUpEmail.trim();
        if (!email || !signUpPassword) {
            setError("Enter your email and a password.");
            return;
        }
        if (signUpPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (signUpPassword !== signUpConfirm) {
            setError("Passwords do not match.");
            return;
        }
        setBusy(true);
        Accounts.createUser({ email, password: signUpPassword }, (err) => {
            setBusy(false);
            if (err) setError(formatAuthError(err));
        });
    };

    return (
        <div className="w-full max-w-lg flex flex-col gap-6">
            <Card className="w-full shadow-none">
                <CardHeader>
                    <CardTitle className="text-2xl">
                        TimeHuddle placeholder
                    </CardTitle>
                    <CardDescription>
                        A small Meteor + React host used to exercise the
                        ActivityWork snapshot path from your machine to a
                        deployed URL—not the production TimeHuddle product.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
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
                        can POST snapshot JSON here so you can confirm payloads,
                        timing, and auth against a real HTTPS endpoint (for
                        example the{" "}
                        <a
                            href={PLACEHOLDER_RENDER_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                            Render test deploy
                        </a>
                        ). Sign in below to reach the in-app overview and pushed
                        snapshot tabs; accounts are stored in this app&apos;s
                        MongoDB database.
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
                            Open placeholder deploy
                            <ExternalLink className="h-4 w-4" aria-hidden />
                        </a>
                    </Button>
                </CardFooter>
            </Card>

            <Card className="w-full shadow-none">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Sign in to continue</CardTitle>
                    <CardDescription>
                        Email and password are saved for this test app only.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs
                        value={authTab}
                        onValueChange={(v) => {
                            setAuthTab(v);
                            setError("");
                        }}
                    >
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="signin">Sign in</TabsTrigger>
                            <TabsTrigger value="signup">Create account</TabsTrigger>
                        </TabsList>
                        <TabsContent value="signin" className="mt-4">
                            <form
                                className="space-y-4"
                                onSubmit={handleSignIn}
                                noValidate
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="signin-email">Email</Label>
                                    <Input
                                        id="signin-email"
                                        type="email"
                                        autoComplete="email"
                                        value={signInEmail}
                                        onChange={(ev) =>
                                            setSignInEmail(ev.target.value)
                                        }
                                        disabled={submitting}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signin-password">
                                        Password
                                    </Label>
                                    <Input
                                        id="signin-password"
                                        type="password"
                                        autoComplete="current-password"
                                        value={signInPassword}
                                        onChange={(ev) =>
                                            setSignInPassword(ev.target.value)
                                        }
                                        disabled={submitting}
                                    />
                                </div>
                                {error && authTab === "signin" ? (
                                    <p
                                        className="text-sm text-destructive"
                                        role="alert"
                                    >
                                        {error}
                                    </p>
                                ) : null}
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={submitting}
                                >
                                    {submitting ? "Signing in…" : "Sign in"}
                                </Button>
                            </form>
                        </TabsContent>
                        <TabsContent value="signup" className="mt-4">
                            <form
                                className="space-y-4"
                                onSubmit={handleSignUp}
                                noValidate
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="signup-email">Email</Label>
                                    <Input
                                        id="signup-email"
                                        type="email"
                                        autoComplete="email"
                                        value={signUpEmail}
                                        onChange={(ev) =>
                                            setSignUpEmail(ev.target.value)
                                        }
                                        disabled={submitting}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-password">
                                        Password
                                    </Label>
                                    <Input
                                        id="signup-password"
                                        type="password"
                                        autoComplete="new-password"
                                        value={signUpPassword}
                                        onChange={(ev) =>
                                            setSignUpPassword(ev.target.value)
                                        }
                                        disabled={submitting}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-confirm">
                                        Confirm password
                                    </Label>
                                    <Input
                                        id="signup-confirm"
                                        type="password"
                                        autoComplete="new-password"
                                        value={signUpConfirm}
                                        onChange={(ev) =>
                                            setSignUpConfirm(ev.target.value)
                                        }
                                        disabled={submitting}
                                    />
                                </div>
                                {error && authTab === "signup" ? (
                                    <p
                                        className="text-sm text-destructive"
                                        role="alert"
                                    >
                                        {error}
                                    </p>
                                ) : null}
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={submitting}
                                >
                                    {submitting ? "Creating account…" : "Create account"}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};
