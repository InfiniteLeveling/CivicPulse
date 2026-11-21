import type {
  ComplaintDetails,
  ComplaintSummary,
  GetMyReportsParams,
  StatusHistory,
} from "@/types/domain";

const CATEGORY_NAMES: Record<string, string> = {
  pothole: "Pothole",
  garbage: "Garbage",
  water_leakage: "Water leakage",
  streetlight: "Streetlight",
  drainage: "Drainage",
  other: "Other",
};

/**
 * Realistic demonstration/fixture dataset for personal complaints history.
 * Explicitly labeled as mock data until backend REST endpoints are provisioned.
 */
export const mockMyReports: ComplaintSummary[] = [
  {
    id: "rep-2001",
    reference: "CP-2001",
    title: "Deep pothole at main campus crossing",
    description: "Substantial asphalt breakdown posing severe hazard to cyclists and two-wheelers.",
    category: "pothole",
    severity: "high",
    severityReviewed: true,
    status: "in_progress",
    visibility: "public",
    latitude: 12.9716,
    longitude: 77.5946,
    department: { id: "dept-1", name: "Road Maintenance" },
    supportCount: 7,
    priority: {
      score: 71,
      severityPoints: 50,
      supportPoints: 20,
      agePoints: 1,
      urgent: true,
    },
    createdAt: "2026-11-19T14:30:00.000Z",
    updatedAt: "2026-11-20T08:00:00.000Z",
    resolvedAt: null,
    imageUrl: "/images/pothole-sample.webp",
    viewerHasSupported: true,
  },
  {
    id: "rep-2002",
    reference: "CP-2002",
    title: "Unlit lamp post along canal walkway",
    description: "Streetlight fixture fails after sunset creating dark unmonitored zone on pedestrian pathway.",
    category: "streetlight",
    severity: "medium",
    severityReviewed: false,
    status: "pending",
    visibility: "public",
    latitude: 12.9722,
    longitude: 77.5951,
    department: { id: "dept-2", name: "Electrical Services" },
    supportCount: 2,
    priority: {
      score: 36,
      severityPoints: 30,
      supportPoints: 6,
      agePoints: 0,
      urgent: false,
    },
    createdAt: "2026-11-20T18:15:00.000Z",
    updatedAt: "2026-11-20T18:15:00.000Z",
    resolvedAt: null,
    imageUrl: null,
    viewerHasSupported: false,
  },
  {
    id: "rep-2003",
    reference: "CP-2003",
    title: "Overflowing community waste container",
    description: "Bin collection missed for several days, refuse spilling onto residential walkway.",
    category: "garbage",
    severity: "low",
    severityReviewed: true,
    status: "resolved",
    visibility: "public",
    latitude: 12.9705,
    longitude: 77.5938,
    department: { id: "dept-3", name: "Sanitation Dept" },
    supportCount: 4,
    priority: {
      score: 27,
      severityPoints: 15,
      supportPoints: 12,
      agePoints: 0,
      urgent: false,
    },
    createdAt: "2026-11-16T09:00:00.000Z",
    updatedAt: "2026-11-18T16:20:00.000Z",
    resolvedAt: "2026-11-18T16:20:00.000Z",
    imageUrl: null,
    viewerHasSupported: true,
  },
  {
    id: "rep-2004",
    reference: "CP-2004",
    title: "Cracked sidewalk slab near elementary school",
    description: "Concrete slab lifted over 4 inches by tree roots creating trip hazard for school children.",
    category: "pothole",
    severity: "critical",
    severityReviewed: true,
    status: "in_progress",
    visibility: "public",
    latitude: 12.973,
    longitude: 77.596,
    department: { id: "dept-1", name: "Road Maintenance" },
    supportCount: 12,
    priority: {
      score: 85,
      severityPoints: 70,
      supportPoints: 20,
      agePoints: 2,
      urgent: true,
    },
    createdAt: "2026-11-17T11:00:00.000Z",
    updatedAt: "2026-11-19T09:30:00.000Z",
    resolvedAt: null,
    imageUrl: null,
    viewerHasSupported: true,
  },
  {
    id: "rep-2005",
    reference: "CP-2005",
    title: "Construction debris dumped in park alley",
    description: "Large pile of concrete rubble and plaster dumped illegally behind park gates.",
    category: "garbage",
    severity: "medium",
    severityReviewed: false,
    status: "pending",
    visibility: "private",
    latitude: 12.9698,
    longitude: 77.5925,
    department: { id: "dept-3", name: "Sanitation Dept" },
    supportCount: 1,
    priority: {
      score: 33,
      severityPoints: 30,
      supportPoints: 3,
      agePoints: 0,
      urgent: false,
    },
    createdAt: "2026-11-21T07:45:00.000Z",
    updatedAt: "2026-11-21T07:45:00.000Z",
    resolvedAt: null,
    imageUrl: null,
    viewerHasSupported: true,
  },
  {
    id: "rep-2006",
    reference: "CP-2006",
    title: "Potable main line leak near bus terminal",
    description: "High-pressure clean water spraying from underground joint onto tarmac.",
    category: "water_leakage",
    severity: "high",
    severityReviewed: true,
    status: "in_progress",
    visibility: "public",
    latitude: 12.974,
    longitude: 77.5975,
    department: { id: "dept-4", name: "Water Supply & Sewerage" },
    supportCount: 9,
    priority: {
      score: 72,
      severityPoints: 50,
      supportPoints: 20,
      agePoints: 2,
      urgent: true,
    },
    createdAt: "2026-11-18T13:20:00.000Z",
    updatedAt: "2026-11-19T15:00:00.000Z",
    resolvedAt: null,
    imageUrl: null,
    viewerHasSupported: true,
  },
  {
    id: "rep-2007",
    reference: "CP-2007",
    title: "Flickering high-mast junction light",
    description: "Main junction high mast light strobing erratically causing driver disorientation at night.",
    category: "streetlight",
    severity: "medium",
    severityReviewed: true,
    status: "resolved",
    visibility: "public",
    latitude: 12.971,
    longitude: 77.593,
    department: { id: "dept-2", name: "Electrical Services" },
    supportCount: 3,
    priority: {
      score: 39,
      severityPoints: 30,
      supportPoints: 9,
      agePoints: 0,
      urgent: false,
    },
    createdAt: "2026-11-15T20:10:00.000Z",
    updatedAt: "2026-11-17T12:00:00.000Z",
    resolvedAt: "2026-11-17T12:00:00.000Z",
    imageUrl: null,
    viewerHasSupported: true,
  },
  {
    id: "rep-2008",
    reference: "CP-2008",
    title: "Blocked storm drain causing water stagnation",
    description: "Silt and plastic clogging stormwater grating causing stagnant pool across road lane.",
    category: "drainage",
    severity: "high",
    severityReviewed: false,
    status: "pending",
    visibility: "public",
    latitude: 12.9755,
    longitude: 77.598,
    department: { id: "dept-4", name: "Water Supply & Sewerage" },
    supportCount: 5,
    priority: {
      score: 65,
      severityPoints: 50,
      supportPoints: 15,
      agePoints: 0,
      urgent: false,
    },
    createdAt: "2026-11-20T10:00:00.000Z",
    updatedAt: "2026-11-20T10:00:00.000Z",
    resolvedAt: null,
    imageUrl: null,
    viewerHasSupported: true,
  },
];

