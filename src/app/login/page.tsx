"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { friendlyError, useToast } from "@/components/ui/toast";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const supabase = createClient();
      try {
        if (mode === "sign-in") {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.signUp({ email, password });
          if (error) throw error;
          toast.show("Account created. You're signed in as the host.", "success");
        }
        router.push(params.get("next") ?? "/dashboard");
        router.refresh();
      } catch (err) {
        toast.show(friendlyError(err, "Sign in failed. Check your email and password."), "error");
      }
    });
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-2xl">
            🎯
          </div>
          <h1 className="font-display text-2xl font-bold">Quiz Night</h1>
          <p className="mt-1 text-sm text-muted">Host sign-in for your private quiz platform</p>
        </div>
        <Card>
          <CardBody>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="host@example.com"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" size="lg" disabled={pending} className="mt-2">
                {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create host account"}
              </Button>
            </form>
            <button
              type="button"
              onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
              className="mt-4 w-full text-center text-sm text-muted hover:text-foreground transition-colors"
            >
              {mode === "sign-in" ? "First time here? Create a host account" : "Already have an account? Sign in"}
            </button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
