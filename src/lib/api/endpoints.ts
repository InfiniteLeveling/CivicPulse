function reportId(id: string) {
  if (!id.trim() || id === "." || id === "..") {
    throw new TypeError("A report identifier is required.");
  }
  return encodeURIComponent(id);
}

export const endpoints = {
  upload: { method: "POST", path: "/api/uploads" },
  classify: { method: "POST", path: "/api/ai/classify" },
  duplicates: { method: "POST", path: "/api/reports/duplicates" },
  createReport: { method: "POST", path: "/api/reports" },
  listReports: { method: "GET", path: "/api/reports" },
  report: (id: string) =>
    ({ method: "GET", path: `/api/reports/${reportId(id)}` }) as const,
  support: (id: string) =>
    ({ method: "POST", path: `/api/reports/${reportId(id)}/support` }) as const,
  triage: (id: string) =>
    ({ method: "PATCH", path: `/api/admin/reports/${reportId(id)}/triage` }) as const,
  status: (id: string) =>
    ({ method: "PATCH", path: `/api/admin/reports/${reportId(id)}/status` }) as const,
  departments: { method: "GET", path: "/api/admin/departments" },
  myStats: { method: "GET", path: "/api/stats?scope=mine" },
  adminStats: { method: "GET", path: "/api/stats?scope=admin" },
} as const;
