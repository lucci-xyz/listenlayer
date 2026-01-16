"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createSupabaseBrowserClient();

  // Build callback URL with plan param if present
  const getCallbackUrl = () => {
    if (planParam) {
      return `/app?upgrade=${planParam}`;
    }
    return "/app";
  };

  const handleLogin = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (signInError) {
        if (signInError.message.includes("Email not confirmed")) {
          setError("Please confirm your email before signing in.");
        } else if (signInError.message.includes("Invalid login credentials")) {
          setError("Invalid email or password.");
        } else {
          setError(signInError.message);
        }
        return;
      }

      router.push(getCallbackUrl());
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(getCallbackUrl())}`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("This email is already registered. Try signing in.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      setInfo("Check your email to confirm your account.");
      setRegisterEmail("");
      setRegisterPassword("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "auth_callback_error") {
      setError("Unable to verify your email. Please try again.");
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10 sm:px-6 sm:py-12 relative">
      {/* Back button - Top Left */}
      <Link 
        href="/" 
        className="absolute top-8 left-8 inline-flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors rounded-full px-4 py-2 hover:bg-muted/60"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="mb-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="font-display text-2xl font-bold tracking-tight text-foreground">ListenLayer.</span>
          </Link>
          {planParam && (
            <p className="mt-4 text-sm text-muted-foreground">
              Sign in or create an account to continue with the{" "}
              <span className="font-medium text-foreground capitalize">{planParam}</span> plan
            </p>
          )}
        </div>

        {/* Card */}
        <Card className="border-border/60 shadow-soft-lg bg-card">
          <CardContent className="p-6 sm:p-8">
            <Tabs defaultValue={planParam ? "register" : "login"} className="w-full">
              <TabsList className="mb-8 flex h-11 w-full rounded-full bg-muted/60 border border-border/60 p-1">
                <TabsTrigger value="login" className="flex-1 h-9 justify-center rounded-full px-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">Sign in</TabsTrigger>
                <TabsTrigger value="register" className="flex-1 h-9 justify-center rounded-full px-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">Create account</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80" htmlFor="login-email">
                    Email
                  </label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80" htmlFor="login-password">
                    Password
                  </label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>
                <Button 
                  className="w-full h-11 text-base shadow-sm" 
                  onClick={handleLogin}
                  disabled={loading || !loginEmail || !loginPassword}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Sign in
                </Button>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80" htmlFor="register-email">
                    Email
                  </label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="you@example.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80" htmlFor="register-password">
                    Password
                  </label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                  />
                </div>
                <Button 
                  className="w-full h-11 text-base shadow-sm" 
                  onClick={handleRegister}
                  disabled={loading || !registerEmail || registerPassword.length < 6}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create account
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-4">
                  By creating an account, you agree to our terms of service.
                </p>
              </TabsContent>
            </Tabs>

            {/* Error/Info messages */}
            {error && (
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            {info && (
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {info}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
