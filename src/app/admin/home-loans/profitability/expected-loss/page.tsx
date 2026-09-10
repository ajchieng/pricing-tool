"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Page() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/home-loans/profitability#expected-loss");
  }, [router]);
  return (
    <p className="text-sm text-muted">
      <Link href="/admin/home-loans/profitability#expected-loss">
        Open expected-loss policy
      </Link>
    </p>
  );
}
