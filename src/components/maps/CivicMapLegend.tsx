export function CivicMapLegend() {
  return (
    <div
      role="region"
      aria-label="Map status legend"
      className="inline-flex flex-wrap items-center gap-3 sm:gap-4 px-3 py-1.5 rounded-lg bg-card/95 backdrop-blur-xs border border-border text-xs text-muted-foreground shadow-xs"
    >
      <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
        Legend:
      </span>

      <div className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-950" />
        <span>Pending Review</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200 dark:ring-blue-950" />
        <span>In Progress</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200 dark:ring-emerald-950" />
        <span>Resolved</span>
      </div>

      <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
        <span className="size-2.5 rounded-full bg-red-600 ring-2 ring-red-200 dark:ring-red-950" />
        <span className="font-medium">Critical</span>
      </div>
    </div>
  );
}
