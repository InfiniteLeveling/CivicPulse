import { useState } from "react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SeverityBadge } from "@/components/common/SeverityBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STATUS_LABELS, SEVERITY_LABELS } from "@/lib/constants";
import type { ReportStatus, IssueSeverity } from "@/types/domain";
import { Panel } from "./Panel";

export function Indicators() {
  const [urgent, setUrgent] = useState(false);
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <div className="grid gap-5">
        <Panel title="Report status">
          <div className="flex flex-wrap gap-2">{(Object.keys(STATUS_LABELS) as ReportStatus[]).map((status) => <StatusBadge key={status} status={status} />)}</div>
        </Panel>
        <Panel title="Severity">
          <div className="flex flex-wrap gap-2">{(Object.keys(SEVERITY_LABELS) as IssueSeverity[]).map((severity) => <SeverityBadge key={severity} severity={severity} />)}</div>
          <div className="grid gap-2 border-t pt-4">
            <SeverityBadge severity="medium" source="ai" />
            <SeverityBadge severity="critical" source="admin" />
          </div>
        </Panel>
      </div>
      <Panel title="Priority">
        <Label className="min-h-11 cursor-pointer"><Checkbox checked={urgent} onCheckedChange={setUrgent} />Mark examples urgent</Label>
        <Table>
          <TableCaption>Sample values at each display boundary.</TableCaption>
          <TableHeader><TableRow><TableHead scope="col">Score</TableHead><TableHead scope="col">Indicator</TableHead></TableRow></TableHeader>
          <TableBody>{[0, 39, 40, 69, 70, 100, -1, 101, NaN].map((score) => (
            <TableRow key={String(score)}><TableCell className="tabular-nums">{String(score)}</TableCell>
              <TableCell className="whitespace-normal"><PriorityBadge score={score} urgent={urgent} /></TableCell></TableRow>
          ))}</TableBody>
        </Table>
      </Panel>
    </div>
  );
}
