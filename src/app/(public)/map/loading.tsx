import { Compass } from "lucide-react";

export default function PublicMapLoading() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-muted" />
          <div className="h-7 w-48 bg-muted rounded-md" />
        </div>
        <div className="h-4 w-96 max-w-full bg-muted/60 rounded-md" />
      </div>

      {/* Filter Toolbar skeleton */}
      <div className="h-16 bg-muted/40 rounded-xl border border-border" />

      {/* Toolbar & Legend row skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-36 bg-muted/60 rounded-md" />
        <div className="h-7 w-64 bg-muted/60 rounded-md" />
      </div>

      {/* Main Dual Area skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Side List skeleton */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 h-[480px] bg-muted/30 rounded-xl border border-border p-4 space-y-3">
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="h-28 bg-muted/50 rounded-lg" />
          <div className="h-28 bg-muted/50 rounded-lg" />
          <div className="h-28 bg-muted/50 rounded-lg" />
        </div>

        {/* Right Side Map skeleton */}
        <div className="lg:col-span-7 xl:col-span-8 h-[380px] sm:h-[480px] lg:h-[calc(100vh-270px)] bg-muted/30 rounded-xl border border-border flex flex-col items-center justify-center gap-3">
          <Compass className="size-8 text-muted-foreground animate-spin" aria-hidden="true" />
          <div className="h-4 w-40 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}
