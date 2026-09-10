"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LegacyCompetitorAdminPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/market-search");
  }, [router]);
  return (
    <p className="text-sm text-muted">
      <Link href="/admin/market-search">Open Market Search configuration</Link>
    </p>
  );
}
