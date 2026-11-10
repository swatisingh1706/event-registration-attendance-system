"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { registerAction } from "@/app/actions/participant";
import { SubmitButton, useSubmit } from "@/components/ui/client";
import { Icon } from "@/components/ui/icons";
import { Field, FormError } from "@/components/ui/server";
import { ATTENDEE_ONLY, VOLUNTEER_INTERESTS } from "@/lib/event-state";

export function RegistrationForm({
  eventId,
  defaults,
}: {
  eventId: string;
  defaults: { fullName: string; email: string; phone: string; organization: string; city: string };
}) {
  const [state, action, busy] = useActionState(registerAction, {});
  const submit = useSubmit(action);
  const router = useRouter();
  const [mode, setMode] = useState<"attend" | "volunteer">("attend");
  useEffect(() => {
    if (state.redirectTo) router.push(state.redirectTo);
  }, [state.redirectTo, router]);
  const e = state.fieldErrors ?? {};
  const invalid = (k: string) => (e[k] ? true : undefined);

  const choice = (value: "attend" | "volunteer", title: string, body: string) => (
    <label
      className={`relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest ${
        mode === value ? "border-forest bg-mint" : "border-line-strong bg-white hover:border-forest/50"
      }`}
    >
      <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="sr-only" />
      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${mode === value ? "border-forest bg-forest text-white" : "border-line-strong"}`}>
        {mode === value && <Icon name="check" className="size-3" strokeWidth={3.5} />}
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{body}</span>
      </span>
    </label>
  );

  return (
    <form onSubmit={submit} className="space-y-10" noValidate>
      <input type="hidden" name="eventId" value={eventId} />
      <FormError message={state.error} />

      <fieldset className="space-y-5">
        <legend className="mb-1 font-display text-xl font-semibold">Your details</legend>
        <Field label="Full name" name="fullName" errors={e.fullName} required>
          <input id="fullName" name="fullName" defaultValue={defaults.fullName} autoComplete="name" required className="input" aria-invalid={invalid("fullName")} aria-describedby="fullName-error" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email" name="email" errors={e.email} required>
            <input id="email" name="email" type="email" defaultValue={defaults.email} autoComplete="email" required className="input" aria-invalid={invalid("email")} aria-describedby="email-error" />
          </Field>
          <Field label="Phone" name="phone" errors={e.phone} required hint="So organisers can reach you on the day.">
            <input id="phone" name="phone" type="tel" defaultValue={defaults.phone} autoComplete="tel" required className="input" aria-invalid={invalid("phone")} aria-describedby="phone-error phone-hint" />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Organization / Institution" name="organization" errors={e.organization}>
            <input id="organization" name="organization" defaultValue={defaults.organization} autoComplete="organization" className="input" />
          </Field>
          <Field label="City" name="city" errors={e.city}>
            <input id="city" name="city" defaultValue={defaults.city} autoComplete="address-level2" className="input" />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-4 font-display text-xl font-semibold">How would you like to take part?</legend>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
          {choice("attend", "I'm just attending", "Come along and join in on the day.")}
          {choice("volunteer", "I'd like to volunteer", "Help the team run it. Your hours are recorded after check-in.")}
        </div>
        {mode === "attend" ? (
          <input type="hidden" name="volunteerInterest" value={ATTENDEE_ONLY} />
        ) : (
          <div className="mt-4 animate-rise">
            <Field label="Where could you help?" name="volunteerInterest" errors={e.volunteerInterest}>
              <select id="volunteerInterest" name="volunteerInterest" defaultValue={VOLUNTEER_INTERESTS[0]} className="input">
                {VOLUNTEER_INTERESTS.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </fieldset>

      <div>
        <label className="flex items-start gap-3 rounded-xl bg-paper p-4 text-sm">
          <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]" aria-invalid={invalid("consent")} aria-describedby="consent-error" />
          <span>I agree that my details may be used to manage my registration and to contact me about this event, as described in the <a href="/privacy" target="_blank" rel="noopener" className="font-semibold text-forest underline">privacy policy</a>.</span>
        </label>
        {e.consent && (
          <p id="consent-error" role="alert" className="field-error">
            {e.consent[0]}
          </p>
        )}
      </div>

      <SubmitButton busy={busy} pending="Registering…" className="btn-primary btn-lg w-full sm:w-auto sm:px-10">
        Complete registration
      </SubmitButton>
    </form>
  );
}
