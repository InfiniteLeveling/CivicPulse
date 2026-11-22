"use client";

import { ErrorState } from "@/components/common/ErrorState";

export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <main className="page-shell">
      <h1>We couldn’t load this page</h1>
      <div className="mt-6"><ErrorState message="Try loading the page again." onRetry={reset} /></div>
    </main>
  );
}
