"use client";

import { useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { FEEDBACK_ATTACHMENT_ACCEPT } from "@/lib/feedback-attachments";
import { saveDemoFeedback } from "@/lib/demo/local-operations";

const categoryOptions = [
  ["bug", "Bug or error"],
  ["pricing_logic", "Pricing logic"],
  ["usability", "Usability"],
  ["data", "Data or rates"],
  ["other", "Other"],
] as const;

export function FeedbackForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    attachmentError?: string;
  }>({ success: false, message: "" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult({ success: false, message: "" });
    try {
      await saveDemoFeedback(new FormData(event.currentTarget));
      formRef.current?.reset();
      setResult({
        success: true,
        message:
          "Feedback saved in this browser. Review it in the local feedback inbox.",
      });
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Feedback could not be saved in this browser.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        void submit(event);
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="feedback-category">
          <select
            id="feedback-category"
            name="category"
            className={inputClass}
            defaultValue="usability"
            required
          >
            {categoryOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Severity"
          htmlFor="feedback-severity"
          helper="Use High for issues that block or mislead staff."
        >
          <select
            id="feedback-severity"
            name="severity"
            className={inputClass}
            defaultValue="medium"
            required
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </Field>
      </div>
      <Field
        label="Your name"
        htmlFor="feedback-submitter-name"
        helper="Optional. Use a fictional name for this demonstration."
      >
        <input
          id="feedback-submitter-name"
          name="submitterName"
          type="text"
          maxLength={80}
          autoComplete="name"
          className={inputClass}
        />
      </Field>
      <Field
        label="Page or context"
        htmlFor="feedback-page-context"
        helper="Optional. Include the page, quote number, or workflow step if it helps."
      >
        <input
          id="feedback-page-context"
          name="pageContext"
          type="text"
          maxLength={160}
          className={inputClass}
          placeholder="/home-loans/new"
        />
      </Field>
      <Field
        label="Feedback"
        htmlFor="feedback-message"
        helper="Describe what happened, what you expected, or what would improve the workflow."
      >
        <textarea
          id="feedback-message"
          name="message"
          required
          minLength={5}
          maxLength={4000}
          rows={8}
          className={`${inputClass} resize-y`}
        />
      </Field>
      <Field
        label="Screenshots or files"
        htmlFor="feedback-attachments"
        helper="Optional. Up to 3 files, 2 MB each: PNG, JPEG, WebP, plain text or CSV."
        error={result.attachmentError}
      >
        <input
          id="feedback-attachments"
          name="attachments"
          type="file"
          multiple
          accept={FEEDBACK_ATTACHMENT_ACCEPT}
          className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-panel file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink`}
        />
      </Field>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          aria-live="polite"
          className={`text-sm ${result.success ? "text-ok" : result.message ? "text-alert" : "text-muted"}`}
        >
          {result.message ||
            "Feedback and attachments stay in this browser; no message is sent."}
        </p>
        <Button type="submit" variant="primary" disabled={pending}>
          <Send size={15} strokeWidth={2} aria-hidden />
          {pending ? "Saving" : "Save feedback"}
        </Button>
      </div>
    </form>
  );
}
