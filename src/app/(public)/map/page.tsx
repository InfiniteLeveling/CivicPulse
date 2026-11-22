import type { Metadata } from "next";
import { getPublicReports } from "@/lib/api/reports";
import { CivicMap } from "@/components/maps/CivicMap";

export const metadata: Metadata = {
  title: "Civic Issue Map | CivicPulse",
  description:
    "Explore publicly reported civic infrastructure issues on an interactive map. Track municipal resolution status and community concerns.",
};

export default async function PublicMapPage() {
  const result = await getPublicReports();

  return (
    <div className="w-full">
      <CivicMap
        initialReports={result.items}
        initialTotal={result.total}
        isDemoData={result.isDemoData}
      />
    </div>
  );
}
