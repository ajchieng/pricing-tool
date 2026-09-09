import { Badge } from "@/components/ui/Badge";
import { approvalStatus, APPROVAL_STATUS_SHORT } from "@/lib/status";

export function ApprovalBadge({
  level,
  size = "md",
  short = false,
}: {
  level: string | null;
  size?: "sm" | "md";
  short?: boolean;
}) {
  const s = approvalStatus(level);
  return (
    <Badge tone={s.tone} size={size}>
      {short ? (APPROVAL_STATUS_SHORT[level ?? "none"] ?? s.label) : s.label}
    </Badge>
  );
}
