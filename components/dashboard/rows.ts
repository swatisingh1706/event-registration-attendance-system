import type { EventCategory } from "@prisma/client";
import { CATEGORY_LABEL } from "@/lib/event-state";

/** Turns category counts into chart rows. Lives outside the client chart module so server pages can call it. */
export function categoryRows(data: { category: EventCategory; count: number }[]) {
  return data.map((d) => ({ key: d.category, label: CATEGORY_LABEL[d.category], value: d.count }));
}
