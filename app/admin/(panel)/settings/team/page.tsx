import type { Metadata } from "next";
import Link from "next/link";
import { changeRoleAction } from "@/app/actions/admin";
import { ResetPasswordForm } from "@/components/admin/reset-password";
import { Notice, flashParams } from "@/components/ui/server";
import { ActionForm, SubmitButton } from "@/components/ui/client";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/permissions";

export const metadata: Metadata = { title: "Team roles" };

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string; q?: string }> }) {
  const me = await requirePermission("users.manage", "/admin/settings/team");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const users = await prisma.user.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : { role: { not: "PARTICIPANT" } },
    orderBy: [{ role: "desc" }, { name: "asc" }],
    take: 50,
    select: { id: true, name: true, email: true, role: true },
  });
  return (
    <div className="max-w-3xl">
      <Link href="/admin/settings" className="text-sm font-semibold text-forest hover:underline">← Settings</Link>
      <h1 className="mb-2 mt-2 text-2xl font-semibold tracking-tight">Team roles</h1>
      <p className="mb-6 text-muted">Showing staff by default. Search by name or email to promote a participant.</p>
      <Notice {...flashParams(sp)} />
      <form method="get" role="search" className="mb-5 flex gap-2">
        <label htmlFor="q" className="sr-only">Search users</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search name or email" className="input" />
        <button className="btn-primary">Search</button>
      </form>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{u.name}</p>
              <p className="truncate text-sm text-muted">{u.email}</p>
            </div>
            {u.id === me.id ? (
              <span className="badge bg-mint text-forest-dark">{ROLE_LABEL[u.role]} (you)</span>
            ) : (
              <ActionForm action={changeRoleAction} className="flex items-center gap-2">
                <input type="hidden" name="userId" value={u.id} />
                <label htmlFor={`role-${u.id}`} className="sr-only">Role for {u.name}</label>
                <select id={`role-${u.id}`} name="role" defaultValue={u.role} className="input !min-h-9 !w-auto !py-1">
                  {Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <SubmitButton pending="Saving…" className="btn-secondary btn-sm">Update</SubmitButton>
              </ActionForm>
            )}
            {u.id !== me.id && <ResetPasswordForm userId={u.id} name={u.name} />}
          </li>
        ))}
        {!users.length && <li className="p-6 text-center text-muted">No users found.</li>}
      </ul>
    </div>
  );
}
