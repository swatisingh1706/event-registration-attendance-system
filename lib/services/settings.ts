import { cache } from "react";
import type { OrgSettings } from "@prisma/client";
import { prisma } from "@/lib/db";

const DEFAULTS = {
  id: "default",
  description:
    "GreenBridge Foundation brings neighbours, students, businesses and local bodies together to run practical, community-led initiatives — from clean-ups and tree plantations to digital-literacy classes and food drives.",
};

/** The NGO's configurable branding. Created on first read so the app never runs without it. */
export const getSettings = cache(async (): Promise<OrgSettings> => {
  const existing = await prisma.orgSettings.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  return prisma.orgSettings.upsert({ where: { id: "default" }, update: {}, create: DEFAULTS });
});
