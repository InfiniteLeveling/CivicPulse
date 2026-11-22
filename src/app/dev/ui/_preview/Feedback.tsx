import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { StatCard } from "@/components/common/StatCard";
import { InteractiveCard } from "@/components/common/InteractiveCard";
import { BrandLogo } from "@/components/common/BrandLogo";
import { ROUTES } from "@/lib/constants";
import { Panel } from "./Panel";

export function Feedback() {
  const [retries, setRetries] = useState(0);
  const [example, setExample] = useState(false);
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Panel title="Feedback states">
        {example ? <Alert role="status"><AlertDescription>One preview item added.</AlertDescription><Button variant="link" onClick={() => setExample(false)}>Remove example</Button></Alert> :
          <EmptyState title="No example items" description="Add an item to leave the empty state."
            action={<Button variant="outline" onClick={() => setExample(true)}>Add example</Button>} />}
        <ErrorState message="Example could not load" guidance="Retry to exercise the callback in this preview." onRetry={() => setRetries((n) => n + 1)} />
        <StatCard label="Preview retries" value={retries} icon={RotateCcw} />
        <InteractiveCard href={ROUTES.home} title="Open homepage" description="Try the full-card link with a pointer or keyboard." />
      </Panel>
      <Panel title="Loading states">
        <LoadingState label="Loading example…" />
        <LoadingState variant="card" label="Loading card…" />
        <LoadingState variant="list" label="Loading list…" />
      </Panel>
      <Panel title="Brand"><BrandLogo showTagline /><div className="rounded-md bg-foreground p-4"><BrandLogo compact inverse /></div></Panel>
    </div>
  );
}
