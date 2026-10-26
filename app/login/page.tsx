"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Only same-site paths are allowed as a post-login destination. */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next") ?? "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).catch(() => null);

    if (res?.ok) {
      window.location.assign(nextPath());
      return;
    }
    const json = (await res?.json().catch(() => null)) as { error?: string } | null;
    setError(json?.error ?? "Could not sign in. Try again.");
    setPending(false);
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-background text-foreground noise-overlay">
      <header className="border-b border-foreground/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 lg:px-12">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display text-xl tracking-tight">Skylark</span>
            <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">TM</span>
          </Link>
          <span className="font-mono text-xs text-muted-foreground">Owner dashboard</span>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm border border-foreground/10 bg-card p-8"
        >
          <div className="mb-6 flex h-10 w-10 items-center justify-center border border-foreground/10">
            <Lock className="h-4 w-4" />
          </div>
          <span className="mb-3 inline-flex items-center gap-3 font-mono text-sm text-muted-foreground">
            <span className="h-px w-8 bg-foreground/30" />
            Admin access
          </span>
          <h1 className="mb-8 font-display text-4xl tracking-tight">Sign in</h1>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-5 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="mt-8 w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