export function computeReportStats(reports: ComplaintSummary[]) {
  let pending = 0;
  let inProgress = 0;
  let resolved = 0;

  for (const report of reports) {
    if (report.status === "pending") pending++;
    else if (report.status === "in_progress") inProgress++;
    else if (report.status === "resolved") resolved++;
  }

  return {
    total: reports.length,
    pending,
    inProgress,
    resolved,
  };
}

export function filterReports(
  reports: ComplaintSummary[],
  params?: GetMyReportsParams
): {
  items: ComplaintSummary[];
  total: number;
  page: number;
  pageSize: number;
} {
  const statusFilter = params?.status ?? "all";
  const categoryFilter = params?.category ?? "all";
  const searchTerm = (params?.q ?? "").trim().toLowerCase();
  const sortBy = params?.sort ?? "newest";
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, params?.pageSize ?? 5);

  let filtered = [...reports];

  // Status filter
  if (statusFilter !== "all") {
    filtered = filtered.filter((r) => r.status === statusFilter);
  }

  // Category filter
  if (categoryFilter !== "all") {
    filtered = filtered.filter((r) => r.category === categoryFilter);
  }

  // Search filter
  if (searchTerm) {
    filtered = filtered.filter((r) => {
      const matchTitle = r.title.toLowerCase().includes(searchTerm);
      const matchRef = r.reference.toLowerCase().includes(searchTerm);
      const matchDesc = r.description.toLowerCase().includes(searchTerm);
      const categoryLabel = CATEGORY_NAMES[r.category]?.toLowerCase() ?? "";
      const matchCat = categoryLabel.includes(searchTerm);
      return matchTitle || matchRef || matchDesc || matchCat;
    });
  }

  // Sorting
  filtered.sort((a, b) => {
    if (sortBy === "oldest") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortBy === "support") {
      return b.supportCount - a.supportCount;
    }
    // "newest" is default
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const total = filtered.length;
  const startIndex = (page - 1) * pageSize;
  const items = filtered.slice(startIndex, startIndex + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
  };
}

