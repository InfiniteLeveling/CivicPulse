import type { ComplaintSummary } from "@/types/domain";

type PreviewReport = Pick<ComplaintSummary, "reference" | "title" | "category" | "status"> & {
  location: string;
  department: string;
};

// Synthetic, public-facing examples shared by the illustration and portal previews.
export const demoReports = [
  { reference: "CP-1042", title: "Pothole at the crossing", category: "pothole", status: "in_progress",
    location: "Market Street", department: "Road maintenance" },
  { reference: "CP-1043", title: "Streetlight needs repair", category: "streetlight", status: "pending",
    location: "Canal Walk", department: "Electrical services" },
  { reference: "CP-1041", title: "Leaking park tap", category: "water_leakage", status: "resolved",
    location: "Garden Square", department: "Water services" },
] as const satisfies readonly PreviewReport[];
