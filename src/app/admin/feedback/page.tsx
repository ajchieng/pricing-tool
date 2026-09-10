import { Suspense } from "react";
import { LocalFeedbackWorkspace } from "@/components/feedback-review/LocalFeedbackWorkspace";

export default function Page() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted">Loading local feedback…</p>}
    >
      <LocalFeedbackWorkspace />
    </Suspense>
  );
}
