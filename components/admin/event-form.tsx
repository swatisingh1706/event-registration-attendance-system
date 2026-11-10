"use client";

import { useActionState, useEffect, useState } from "react";
import { CoverImage, SubmitButton, useSubmit } from "@/components/ui/client";
import { Icon } from "@/components/ui/icons";
import { ImageField } from "./image-field";
import { Field, FormError } from "@/components/ui/server";
import { CATEGORY_LABEL, STATUS_LABEL } from "@/lib/event-state";
import type { ActionState } from "@/lib/validation";

export type EventFormValues = {
  title: string;
  description: string;
  coverImage: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  address: string;
  capacity: number;
  registrationDeadline: string;
  status: string;
  organizer: string;
  contactEmail: string;
  contactPhone: string;
  volunteerRequirements: string;
  agenda: { time: string; title: string; description?: string }[];
  partnerIds: string[];
  sdgIds: string[];
};

type Props = {
  mode: "create" | "edit";
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  values: EventFormValues;
  partners: { id: string; name: string }[];
  sdgs: { id: string; number: number; title: string }[];
};

export function EventForm({ mode, action: serverAction, values: v, partners, sdgs }: Props) {
  const [s, action, busy] = useActionState(serverAction, {});
  const submit = useSubmit(action);
  // The action returns where to go. A full navigation is used (not router.push / server redirect()) because soft
  // navigations to the admin lists proved intermittently unreliable, and this also guarantees fresh data + banner.
  useEffect(() => {
    if (s.redirectTo) window.location.assign(s.redirectTo);
  }, [s.redirectTo]);
  const [agenda, setAgenda] = useState(v.agenda.length ? v.agenda : []);
  const [cover, setCover] = useState(v.coverImage);
  const e = s.fieldErrors ?? {};
  const inv = (k: string) => (e[k] ? true : undefined);
  const isDraft = v.status === "DRAFT";

  return (
    <form onSubmit={submit} className="space-y-10" noValidate>
      <input type="hidden" name="agenda" value={JSON.stringify(agenda.filter((a) => a.title.trim()))} />
      <FormError message={s.error} />

      <fieldset className="space-y-5">
        <legend className="mb-1 font-display text-xl font-semibold">Basics</legend>
        <Field label="Title" name="title" errors={e.title} required>
          <input id="title" name="title" defaultValue={v.title} required maxLength={120} className="input" aria-invalid={inv("title")} aria-describedby="title-error" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category" name="category" errors={e.category} required>
            <select id="category" name="category" defaultValue={v.category} className="input">
              {Object.entries(CATEGORY_LABEL).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Organizer" name="organizer" errors={e.organizer} required>
            <input id="organizer" name="organizer" defaultValue={v.organizer} required className="input" aria-invalid={inv("organizer")} aria-describedby="organizer-error" />
          </Field>
        </div>
        <Field label="Description" name="description" errors={e.description} required hint="Separate paragraphs with a blank line.">
          <textarea id="description" name="description" rows={7} defaultValue={v.description} required className="input" aria-invalid={inv("description")} aria-describedby="description-error description-hint" />
        </Field>
        <ImageField name="coverImage" label="Cover image" defaultValue={v.coverImage} hint="Shown on the event card and at the top of the event page. A wide photo works best." />
        {e.coverImage && <p role="alert" className="field-error">{e.coverImage[0]}</p>}
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-1 font-display text-xl font-semibold">When &amp; where</legend>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Date" name="date" errors={e.date} required>
            <input id="date" name="date" type="date" defaultValue={v.date} required className="input" aria-invalid={inv("date")} aria-describedby="date-error" />
          </Field>
          <Field label="Start time" name="startTime" errors={e.startTime} required>
            <input id="startTime" name="startTime" type="time" defaultValue={v.startTime} required className="input" aria-invalid={inv("startTime")} aria-describedby="startTime-error" />
          </Field>
          <Field label="End time" name="endTime" errors={e.endTime} required>
            <input id="endTime" name="endTime" type="time" defaultValue={v.endTime} required className="input" aria-invalid={inv("endTime")} aria-describedby="endTime-error" />
          </Field>
        </div>
        <Field label="Location" name="location" errors={e.location} required>
          <input id="location" name="location" defaultValue={v.location} required className="input" aria-invalid={inv("location")} aria-describedby="location-error" />
        </Field>
        <Field label="Address" name="address" errors={e.address}>
          <input id="address" name="address" defaultValue={v.address} className="input" />
        </Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-1 font-display text-xl font-semibold">Registration</legend>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Capacity" name="capacity" errors={e.capacity} required>
            <input id="capacity" name="capacity" type="number" min={1} defaultValue={v.capacity} required className="input" aria-invalid={inv("capacity")} aria-describedby="capacity-error" />
          </Field>
          <Field label="Registration deadline" name="registrationDeadline" errors={e.registrationDeadline} hint="Optional.">
            <input id="registrationDeadline" name="registrationDeadline" type="datetime-local" defaultValue={v.registrationDeadline} className="input" aria-invalid={inv("registrationDeadline")} aria-describedby="registrationDeadline-error registrationDeadline-hint" />
          </Field>
          {mode === "edit" && (
            <Field label="Status" name="status" errors={e.status}>
              <select id="status" name="status" defaultValue={v.status} className="input">
                {Object.entries(STATUS_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Contact email" name="contactEmail" errors={e.contactEmail}>
            <input id="contactEmail" name="contactEmail" type="email" defaultValue={v.contactEmail} className="input" aria-invalid={inv("contactEmail")} aria-describedby="contactEmail-error" />
          </Field>
          <Field label="Contact phone" name="contactPhone" errors={e.contactPhone}>
            <input id="contactPhone" name="contactPhone" type="tel" defaultValue={v.contactPhone} className="input" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 font-display text-xl font-semibold">Agenda</legend>
        {agenda.map((a, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
            <input aria-label={`Agenda item ${i + 1} time`} placeholder="7:30 AM" value={a.time} onChange={(ev) => setAgenda(agenda.map((x, j) => (j === i ? { ...x, time: ev.target.value } : x)))} className="input" />
            <input aria-label={`Agenda item ${i + 1} title`} placeholder="What happens" value={a.title} onChange={(ev) => setAgenda(agenda.map((x, j) => (j === i ? { ...x, title: ev.target.value } : x)))} className="input" />
            <button type="button" className="btn-ghost btn-sm" aria-label={`Remove agenda item ${i + 1}`} onClick={() => setAgenda(agenda.filter((_, j) => j !== i))}>
              <Icon name="x" className="size-4" />
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary btn-sm" onClick={() => setAgenda([...agenda, { time: "", title: "" }])}>
          <Icon name="plus" className="size-4" /> Add agenda item
        </button>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-1 font-display text-xl font-semibold">Volunteers</legend>
        <Field label="Volunteer requirements" name="volunteerRequirements" errors={e.volunteerRequirements} hint="Roles and numbers you need. Leave blank if none.">
          <textarea id="volunteerRequirements" name="volunteerRequirements" rows={3} defaultValue={v.volunteerRequirements} className="input" aria-describedby="volunteerRequirements-hint" />
        </Field>
      </fieldset>

      <fieldset>
        <legend className="mb-3 font-display text-xl font-semibold">Partners</legend>
        {partners.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {partners.map((p) => (
              <label key={p.id} className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-white px-3 text-sm">
                <input type="checkbox" name="partnerIds" value={p.id} defaultChecked={v.partnerIds.includes(p.id)} className="size-5 accent-[var(--brand)]" />
                {p.name}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No partners yet. Add some under Partners.</p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-1 font-display text-xl font-semibold">Sustainable Development Goals</legend>
        <p className="mb-3 text-sm text-muted">SDG 17 (Partnerships for the Goals) fits any event delivered with partners.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {sdgs.map((g) => (
            <label key={g.id} className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm ${g.number === 17 ? "border-forest/40 bg-mint" : "border-line bg-white"}`}>
              <input type="checkbox" name="sdgIds" value={g.id} defaultChecked={v.sdgIds.includes(g.id)} className="size-5 accent-[var(--brand)]" />
              <span><span className="font-semibold">SDG {g.number}</span> · {g.title}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-white/95 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        {mode === "create" ? (
          <>
            <SubmitButton busy={busy} name="intent" value="draft" pending="Saving…" className="btn-secondary">Save Draft</SubmitButton>
            <SubmitButton busy={busy} name="intent" value="publish" pending="Creating event…" className="btn-primary">Publish Event</SubmitButton>
            <span className="basis-full text-xs text-muted sm:basis-auto">Draft stays private to admins. Publish makes it visible to everyone on the public site right away.</span>
          </>
        ) : (
          <>
            <SubmitButton busy={busy} name="intent" value="save" pending="Saving…" className="btn-primary">Save changes</SubmitButton>
            {isDraft && <SubmitButton busy={busy} name="intent" value="publish" pending="Publishing…" className="btn-secondary">Publish Event</SubmitButton>}
          </>
        )}
      </div>
    </form>
  );
}
