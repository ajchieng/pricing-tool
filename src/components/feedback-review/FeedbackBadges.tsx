import { Badge } from "@/components/ui/Badge";
import {
  feedbackCategoryLabel,
  feedbackSeverityLabel,
  feedbackStatusLabel,
} from "@/lib/feedback-review";
import type { Tone } from "@/lib/tones";

const statusTones: Record<string, Tone> = {
  open: "warn",
  reviewed: "info",
  closed: "ok",
};

const severityTones: Record<string, Tone> = {
  low: "muted",
  medium: "info",
  high: "high",
};

export function FeedbackStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={statusTones[status] ?? "muted"} size="sm">
      {feedbackStatusLabel(status)}
    </Badge>
  );
}

export function FeedbackSeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge tone={severityTones[severity] ?? "muted"} size="sm">
      {feedbackSeverityLabel(severity)}
    </Badge>
  );
}

export function FeedbackCategoryBadge({ category }: { category: string }) {
  return (
    <Badge tone="muted" size="sm">
      {feedbackCategoryLabel(category)}
    </Badge>
  );
}
