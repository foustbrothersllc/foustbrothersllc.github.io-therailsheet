"use client";

import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // If the recovery link was already processed by the time this mounts,
    // there will already be a valid session — treat that as ready too.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      } else {
        // Give the URL-hash exchange a moment before deciding it's invalid.
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              setReady(true);
            } else {
              setInvalid(true);
            }
          });
        }, 1500);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passwordsMatch = password.length > 0 && password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="h-2 w-8 bg-amber rounded-full" />
            <span className="font-stencil text-xs tracking-[0.3em] text-yard-muted uppercase">
              Rail Sheet
            </span>
          </div>
          <h1 className="font-display text-3xl uppercase tracking-wide">Set New Password</h1>
        </div>

        {invalid && (
          <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-card px-3 py-3 text-center">
            This reset link is invalid or has expired. Request a new one from the sign-in page.
          </p>
        )}

        {!invalid && !done && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-yard-muted mb-1.5 uppercase tracking-wide">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                disabled={!ready}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 rounded-card bg-yard-panel border border-yard-border text-yard-text focus:border-amber outline-none disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-yard-muted mb-1.5 uppercase tracking-wide">
                Confirm Password
              </label>
              <input
                type="password"
                required
                disabled={!ready}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-12 px-4 rounded-card bg-yard-panel border border-yard-border text-yard-text focus:border-amber outline-none disabled:opacity-50"
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-danger mt-1">Passwords do not match.</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-card px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!ready}>
              {ready ? "Update Password" : "Verifying link…"}
            </Button>
          </form>
        )}

        {done && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-okay bg-okay/10 border border-okay/30 rounded-card px-3 py-3">
              Password updated. You can now sign in with your new password.
            </p>
            <Button onClick={() => (window.location.href = "/login")} className="w-full">
              Go to Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
