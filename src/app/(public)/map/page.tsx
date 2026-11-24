import type { Metadata } from "next";
import { getPublicReportsServerData } from "@/lib/reports/server-queries";
import { CivicMap } from "@/components/maps/CivicMap";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Civic Issue Map | CivicPulse",
  description:
    "Explore publicly reported civic infrastructure issues on an interactive map. Track municipal resolution status and community concerns.",
};

export default async function PublicMapPage() {
  const result = await getPublicReportsServerData();

  return (
    <div className="w-full">
      <CivicMap
        initialReports={result.items}
        initialTotal={result.total}
        isDemoData={false}
      />
    </div>
  );
}
