export type UserRole = "citizen" | "admin";
export type IssueCategory =
  | "pothole"
  | "garbage"
  | "water_leakage"
  | "streetlight"
  | "drainage"
  | "other";
export type ReportStatus = "pending" | "in_progress" | "resolved";
export type IssueSeverity = "low" | "medium" | "high" | "critical";
export type ReportVisibility = "public" | "private";

export interface UserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  category: IssueCategory | null;
}

export interface PriorityBreakdown {
  score: number;
  severityPoints: number;
  supportPoints: number;
  agePoints: number;
  urgent: boolean;
}

export interface ComplaintStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  criticalActive?: number;
  resolutionRate: number | null;
}

export interface ComplaintSummary {
  id: string;
  reference: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  severityReviewed: boolean;
  status: ReportStatus;
  visibility: ReportVisibility;
  latitude: number;
  longitude: number;
  department: Pick<Department, "id" | "name"> | null;
  supportCount: number;
  priority: PriorityBreakdown;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  imageUrl: string | null;
  viewerHasSupported: boolean;
}

export interface StatusHistory {
  id: string;
  eventType: "submitted" | "triaged" | "status_changed" | "feedback_reviewed";
  oldStatus: ReportStatus | null;
  newStatus: ReportStatus | null;
  remark: string | null;
  createdAt: string;
}

export interface ComplaintDetails {
  report: ComplaintSummary;
  history: StatusHistory[];
  resolutionImages: { id: string; imageUrl: string; createdAt: string }[];
  canGiveFeedback: boolean;
  version: number;
}

export type DuplicateCandidate = Pick<
  ComplaintSummary,
  "id" | "reference" | "title" | "category" | "status" | "supportCount" | "imageUrl"
> & { distanceMeters: number };

export interface DuplicateCheckRequest {
  category: IssueCategory;
  latitude: number;
  longitude: number;
  visibility: ReportVisibility;
}

export interface DuplicateCheckResponse {
  candidates: DuplicateCandidate[];
}

export interface SupportReportResponse {
  supportCount: number;
  viewerHasSupported: boolean;
  priority?: PriorityBreakdown;
}

export type DuplicateCheckStatus =
  | "idle"
  | "checking"
  | "matches_found"
  | "no_matches"
  | "error"
  | "unavailable";

export interface PaginatedListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UploadImageResponse {
  imageId: string;
  previewUrl: string;
}

export type ImageUploadStatus = "idle" | "selected" | "uploading" | "uploaded" | "error";

export interface LocationSelection {
  latitude: number;
  longitude: number;
  source: "gps" | "map" | "manual";
  accuracyMeters?: number;
  confirmed: boolean;
}

export interface AIClassifyRequest {
  imageId: string;
}

export interface AIClassifyResult {
  analysisId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  description: string;
  isCivicIssue: boolean;
}

export type AIAnalysisStatus =
  | "idle"
  | "awaiting_consent"
  | "ready"
  | "analyzing"
  | "success"
  | "error";

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: { code: string; message: string; details?: unknown };
}

export interface CreateReportRequest {
  title: string;
  description: string;
  category: IssueCategory;
  latitude: number;
  longitude: number;
  visibility: ReportVisibility;
  imageId: string;
  analysisId?: string | null;
  confirmedSeparateFromIds: string[];
}

export interface CreateReportResponse {
  report: ComplaintSummary;
}

export type SubmissionState =
  | "idle"
  | "validating"
  | "submitting"
  | "duplicate_conflict"
  | "success"
  | "error"
  | "outcome_unknown";

export interface DuplicateConflictDetails {
  candidates: DuplicateCandidate[];
}

export type ReportSummary = ComplaintSummary;

export type ReportSortBy = "newest" | "oldest" | "support";

export interface MyReportsFilterState {
  status: ReportStatus | "all";
  category: IssueCategory | "all";
  search: string;
  sortBy: ReportSortBy;
  page: number;
}

export interface GetMyReportsParams {
  status?: ReportStatus | "all";
  category?: IssueCategory | "all";
  q?: string;
  sort?: ReportSortBy;
  page?: number;
  pageSize?: number;
  empty?: boolean;
  forceError?: boolean;
}

export interface GetMyReportsResult {
  items: ReportSummary[];
  total: number;
  page: number;
  pageSize: number;
  isDemoData?: boolean;
}

export interface PublicReportsFilterState {
  status: ReportStatus | "all";
  category: IssueCategory | "all";
  search: string;
}

export interface GetPublicReportsParams {
  status?: ReportStatus | "all";
  category?: IssueCategory | "all";
  q?: string;
  empty?: boolean;
  forceError?: boolean;
}

export interface GetPublicReportsResult {
  items: ReportSummary[];
  total: number;
  isDemoData?: boolean;
}

export interface AdminUserSummary {
  name: string;
  email: string;
  role: "admin";
}

export interface GetAdminReportsParams {
  status?: ReportStatus | "all";
  category?: IssueCategory | "all";
  severity?: IssueSeverity | "all";
  urgent?: boolean;
  q?: string;
  sort?: "priority" | "priority_asc" | "recent" | "oldest" | "most_supported";
  page?: number;
  pageSize?: number;
  empty?: boolean;
  forceError?: boolean;
}

export interface GetAdminReportsResult {
  items: ComplaintSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  urgentCount: number;
  isDemoData: boolean;
}


