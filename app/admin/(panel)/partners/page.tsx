import type { Metadata } from "next";
import Link from "next/link";
import { deletePartnerAction, savePartnerAction } from "@/app/actions/admin";
import { PartnerForm } from "@/components/admin/partner-form";
import { ConfirmButton } from "@/components/ui/client";
import { EmptyState, Notice, PartnerLogo, flashParams } from "@/components/ui/server";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PARTNER_TYPE_LABEL } from "@/lib/event-state";

export const metadata: Metadata = { title: "Partners" };

export default async function AdminPartners({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string; edit?: string }> }) {
  await requirePermission("partners.manage", "/admin/partners");
  const sp = await searchParams;
  const partners = await prisma.partner.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { events: true } } } });
  const editing = partners.find((p) => p.id === sp.edit);

  return (
    <div>
      <h1 className="text-3xl font-semibold leading-tight">Partners</h1>
      <p className="mb-8 text-muted">NGOs, companies, universities and community bodies you deliver events with.</p>
      <Notice {...flashParams(sp)} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-label="Partner list">
          {partners.length ? (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
              {partners.map((p) => (
                <li key={p.id} className="flex items-center gap-4 p-4">
                  <PartnerLogo name={p.name} logo={p.logo} size="size-12 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-muted">{PARTNER_TYPE_LABEL[p.type]} · {p._count.events} {p._count.events === 1 ? "event" : "events"}{p.contactPerson ? ` · ${p.contactPerson}` : ""}</p>
                  </div>
                  <Link href={`/admin/partners?edit=${p.id}`} className="btn-ghost btn-sm">Edit</Link>
                  <ConfirmButton action={deletePartnerAction} fields={{ partnerId: p.id }} label="Remove" title={`Remove ${p.name}?`} message="The partner will be removed from all events it is linked to. This can't be undone." confirmLabel="Remove partner" danger triggerClass="btn-ghost btn-sm !text-danger" />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="handshake" title="No partners yet">Add your first partner using the form.</EmptyState>
          )}
        </section>

        <section aria-label={editing ? "Edit partner" : "Add partner"} className="h-fit rounded-xl border border-line bg-white p-5">
          <h2 className="mb-4 font-display text-xl font-semibold">{editing ? `Edit ${editing.name}` : "Add a partner"}</h2>
          <PartnerForm
            key={editing?.id ?? "new"}
            editing={!!editing}
            action={savePartnerAction.bind(null, editing?.id ?? null)}
            values={{
              name: editing?.name ?? "", type: editing?.type ?? "NGO", logo: editing?.logo ?? "", description: editing?.description ?? "",
              website: editing?.website ?? "", contactPerson: editing?.contactPerson ?? "", contactEmail: editing?.contactEmail ?? "",
            }}
          />
        </section>
      </div>
    </div>
  );
}
