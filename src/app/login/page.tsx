"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    const result = await signIn("credentials", {
      email: loginEmail,
      password: loginPassword,
      callbackUrl: "/app",
      redirect: true,
    });
    if (result?.error) {
      setError("Invalid email or password.");
    }
  };

  const handleRegister = async () => {
    setError(null);
    setInfo(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: registerEmail, password: registerPassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Unable to register" }));
      setError(data.error || "Unable to register");
      return;
    }
    setInfo("Account created. You can sign in now.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Welcome to ListenLayer</CardTitle>
          <p className="text-sm text-zinc-500">
            Use the demo credentials or create your own account.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4 space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              <Button className="w-full" onClick={handleLogin}>
                Sign in
              </Button>
              <div className="text-xs text-zinc-500">
                Demo: demo@listenlayer.local / demo1234
              </div>
            </TabsContent>
            <TabsContent value="register" className="mt-4 space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password (min 6 chars)"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
              />
              <Button className="w-full" onClick={handleRegister}>
                Create account
              </Button>
            </TabsContent>
          </Tabs>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {info ? <p className="text-sm text-emerald-600">{info}</p> : null}
          <div className="text-xs text-zinc-500">
            Need to bypass auth? Set DEV_AUTH_BYPASS=true and head to the
            <Link className="ml-1 text-zinc-900 underline" href="/app">
              dashboard
            </Link>
            .
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
