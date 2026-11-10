"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { SubmitButton, useSubmit } from "@/components/ui/client";
import { Field, FormError } from "@/components/ui/server";
import { ImageField } from "./image-field";
import { PARTNER_TYPE_LABEL } from "@/lib/event-state";
import type { ActionState } from "@/lib/validation";

type Values = { name: string; type: string; logo: string; description: string; website: string; contactPerson: string; contactEmail: string };

export function PartnerForm({ action: serverAction, values: v, editing }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; values: Values; editing: boolean }) {
  const [s, action, busy] = useActionState(serverAction, {});
  const submit = useSubmit(action);
  // Full navigation so the list and the confirmation banner are always fresh (same-page soft redirects can go stale).
  useEffect(() => {
    if (s.redirectTo) window.location.assign(s.redirectTo);
  }, [s.redirectTo]);
  const e = s.fieldErrors ?? {};
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <FormError message={s.error} />
      <Field label="Name" name="name" errors={e.name} required>
        <input id="name" name="name" defaultValue={v.name} required className="input" aria-describedby="name-error" aria-invalid={e.name ? true : undefined} />
      </Field>
      <Field label="Partnership type" name="type" errors={e.type}>
        <select id="type" name="type" defaultValue={v.type} className="input">
          {Object.entries(PARTNER_TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </Field>
      <ImageField name="logo" label="Logo" defaultValue={v.logo} shape="square" maxEdge={600} hint="Optional. A monogram is shown when there is no logo." />
      {e.logo && <p role="alert" className="field-error">{e.logo[0]}</p>}
      <Field label="Description" name="description" errors={e.description}>
        <textarea id="description" name="description" rows={3} defaultValue={v.description} className="input" />
      </Field>
      <Field label="Website" name="website" errors={e.website}>
        <input id="website" name="website" type="url" defaultValue={v.website} placeholder="https://" className="input" aria-describedby="website-error" aria-invalid={e.website ? true : undefined} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact person" name="contactPerson" errors={e.contactPerson}>
          <input id="contactPerson" name="contactPerson" defaultValue={v.contactPerson} className="input" />
        </Field>
        <Field label="Contact email" name="contactEmail" errors={e.contactEmail}>
          <input id="contactEmail" name="contactEmail" type="email" defaultValue={v.contactEmail} className="input" aria-describedby="contactEmail-error" aria-invalid={e.contactEmail ? true : undefined} />
        </Field>
      </div>
      <div className="flex gap-2">
        <SubmitButton busy={busy} pending="Saving…" className="btn-primary">{editing ? "Save partner" : "Add partner"}</SubmitButton>
        {editing && <Link href="/admin/partners" className="btn-ghost">Cancel</Link>}
      </div>
    </form>
  );
}
