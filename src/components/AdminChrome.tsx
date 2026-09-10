"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { AdminTabs } from "@/components/AdminTabs";
import { AdminConfigSearchForm } from "@/components/admin/AdminConfigSearchForm";
import { AdminSearchTargetFocus } from "@/components/admin/AdminSearchTargetFocus";
import { ConfigurationFeedback } from "@/components/admin/ConfigurationFeedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusText } from "@/components/ui/StatusText";

export function AdminChrome() {
  const pathname = usePathname();
  const feedbackRoute = pathname.startsWith("/admin/feedback");
  const title = feedbackRoute ? "Feedback administration" : "Configuration";
  const caption = feedbackRoute
    ? "Review fictional feedback, supporting files and local triage records."
    : "Manage vertical pricing policy, cross-vertical capital allocation, workspace settings, and governance records.";

  return (
    <>
      <PageHeader
        title={title}
        caption={caption}
        actions={
          <Suspense
            fallback={
              <div
                aria-hidden
                className="h-11 w-[calc(100vw-2rem)] max-w-md rounded-lg bg-panel sm:w-[28rem]"
              />
            }
          >
            <AdminConfigSearchForm />
          </Suspense>
        }
        className="mb-4"
      />
      {!feedbackRoute ? (
        <div className="mb-5 flex flex-col gap-x-8 gap-y-2 border-y border-border py-2.5 lg:flex-row lg:items-center">
          <p className="flex min-w-0 items-baseline gap-2 text-xs leading-5 text-muted">
            <StatusText tone="ok" className="shrink-0">
              Active policy
            </StatusText>
            <span>
              Configured products, rates and policy settings feed pricing
              calculations and saved quote snapshots.
            </span>
          </p>
          <p className="flex min-w-0 items-baseline gap-2 text-xs leading-5 text-muted">
            <StatusText tone="info" className="shrink-0">
              Change approval
            </StatusText>
            <span>
              Edits apply to this browser with a governance record. Review and
              schedule fictional proposals in the approval queue; saved quote
              snapshots retain the policy used when they were created.
            </span>
          </p>
        </div>
      ) : null}
      <AdminTabs />
      {!feedbackRoute ? (
        <Suspense fallback={null}>
          <ConfigurationFeedback />
        </Suspense>
      ) : null}
      <AdminSearchTargetFocus />
    </>
  );
}
