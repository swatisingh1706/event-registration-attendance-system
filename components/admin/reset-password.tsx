"use client";

import { useActionState } from "react";
import { resetUserPasswordAction } from "@/app/actions/admin";
import { CopyButton, SubmitButton, useSubmit } from "@/components/ui/client";

/** Super-admin tool: issue a one-time temporary password (for people who can't use the email reset). */
export function ResetPasswordForm({ userId, name }: { userId: string; name: string }) {
  const [s, action, busy] = useActionState(resetUserPasswordAction, {});
  const submit = useSubmit(action);
  return (
    <details className="w-full basis-full">
      <summary className="-my-1 inline-flex min-h-10 cursor-pointer list-none items-center text-sm font-semibold text-forest hover:underline [&::-webkit-details-marker]:hidden">
        Reset password…
      </summary>
      <div className="mt-2 rounded-xl bg-paper p-4 text-sm">
        {s.ok ? (
          <div role="status" className="space-y-2">
            <p className="font-semibold">Temporary password for {name}</p>
            <p className="flex flex-wrap items-center gap-3">
              <code className="rounded-md bg-white px-3 py-1.5 font-mono text-base ring-1 ring-line-strong">{s.message}</code>
              <CopyButton text={s.message ?? ""} />
            </p>
            <p className="text-muted">Share it privately. It is shown only once, and they&apos;ve been signed out everywhere. Ask them to change it under Profile → Password after signing in.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input type="hidden" name="userId" value={userId} />
            <p className="text-muted">This sets a new random password for {name} and signs them out of every device.</p>
            {s.error && <p role="alert" className="field-error">{s.error}</p>}
            <SubmitButton busy={busy} pending="Generating…" className="btn-secondary btn-sm">Generate temporary password</SubmitButton>
          </form>
        )}
      </div>
    </details>
  );
}
