import Link from "next/link";
import type { OrgSettings } from "@prisma/client";
import { Icon } from "@/components/ui/icons";

export function Logo({ settings, href = "/", light = false }: { settings: Pick<OrgSettings, "name" | "shortName" | "logoUrl">; href?: string; light?: boolean }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label={`${settings.name} home`}>
      {settings.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={settings.logoUrl} alt="" className="size-9 rounded-lg object-contain" />
      ) : (
        <span
          className={`grid size-9 place-items-center rounded-[10px] transition-transform duration-300 group-hover:-rotate-6 ${
            light ? "bg-white/15 text-white" : "bg-forest text-white"
          }`}
        >
          <Icon name="leaf" className="size-[1.15rem]" />
        </span>
      )}
      <span className={`font-display text-[1.2rem] font-semibold tracking-tight ${light ? "text-white" : "text-forest-deep"}`}>{settings.shortName}</span>
    </Link>
  );
}
