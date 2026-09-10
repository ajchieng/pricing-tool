"use client";

import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { updateDemoFeedbackTriage } from "@/lib/demo/local-operations";
import { buttonClass } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import type { FeedbackDetail } from "@/lib/feedback-review";

const INITIAL_STATE = {
  success: false,
  changed: false,
  message: "",
  updatedAt: "",
};

export function FeedbackTriageForm({ feedback }: { feedback: FeedbackDetail }) {
  const [state, setState] = useState({
    ...INITIAL_STATE,
    updatedAt: feedback.updatedAt.toISOString(),
  });
  const [pending, setPending] = useState(false);
  async function save(formData: FormData) {
    setPending(true);
    try {
      const updated = await updateDemoFeedbackTriage(formData);
      setState({
        success: true,
        changed: true,
        message: "Triage saved in this browser.",
        updatedAt: updated.updatedAt.toISOString(),
      });
    } catch (error) {
      setState((previous) => ({
        ...previous,
        success: false,
        message:
          error instanceof Error ? error.message : "Triage could not be saved.",
      }));
    } finally {
      setPending(false);
    }
  }
  const statusId = `feedback-triage-status-${feedback.id}`;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save(new FormData(event.currentTarget));
      }}
      className="mt-4 space-y-4"
    >
      <input type="hidden" name="id" value={feedback.id} />
      <input
        type="hidden"
        name="expectedUpdatedAt"
        value={state.updatedAt || feedback.updatedAt.toISOString()}
      />
      <div className="grid gap-4 sm:grid-cols-[minmax(0,190px)_minmax(0,1fr)]">
        <label className="text-sm font-medium text-ink">
          Status
          <select
            name="status"
            defaultValue={feedback.status}
            aria-describedby={statusId}
            className={`${inputClass} mt-1.5`}
          >
            <option value="open">Open</option>
            <option value="reviewed">Reviewed</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label className="text-sm font-medium text-ink">
          Reviewer note{" "}
          <span className="font-normal text-muted">(optional)</span>
          <textarea
            name="adminNotes"
            defaultValue={feedback.adminNotes ?? ""}
            maxLength={2000}
            rows={4}
            aria-describedby={`${statusId} feedback-note-help-${feedback.id}`}
            className={`${inputClass} mt-1.5 min-h-28 resize-y leading-6`}
            placeholder="Record follow-up, reproduction details or the resolution."
          />
          <span
            id={`feedback-note-help-${feedback.id}`}
            className="mt-1 block text-xs font-normal text-muted"
          >
            This shared note replaces the current reviewer note when saved.
          </span>
        </label>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p
          id={statusId}
          role="status"
          aria-live="polite"
          className={`min-h-5 text-sm ${
            state.success
              ? "text-ok"
              : state.message
                ? "text-alert"
                : "text-muted"
          }`}
        >
          {state.message}
        </p>
        <button
          type="submit"
          disabled={pending}
          className={buttonClass("primary", "md", "self-start sm:self-auto")}
        >
          <ClipboardCheck size={16} strokeWidth={1.8} aria-hidden />
          {pending ? "Saving" : "Save triage"}
        </button>
      </div>
    </form>
  );
}
