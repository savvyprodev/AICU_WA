import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

export default function Login() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (email.trim().length === 0) return false;
    if (password.length < 6) return false;
    return true;
  }, [email, password]);

  if (!loading && user) {
    navigate("/");
  }

  const submit = async () => {
    if (!supabase) {
      setError(
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel environment variables, then redeploy."
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "signIn") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
      }
      navigate("/");
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase) {
      setError(
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON (or VITE_SUPABASE_ANON_KEY) in Vercel, then redeploy."
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const redirectTo = `${window.location.origin}/`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (oauthError) throw oauthError;
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Google sign-in failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Use your Supabase Auth account to access the dashboard.
          </p>
        </div>

        <div className="space-y-4">
          {!isSupabaseConfigured ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Supabase is not configured for this deployment. Add
              {" "}
              <span className="font-mono">VITE_SUPABASE_URL</span> and
              {" "}
              <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> to your
              Vercel Environment Variables (Production), then redeploy.
            </div>
          ) : null}

          <Button
            className="w-full"
            variant="outline"
            disabled={!isSupabaseConfigured || submitting}
            onClick={signInWithGoogle}
          >
            Sign in with Google
          </Button>

          <div className="relative flex items-center justify-center py-1">
            <div className="h-px w-full bg-border" />
            <span className="absolute bg-background px-2 text-xs text-muted-foreground">
              or
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={
                mode === "signIn" ? "current-password" : "new-password"
              }
            />
            <p className="text-xs text-muted-foreground">
              Minimum 6 characters.
            </p>
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <Button
            className="w-full"
            disabled={!canSubmit || submitting}
            onClick={submit}
          >
            {mode === "signIn" ? "Sign in" : "Create account"}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
              disabled={submitting}
            >
              {mode === "signIn"
                ? "Need an account? Sign up"
                : "Have an account? Sign in"}
            </button>

            <Link className="text-primary hover:underline" href="/forgot-password">
              Forgot password?
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

