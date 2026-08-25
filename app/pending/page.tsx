"use client";

import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function PendingPage() {
  const supabase = createClient();
  const [showTroubleForm, setShowTroubleForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // If a poll finds the account has since been approved, bounce to the dashboard.
  useEffect(() => {
    const interval = setInterval(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("id", user.id)
        .single();

      if (data?.is_approved) {
        window.location.href = "/dashboard";
      }
    }, 15000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTroubleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.from("signup_problems").insert({
      name,
      email,
      employee_id: employeeId || null,
      message,
    });

    setSubmitting(false);
    if (!error) {
      setSubmitted(true);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="h-2 w-8 bg-amber rounded-full" />
          <span className="font-stencil text-xs tracking-[0.3em] text-yard-muted uppercase">
            Rail Sheet
          </span>
        </div>

        <div className="h-16 w-16 rounded-full bg-amber/10 border border-amber/30 flex items-center justify-center mx-auto mb-5">
          <span className="h-3 w-3 rounded-full bg-amber animate-pulseSlow" />
        </div>

        <h1 className="font-display text-2xl uppercase tracking-wide mb-2">
          Pending Approval
        </h1>
        <p className="text-yard-muted text-sm mb-8">
          An admin needs to approve your account before you can access the yard
          board. This page will move you along automatically once that happens.
        </p>

        {!showTroubleForm && !submitted && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowTroubleForm(true)}
              className="text-sm text-amber hover:underline"
            >
              Having trouble?
            </button>
            <Button variant="secondary" onClick={handleLogout} className="w-full">
              Back to Login
            </Button>
          </div>
        )}

        {showTroubleForm && !submitted && (
          <form onSubmit={handleTroubleSubmit} className="text-left space-y-3 mt-4">
            <input
              placeholder="Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-4 rounded-card bg-yard-panel border border-yard-border text-sm focus:border-amber outline-none"
            />
            <input
              placeholder="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-4 rounded-card bg-yard-panel border border-yard-border text-sm focus:border-amber outline-none"
            />
            <input
              placeholder="Employee ID (if you have one)"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full h-11 px-4 rounded-card bg-yard-panel border border-yard-border text-sm focus:border-amber outline-none"
            />
            <textarea
              placeholder="What's going on?"
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 rounded-card bg-yard-panel border border-yard-border text-sm focus:border-amber outline-none resize-none"
            />
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowTroubleForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" loading={submitting}>
                Submit
              </Button>
            </div>
          </form>
        )}

        {submitted && (
          <div className="space-y-3">
            <p className="text-sm text-okay bg-okay/10 border border-okay/30 rounded-card px-3 py-3 mt-4">
              Thanks — an admin will follow up.
            </p>
            <Button variant="secondary" onClick={handleLogout} className="w-full">
              Back to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
