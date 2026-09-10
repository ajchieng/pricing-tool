import { Suspense } from "react";
import { DemoMarketAdminPage } from "@/components/admin/DemoMarketAdminPage";
export default function Page() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted">Loading market configuration…</p>
      }
    >
      <DemoMarketAdminPage />
    </Suspense>
  );
}
