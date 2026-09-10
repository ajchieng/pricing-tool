import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_SEVERITIES,
  FEEDBACK_STATUSES,
  type FeedbackCategory,
  type FeedbackSeverity,
  type FeedbackStatus,
} from "@/lib/feedback";
import { localReturnPathOrNull } from "@/lib/http/local-return-path";

const FEEDBACK_PERIODS = ["all", "7d", "30d", "90d"] as const;
const FEEDBACK_ATTACHMENT_FILTERS = ["all", "with", "without"] as const;
const FEEDBACK_SORTS = ["priority", "newest", "oldest"] as const;

export type FeedbackPeriod = (typeof FEEDBACK_PERIODS)[number];
export type FeedbackAttachmentFilter =
  (typeof FEEDBACK_ATTACHMENT_FILTERS)[number];
export type FeedbackSort = (typeof FEEDBACK_SORTS)[number];

export type FeedbackFilters = {
  q: string;
  status: FeedbackStatus | "all";
  category: FeedbackCategory | "all";
  severity: FeedbackSeverity | "all";
  period: FeedbackPeriod;
  attachments: FeedbackAttachmentFilter;
  sort: FeedbackSort;
  page: number;
};

export type FeedbackSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type FeedbackPerson = {
  id: number;
  name: string;
  email: string;
};

export type FeedbackListItem = {
  id: number;
  category: string;
  severity: string;
  status: string;
  submitterName: string | null;
  pageContext: string | null;
  message: string;
  createdAt: Date;
  updatedAt: Date;
  submitter: FeedbackPerson | null;
  attachmentCount: number;
};

export type FeedbackAttachment = {
  blob?: Blob;
  id: number;
  filename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
  downloadAllowed: boolean;
  blockedReason: string | null;
};

export type FeedbackDetail = FeedbackListItem & {
  adminNotes: string | null;
  reviewedAt: Date | null;
  reviewer: FeedbackPerson | null;
  attachments: FeedbackAttachment[];
};

export type FeedbackPage = {
  items: FeedbackListItem[];
  filteredCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type FeedbackSummary = {
  total: number;
  open: number;
  reviewed: number;
  closed: number;
  highOpen: number;
  recent: number;
};

const categoryLabels: Record<FeedbackCategory, string> = {
  bug: "Bug or error",
  pricing_logic: "Pricing logic",
  usability: "Usability",
  data: "Data or rates",
  other: "Other",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function oneOf<T extends readonly string[]>(
  value: string,
  values: T,
  fallback: T[number],
): T[number] {
  return values.includes(value) ? value : fallback;
}

export function parseFeedbackFilters(
  searchParams: FeedbackSearchParams,
): FeedbackFilters {
  const page = Number(first(searchParams.page));
  return {
    q: first(searchParams.q).trim().slice(0, 160),
    status: oneOf(
      first(searchParams.status),
      ["all", ...FEEDBACK_STATUSES] as const,
      "all",
    ),
    category: oneOf(
      first(searchParams.category),
      ["all", ...FEEDBACK_CATEGORIES] as const,
      "all",
    ),
    severity: oneOf(
      first(searchParams.severity),
      ["all", ...FEEDBACK_SEVERITIES] as const,
      "all",
    ),
    period: oneOf(first(searchParams.period), FEEDBACK_PERIODS, "all"),
    attachments: oneOf(
      first(searchParams.attachments),
      FEEDBACK_ATTACHMENT_FILTERS,
      "all",
    ),
    sort: oneOf(first(searchParams.sort), FEEDBACK_SORTS, "priority"),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function filtersToSearchParams(
  filters: FeedbackFilters,
  overrides: Partial<FeedbackFilters> = {},
): URLSearchParams {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.status !== "all") params.set("status", next.status);
  if (next.category !== "all") params.set("category", next.category);
  if (next.severity !== "all") params.set("severity", next.severity);
  if (next.period !== "all") params.set("period", next.period);
  if (next.attachments !== "all") {
    params.set("attachments", next.attachments);
  }
  if (next.sort !== "priority") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  return params;
}

export function feedbackHref(
  filters: FeedbackFilters,
  options: { id?: number; overrides?: Partial<FeedbackFilters> } = {},
): string {
  const path = "/admin/feedback";
  const query = filtersToSearchParams(filters, options.overrides ?? {});
  if (options.id) query.set("id", String(options.id));
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}

export function hasActiveFeedbackFilters(filters: FeedbackFilters): boolean {
  return (
    filters.q !== "" ||
    filters.status !== "all" ||
    filters.category !== "all" ||
    filters.severity !== "all" ||
    filters.period !== "all" ||
    filters.attachments !== "all" ||
    filters.sort !== "priority"
  );
}

export function feedbackCategoryLabel(value: string): string {
  return categoryLabels[value as FeedbackCategory] ?? value;
}

export function feedbackStatusLabel(value: string): string {
  if (value === "open") return "Open";
  if (value === "reviewed") return "Reviewed";
  if (value === "closed") return "Closed";
  return value;
}

export function feedbackSeverityLabel(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

export function displayFeedbackSubmitter(
  feedback: Pick<FeedbackListItem, "submitterName" | "submitter">,
): string {
  return (
    feedback.submitterName ?? feedback.submitter?.name ?? "Unknown submitter"
  );
}

export function safeFeedbackContextPath(value: string | null): string | null {
  if (!value) return null;
  const candidate = value.trim().split(/\s+/)[0] ?? "";
  return localReturnPathOrNull(candidate);
}
