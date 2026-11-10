import { CoverImage } from "@/components/ui/client";
import { getSettings } from "@/lib/services/settings";

/** Sign-in / sign-up frame: a photo panel on desktop, a focused form column everywhere. */
export async function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const s = await getSettings();
  return (
    <div className="grid min-h-[calc(100dvh-4.25rem)] md:grid-cols-[1fr_1.05fr]">
      <div className="relative hidden overflow-hidden md:block">
        <CoverImage src={s.heroImageUrl} alt="" seed={s.name} eager className="absolute inset-0 size-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/90 via-forest-deep/20 to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white lg:p-14">
          <p className="max-w-sm font-display text-3xl font-semibold leading-tight lg:text-4xl">{s.tagline}</p>
          <p className="mt-3 max-w-sm text-white/75">{s.name}</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md animate-rise">
          <h1 className="text-4xl font-semibold leading-[1.08]">{title}</h1>
          {subtitle && <p className="mt-3 text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <p className="mt-8 text-sm text-muted">{footer}</p>}
        </div>
      </div>
    </div>
  );
}
