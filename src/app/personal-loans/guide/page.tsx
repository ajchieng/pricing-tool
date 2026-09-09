import { Suspense } from "react";
import { GuidePage } from "@/components/demo/ReferencePages";
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Opening workspace…</p>}>
      <GuidePage area="personal" />
    </Suspense>
  );
}
