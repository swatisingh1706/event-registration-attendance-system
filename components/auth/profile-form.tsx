"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions/participant";
import { SubmitButton, useSubmit } from "@/components/ui/client";
import { Field, FormError } from "@/components/ui/server";
import { VOLUNTEER_INTERESTS } from "@/lib/event-state";

type Props = {
  user: { name: string; email: string; phone: string | null; organization: string | null; city: string | null; image: string | null };
  interests: string[];
};

export function ProfileForm({ user, interests }: Props) {
  const [s, action, busy] = useActionState(updateProfileAction, {});
  const submit = useSubmit(action);
  const e = s.fieldErrors ?? {};
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <FormError message={s.error} />
      {s.ok && (
        <p role="status" className="rounded-lg bg-mint px-4 py-3 text-sm text-forest-dark">
          {s.message}
        </p>
      )}
      <Field label="Full name" name="name" errors={e.name} required>
        <input id="name" name="name" defaultValue={user.name} required autoComplete="name" className="input" aria-describedby="name-error" aria-invalid={e.name ? true : undefined} />
      </Field>
      <Field label="Email" name="email" hint="Your email is your login and can't be changed here.">
        <input id="email" value={user.email} readOnly className="input bg-mint/50" aria-describedby="email-hint" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Phone" name="phone" errors={e.phone}>
          <input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} autoComplete="tel" className="input" aria-describedby="phone-error" aria-invalid={e.phone ? true : undefined} />
        </Field>
        <Field label="City" name="city" errors={e.city}>
          <input id="city" name="city" defaultValue={user.city ?? ""} autoComplete="address-level2" className="input" />
        </Field>
      </div>
      <Field label="Organization / Institution" name="organization" errors={e.organization}>
        <input id="organization" name="organization" defaultValue={user.organization ?? ""} autoComplete="organization" className="input" />
      </Field>
      <Field label="Profile image URL (optional)" name="image" errors={e.image}>
        <input id="image" name="image" type="url" defaultValue={user.image ?? ""} className="input" aria-describedby="image-error" aria-invalid={e.image ? true : undefined} />
      </Field>

      <fieldset>
        <legend className="label">Volunteer interests</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {VOLUNTEER_INTERESTS.map((v) => (
            <label key={v} className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-white px-3 text-sm">
              <input type="checkbox" name="interests" value={v} defaultChecked={interests.includes(v)} className="size-5 accent-[var(--brand)]" />
              {v}
            </label>
          ))}
        </div>
      </fieldset>

      <SubmitButton busy={busy} pending="Saving…" className="btn-primary">Save profile</SubmitButton>
    </form>
  );
}
