import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

export default function ResetPassword() {
  const [, navigate] = useLocation();

  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = useMemo(() => {
    if (password.length < 6) return false;
    if (password !== confirmPassword) return false;
    return true;
  }, [password, confirmPassword]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!supabase) {
        if (!mounted) return;
        setError(
          "Supabase is not configured for this deployment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON (or VITE_SUPABASE_ANON_KEY) in Vercel, then redeploy."
        );
        setLoading(false);
        return;
      }

      // With detectSessionInUrl enabled, Supabase will parse recovery tokens
      // from the URL and establish a session for this tab.
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!mounted) return;

      if (sessionError) {
        setError("This reset link is invalid or expired. Request a new one.");
        setLoading(false);
        return;
      }

      if (!data.session) {
        setError("This reset link is invalid or expired. Request a new one.");
        setLoading(false);
        return;
      }

      setSessionReady(true);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const submit = async () => {
    if (!supabase) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setSuccess(true);

      // Sign out to force a clean sign-in with the new password.
      await supabase.auth.signOut().catch(() => undefined);
      setTimeout(() => navigate("/login"), 800);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Reset password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a new password for your account.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-4">
            {!sessionReady ? (
              <div className="space-y-3">
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}
                <Link
                  className="text-sm text-primary hover:underline"
                  href="/forgot-password"
                >
                  Request a new reset link
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>

                {success ? (
                  <p className="text-sm text-primary">
                    Password updated. Redirecting to sign in…
                  </p>
                ) : null}

                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}

                <Button
                  className="w-full"
                  disabled={!canSubmit || submitting}
                  onClick={submit}
                >
                  Update password
                </Button>
              </>
            )}

            <div className="text-sm text-muted-foreground">
              <Link className="text-primary hover:underline" href="/login">
                Back to sign in
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

