export const DEMO_AREAS = ["home", "personal", "commercial"] as const;
export type DemoArea = (typeof DEMO_AREAS)[number];

export const DEMO_WORKFLOW_STATUSES = [
  "draft",
  "needs_risk_info",
  "needs_profitability_info",
  "ready_for_review",
  "reviewed",
  "archived",
] as const;
export type DemoWorkflowStatus = (typeof DEMO_WORKFLOW_STATUSES)[number];
export type DemoReviewDecision = "accepted" | "declined" | "changes_requested";

export interface DemoQuoteSummary {
  productName: string;
  amount: number;
  rate: number | null;
  repayment: number | null;
  approval: string;
}

export interface DemoQuoteDraft {
  area: DemoArea;
  customerName: string;
  input: Record<string, unknown>;
  result: unknown;
  summary: DemoQuoteSummary;
}

/** The input and complete calculation result are immutable saved snapshots. */
export interface DemoQuote extends DemoQuoteDraft {
  id: number;
  coreId: number;
  revision: number;
  createdAt: string;
}

/** Fixture-only instructions, excluded from every saved calculation snapshot. */
export interface DemoSeedDraft extends DemoQuoteDraft {
  seedRevisionOfIndex?: number;
  seedStatus?: DemoWorkflowStatus;
  seedComment?: string;
}

export interface DemoReview {
  quoteId: number;
  decision: DemoReviewDecision;
  reason: string;
  actor: string;
  createdAt: string;
}

export interface DemoComment {
  id: number;
  text: string;
  actor: string;
  createdAt: string;
}

export interface DemoHistoryEvent {
  id: number;
  action:
    | "created"
    | "revised"
    | "starred"
    | "assigned"
    | "workflow"
    | "reviewed"
    | "commented";
  quoteId: number;
  detail: string;
  actor: string;
  createdAt: string;
}

/** Shared operations only; each pricing domain has its own IndexedDB store. */
export interface DemoCore {
  id: number;
  area: DemoArea;
  currentQuoteId: number;
  starred: boolean;
  assignee: string;
  status: DemoWorkflowStatus;
  review: DemoReview | null;
  comments: DemoComment[];
  history: DemoHistoryEvent[];
}

export const DEMO_ACTOR = "Demo user";