/**
 * Returns detailed authorized report data including recorded lifecycle status history
 * and resolution proof. Strictly typed to ComplaintDetails domain model.
 */
export function getMockReportDetails(reportId: string): ComplaintDetails | null {
  const normalizedId = decodeURIComponent(reportId).trim();
  const report = mockMyReports.find(
    (r) => r.id === normalizedId || r.reference.toLowerCase() === normalizedId.toLowerCase()
  );

  if (!report) {
    return null;
  }

  const history: StatusHistory[] = [
    {
      id: `hist-${report.id}-1`,
      eventType: "submitted",
      oldStatus: null,
      newStatus: "pending",
      remark: "Citizen intake received and recorded in public infrastructure ledger.",
      createdAt: report.createdAt,
    },
  ];

  let version = 1;

  if (report.status === "in_progress" || report.status === "resolved") {
    version++;
    history.push({
      id: `hist-${report.id}-2`,
      eventType: "triaged",
      oldStatus: "pending",
      newStatus: "in_progress",
      remark: `Assigned to ${report.department?.name ?? "Municipal Field Services"} for active maintenance and onsite inspection.`,
      createdAt: report.updatedAt,
    });
  }

  if (report.status === "resolved") {
    version++;
    const resolvedTimestamp = report.resolvedAt ?? report.updatedAt;
    history.push({
      id: `hist-${report.id}-3`,
      eventType: "status_changed",
      oldStatus: "in_progress",
      newStatus: "resolved",
      remark: "Work order completed, site verified, and signed off by authorized municipal supervisor.",
      createdAt: resolvedTimestamp,
    });
  }

  const resolutionImages =
    report.status === "resolved"
      ? [
          {
            id: `res-img-${report.id}`,
            imageUrl:
              "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%23dcfce7'/%3E%3Cpath d='M250 200 L285 235 L355 165' stroke='%2316a34a' stroke-width='16' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3Ctext x='300' y='290' font-family='system-ui, sans-serif' font-size='20' font-weight='bold' fill='%23166534' text-anchor='middle'%3EMunicipal Resolution Evidence Photo%3C/text%3E%3C/svg%3E",
            createdAt: report.resolvedAt ?? report.updatedAt,
          },
        ]
      : [];

  return {
    report,
    history,
    resolutionImages,
    canGiveFeedback: report.status === "resolved",
    version,
  };
}

