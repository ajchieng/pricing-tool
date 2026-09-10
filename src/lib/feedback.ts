import { z } from "zod";

export const FEEDBACK_CATEGORIES = [
  "bug",
  "pricing_logic",
  "usability",
  "data",
  "other",
] as const;

export const FEEDBACK_SEVERITIES = ["low", "medium", "high"] as const;
export const FEEDBACK_STATUSES = ["open", "reviewed", "closed"] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export type FeedbackSeverity = (typeof FEEDBACK_SEVERITIES)[number];
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => {
      const trimmed = value?.trim() ?? "";
      return trimmed ? trimmed : null;
    });

const feedbackSubmissionSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  severity: z.enum(FEEDBACK_SEVERITIES),
  submitterName: optionalTrimmedString(80),
  pageContext: optionalTrimmedString(160),
  message: z.string().trim().min(5).max(4000),
});

const feedbackTriageUpdateSchema = z.object({
  id: z.coerce.number().int().positive(),
  expectedUpdatedAt: z
    .string()
    .datetime({ offset: true })
    .transform((value) => new Date(value)),
  status: z.enum(FEEDBACK_STATUSES),
  adminNotes: optionalTrimmedString(2000),
});

export type FeedbackSubmission = z.infer<typeof feedbackSubmissionSchema>;
export type FeedbackTriageUpdate = z.infer<typeof feedbackTriageUpdateSchema>;

export function parseFeedbackSubmission(input: unknown): FeedbackSubmission {
  return feedbackSubmissionSchema.parse(input);
}

export function parseFeedbackTriageUpdate(
  input: unknown,
): FeedbackTriageUpdate {
  return feedbackTriageUpdateSchema.parse(input);
}
