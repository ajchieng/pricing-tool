"use client";

import { useId, useRef } from "react";
import { TriangleAlert } from "lucide-react";
import { btnRowDanger } from "@/components/adminUi";
import { buttonClass } from "@/components/ui/Button";

export function ConfirmedDeleteSubmit({
  itemLabel = "this configuration row",
}: {
  itemLabel?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  function closeDialog() {
    dialogRef.current?.close();
  }

  function confirmDelete() {
    const form = triggerRef.current?.form;
    closeDialog();
    form?.requestSubmit();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={btnRowDanger}
        onClick={() => dialogRef.current?.showModal()}
      >
        Delete
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={() => triggerRef.current?.focus()}
        className="confirm-dialog m-auto max-h-[calc(100dvh-2rem)] w-[min(92vw,30rem)] overflow-y-auto rounded-2xl border border-border bg-surface p-0 text-ink shadow-[var(--shadow-lg)]"
      >
        <div className="p-5 sm:p-6">
          <div
            aria-hidden
            className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-alert-soft text-alert"
          >
            <TriangleAlert size={19} strokeWidth={1.8} />
          </div>
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            Delete {itemLabel}?
          </h2>
          <p
            id={descriptionId}
            className="mt-2 text-sm leading-relaxed text-muted"
          >
            This removes the row from your browser’s configuration. Saved quote
            snapshots stay unchanged.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              autoFocus
              onClick={closeDialog}
              className={buttonClass("secondary", "md", "w-full sm:w-auto")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className={buttonClass("destructive", "md", "w-full sm:w-auto")}
            >
              Delete
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
