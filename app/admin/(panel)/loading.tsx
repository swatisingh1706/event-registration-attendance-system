import { Skeleton } from "@/components/ui/server";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="space-y-8">
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-64 w-full" />
      <span className="sr-only">Loading participants and metrics…</span>
    </div>
  );
}
