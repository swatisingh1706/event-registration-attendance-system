"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "@/app/actions/admin";
import { SubmitButton, useSubmit } from "@/components/ui/client";
import { Field, FormError } from "@/components/ui/server";
import { ImageField } from "./image-field";

type V = Record<string, string>;

export function SettingsForm({ v }: { v: V }) {
  const [s, action, busy] = useActionState(saveSettingsAction, {});
  const submit = useSubmit(action);
  const e = s.fieldErrors ?? {};
  const text = (name: string, label: string, opts: { hint?: string; type?: string; placeholder?: string } = {}) => (
    <Field label={label} name={name} errors={e[name]} hint={opts.hint}>
      <input id={name} name={name} type={opts.type ?? "text"} defaultValue={v[name] ?? ""} placeholder={opts.placeholder} className="input" aria-invalid={e[name] ? true : undefined} aria-describedby={`${name}-error ${name}-hint`} />
    </Field>
  );
  return (
    <form onSubmit={submit} className="space-y-10" noValidate>
      <FormError message={s.error} />
      {s.ok && <p role="status" className="rounded-lg bg-mint px-4 py-3 text-sm text-forest-dark">{s.message}</p>}

      <fieldset className="space-y-4">
        <legend className="mb-1 font-display text-xl font-semibold">Organisation</legend>
        {text("name", "Organisation name")}
        <div className="grid gap-4 sm:grid-cols-2">
          {text("shortName", "Short name", { hint: "Shown next to the logo." })}
          {text("ticketPrefix", "Ticket ID prefix", { hint: "Used in IDs like GBF-2026-00482. Existing tickets keep their old prefix." })}
        </div>
        {text("tagline", "Tagline / hero headline")}
        <Field label="Description" name="description" errors={e.description}>
          <textarea id="description" name="description" rows={4} defaultValue={v.description} className="input" />
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <ImageField name="logoUrl" label="Logo" defaultValue={v.logoUrl} shape="square" maxEdge={600} hint="Square image works best. Shown in the header and emails." />
          <ImageField name="heroImageUrl" label="Home page photo" defaultValue={v.heroImageUrl} hint="The large photo on the home page and sign-in pages." />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 font-display text-xl font-semibold">Check-in</legend>
        {text("checkInWindowHours", "Check-in window (hours)", { type: "number", hint: "Tickets can be scanned from this many hours before an event starts until this many hours after it ends. Use 0 to allow check-in at any time." })}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 font-display text-xl font-semibold">Brand colours</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary (forest)" name="primaryColor" errors={e.primaryColor} hint="Buttons, headings and the ticket header.">
            <div className="flex gap-2">
              <input id="primaryColor" name="primaryColor" defaultValue={v.primaryColor} className="input font-mono" aria-describedby="primaryColor-error primaryColor-hint" />
              <input type="color" aria-label="Pick primary colour" defaultValue={v.primaryColor} onChange={(ev) => ((document.getElementById("primaryColor") as HTMLInputElement).value = ev.target.value)} className="size-11 shrink-0 cursor-pointer rounded-lg border border-line bg-white p-1" />
            </div>
          </Field>
          <Field label="Accent (sage)" name="accentColor" errors={e.accentColor} hint="Soft backgrounds and highlights.">
            <div className="flex gap-2">
              <input id="accentColor" name="accentColor" defaultValue={v.accentColor} className="input font-mono" aria-describedby="accentColor-error accentColor-hint" />
              <input type="color" aria-label="Pick accent colour" defaultValue={v.accentColor} onChange={(ev) => ((document.getElementById("accentColor") as HTMLInputElement).value = ev.target.value)} className="size-11 shrink-0 cursor-pointer rounded-lg border border-line bg-white p-1" />
            </div>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 font-display text-xl font-semibold">Contact &amp; social</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("contactEmail", "Contact email", { type: "email" })}
          {text("contactPhone", "Contact phone", { type: "tel" })}
        </div>
        {text("address", "Address")}
        {text("website", "Website", { placeholder: "https://" })}
        <div className="grid gap-4 sm:grid-cols-2">
          {text("instagramUrl", "Instagram URL")}
          {text("linkedinUrl", "LinkedIn URL")}
          {text("facebookUrl", "Facebook URL")}
          {text("twitterUrl", "X / Twitter URL")}
        </div>
      </fieldset>

      <SubmitButton busy={busy} pending="Saving…" className="btn-primary">Save settings</SubmitButton>
    </form>
  );
}
