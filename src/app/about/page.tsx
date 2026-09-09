import { Suspense } from "react";
import { AboutPage } from "@/components/demo/ReferencePages";
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Opening workspace…</p>}>
      <AboutPage />
    </Suspense>
  );
}
