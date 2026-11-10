"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { forgotPasswordAction, loginAction, resetPasswordAction, signupAction } from "@/app/actions/auth";
import { SubmitButton, useSubmit } from "@/components/ui/client";
import { Field, FormError } from "@/components/ui/server";
import type { ActionState } from "@/lib/validation";

const inv = (s: ActionState, k: string) => (s.fieldErrors?.[k] ? true : undefined);

export function LoginForm({ next, audience = "participant" }: { next?: string; audience?: "participant" | "staff" }) {
  const [s, action, busy] = useActionState(loginAction, {});
  const submit = useSubmit(action);
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <input type="hidden" name="audience" value={audience} />
      <FormError message={s.error} />
      <Field label="Email" name="email" errors={s.fieldErrors?.email}>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" aria-invalid={inv(s, "email")} aria-describedby="email-error" />
      </Field>
      <Field label="Password" name="password" errors={s.fieldErrors?.password}>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" aria-invalid={inv(s, "password")} aria-describedby="password-error" />
      </Field>
      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="-my-2 inline-flex min-h-11 items-center font-semibold text-forest hover:underline">Forgot password?</Link>
      </div>
      <SubmitButton busy={busy} pending="Signing in…" className="btn-primary w-full">{audience === "staff" ? "Sign in to staff area" : "Log in"}</SubmitButton>
    </form>
  );
}

export function SignupForm({ next }: { next?: string }) {
  const [s, action, busy] = useActionState(signupAction, {});
  const submit = useSubmit(action);
  // Bot trap: the timestamp is set on the client after the form is shown; "homepage" is a field only scripts fill in.
  const [ts, setTs] = useState(0);
  useEffect(() => setTs(Date.now()), []);
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <input type="hidden" name="ts" value={ts} />
      <div aria-hidden="true" className="absolute -left-[9999px] size-0 overflow-hidden">
        <label>Leave this field empty<input name="homepage" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <FormError message={s.error} />
      <Field label="Full name" name="name" errors={s.fieldErrors?.name}>
        <input id="name" name="name" autoComplete="name" required className="input" aria-invalid={inv(s, "name")} aria-describedby="name-error" />
      </Field>
      <Field label="Email" name="email" errors={s.fieldErrors?.email}>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" aria-invalid={inv(s, "email")} aria-describedby="email-error" />
      </Field>
      <Field label="Phone (optional)" name="phone" errors={s.fieldErrors?.phone}>
        <input id="phone" name="phone" type="tel" autoComplete="tel" className="input" aria-invalid={inv(s, "phone")} aria-describedby="phone-error" />
      </Field>
      <Field label="Password" name="password" errors={s.fieldErrors?.password} hint="At least 8 characters, with a letter and a number.">
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="input" aria-invalid={inv(s, "password")} aria-describedby="password-error password-hint" />
      </Field>
      <p className="text-sm text-muted">By creating an account you agree to the <a href="/terms" target="_blank" rel="noopener" className="font-semibold text-forest underline">terms</a> and <a href="/privacy" target="_blank" rel="noopener" className="font-semibold text-forest underline">privacy policy</a>.</p>
      <SubmitButton busy={busy} pending="Creating your account…" className="btn-primary w-full">Create account</SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [s, action, busy] = useActionState(forgotPasswordAction, {});
  const submit = useSubmit(action);
  if (s.ok) {
    return (
      <div role="status" className="rounded-xl bg-mint p-5 text-forest-dark">
        {s.message}
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <FormError message={s.error} />
      <Field label="Email" name="email" errors={s.fieldErrors?.email}>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" aria-invalid={inv(s, "email")} aria-describedby="email-error" />
      </Field>
      <SubmitButton busy={busy} pending="Sending…" className="btn-primary w-full">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [s, action, busy] = useActionState(resetPasswordAction, {});
  const submit = useSubmit(action);
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormError message={s.error} />
      <Field label="New password" name="password" errors={s.fieldErrors?.password} hint="At least 8 characters, with a letter and a number.">
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="input" aria-invalid={inv(s, "password")} aria-describedby="password-error password-hint" />
      </Field>
      <SubmitButton busy={busy} pending="Saving…" className="btn-primary w-full">Set new password</SubmitButton>
    </form>
  );
}
