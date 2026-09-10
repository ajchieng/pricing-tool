"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  listDemoFeedback,
  subscribeDemoLocalOperations,
} from "@/lib/demo/local-operations";
import {
  parseFeedbackFilters,
  type FeedbackDetail,
} from "@/lib/feedback-review";
import { FeedbackWorkspace } from "./FeedbackWorkspace";

export function LocalFeedbackWorkspace() {
  const search = useSearchParams();
  const filters = parseFeedbackFilters(Object.fromEntries(search.entries()));
  const idValue = Number(search.get("id"));
  const selectedId =
    Number.isSafeInteger(idValue) && idValue > 0 ? idValue : null;
  const [now, setNow] = useState(0);
  const [items, setItems] = useState<FeedbackDetail[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void listDemoFeedback()
        .then((rows) => {
          if (active) {
            setItems(rows);
            setNow(Date.now());
            setError(null);
          }
        })
        .catch((error) => {
          if (active)
            setError(
              error instanceof Error
                ? error.message
                : "Local feedback could not be read.",
            );
        });
    };
    refresh();
    const unsubscribe = subscribeDemoLocalOperations(refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  const summary = useMemo(
    () => ({
      total: items.length,
      open: items.filter((item) => item.status === "open").length,
      reviewed: items.filter((item) => item.status === "reviewed").length,
      closed: items.filter((item) => item.status === "closed").length,
      highOpen: items.filter(
        (item) => item.status === "open" && item.severity === "high",
      ).length,
      recent: items.filter(
        (item) => now - item.createdAt.getTime() <= 30 * 86400000,
      ).length,
    }),
    [items, now],
  );
  const period =
    filters.period === "all"
      ? null
      : Number.parseInt(filters.period, 10) * 86400000;
  const filtered = items.filter(
    (item) =>
      (filters.status === "all" || item.status === filters.status) &&
      (filters.category === "all" || item.category === filters.category) &&
      (filters.severity === "all" || item.severity === filters.severity) &&
      (period === null || now - item.createdAt.getTime() <= period) &&
      (filters.attachments === "all" ||
        (filters.attachments === "with"
          ? item.attachmentCount > 0
          : item.attachmentCount === 0)) &&
      (!filters.q ||
        [item.message, item.pageContext, item.submitterName]
          .join(" ")
          .toLowerCase()
          .includes(filters.q.toLowerCase())),
  );
  const priority: Record<string, number> = { high: 0, medium: 1, low: 2 };
  filtered.sort((a, b) =>
    filters.sort === "oldest"
      ? a.createdAt.getTime() - b.createdAt.getTime()
      : filters.sort === "newest"
        ? b.createdAt.getTime() - a.createdAt.getTime()
        : (a.status === "closed" ? 1 : 0) - (b.status === "closed" ? 1 : 0) ||
          (priority[a.severity] ?? 2) - (priority[b.severity] ?? 2) ||
          b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const pageNumber = Math.min(filters.page, pageCount);
  const page = {
    items: filtered.slice((pageNumber - 1) * 20, pageNumber * 20),
    filteredCount: filtered.length,
    page: pageNumber,
    pageSize: 20,
    pageCount,
  };
  const detail = selectedId
    ? (items.find((item) => item.id === selectedId) ?? null)
    : (page.items[0] ?? null);
  return (
    <>
      {error && (
        <p role="alert" className="mb-4 text-sm text-alert">
          {error}
        </p>
      )}
      <FeedbackWorkspace
        filters={filters}
        page={page}
        summary={summary}
        detail={detail}
        selectedId={selectedId}
      />
    </>
  );
}
