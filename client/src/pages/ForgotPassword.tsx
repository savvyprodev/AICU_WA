import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useMemo, useState } from "react";
import { Link } from "wouter";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const canSubmit = useMemo(() => email.trim().length > 0, [email]);

  const submit = async () => {
    if (!supabase) {
      setError(
        "Supabase is not configured for this deployment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON (or VITE_SUPABASE_ANON_KEY) in Vercel, then redeploy."
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    setSent(false);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo }
      );
      if (resetError) throw resetError;
      setSent(true);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Failed to send reset email");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Forgot password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email and we’ll send you a reset link.
          </p>
        </div>

        <div className="space-y-4">
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

          {sent ? (
            <p className="text-sm text-primary">
              If an account exists for that email, a reset link has been sent.
            </p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            className="w-full"
            disabled={!canSubmit || submitting}
            onClick={submit}
          >
            Send reset link
          </Button>

          <div className="text-sm text-muted-foreground">
            <Link className="text-primary hover:underline" href="/login">
              Back to sign in
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

