import { Suspense } from "react";
import { ScoreModelAdminPage } from "@/components/admin/ScoreModelAdminPage";

export default function Page() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted">Loading score model…</p>}
    >
      <ScoreModelAdminPage vertical="home" />
    </Suspense>
  );
}
