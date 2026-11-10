"use client";

import { useActionState } from "react";
import { changePasswordAction, deleteAccountAction } from "@/app/actions/participant";
import { confirmEmailAction, resendVerificationAction } from "@/app/actions/auth";
import { SubmitButton, useSubmit } from "@/components/ui/client";
import { Icon } from "@/components/ui/icons";
import { Field, FormError } from "@/components/ui/server";

export function ChangePasswordForm() {
  const [s, action, busy] = useActionState(changePasswordAction, {});
  const submit = useSubmit((fd) => {
    action(fd);
  });
  const e = s.fieldErrors ?? {};
  return (
    <form
      onSubmit={(ev) => {
        submit(ev);
        // Clear the fields after sending so passwords don't linger on screen.
        const form = ev.currentTarget;
        setTimeout(() => form.reset(), 0);
      }}
      className="space-y-4"
      noValidate
    >
      <FormError message={s.error} />
      {s.ok && <p role="status" className="rounded-lg bg-mint px-4 py-3 text-sm text-forest-dark">{s.message}</p>}
      <Field label="Current password" name="currentPassword" errors={e.currentPassword}>
        <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required className="input" aria-describedby="currentPassword-error" aria-invalid={e.currentPassword ? true : undefined} />
      </Field>
      <Field label="New password" name="newPassword" errors={e.newPassword} hint="At least 8 characters, with a letter and a number.">
        <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={8} className="input" aria-describedby="newPassword-error newPassword-hint" aria-invalid={e.newPassword ? true : undefined} />
      </Field>
      <SubmitButton busy={busy} pending="Updating…" className="btn-secondary">Change password</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [s, action, busy] = useActionState(deleteAccountAction, {});
  const submit = useSubmit(action);
  return (
    <details className="rounded-xl border border-danger/25 bg-white">
      <summary className="flex min-h-12 cursor-pointer items-center px-5 font-semibold text-danger">Delete my account</summary>
      <form onSubmit={submit} className="space-y-4 border-t border-danger/15 p-5" noValidate>
        <p className="text-sm text-muted">
          This permanently deletes your profile, your registrations and your tickets. It can&apos;t be undone. Seats you hold are released for other people.
        </p>
        <FormError message={s.error} />
        <Field label="Confirm with your password" name="password">
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </Field>
        <SubmitButton busy={busy} pending="Deleting…" className="btn-danger">Permanently delete my account</SubmitButton>
      </form>
    </details>
  );
}

/** Shown when the site sends email and this address hasn't been confirmed yet. */
export function VerifyBanner({ email }: { email: string }) {
  const [s, action, busy] = useActionState(resendVerificationAction, {});
  const submit = useSubmit(() => action());
  return (
    <div role="status" className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-amber/30 bg-amber-soft px-5 py-4 text-sm">
      <Icon name="warn" className="size-5 shrink-0 text-amber" />
      <p className="min-w-0 flex-1 text-amber">
        {s.ok ? <strong>{s.message}</strong> : s.error ? <strong>{s.error}</strong> : <><strong>Confirm your email to register for events.</strong> We sent a link to {email}.</>}
      </p>
      {!s.ok && (
        <form onSubmit={submit}>
          <SubmitButton busy={busy} pending="Sending…" className="btn-secondary btn-sm">Resend email</SubmitButton>
        </form>
      )}
    </div>
  );
}

export function ConfirmEmailForm({ token }: { token: string }) {
  const [s, action, busy] = useActionState(confirmEmailAction, {});
  const submit = useSubmit(action);
  if (s.ok) return <p role="status" className="rounded-xl bg-mint p-5 text-forest-dark">{s.message}</p>;
  return (
    <form onSubmit={submit} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormError message={s.error} />
      <SubmitButton busy={busy} pending="Confirming…" className="btn-primary btn-lg">Confirm my email</SubmitButton>
    </form>
  );
}
