"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ClipboardPaste,
  Download,
  ExternalLink,
  FileJson,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import type { ZodType } from "zod";
import {
  adminTableShell,
  inp,
  responsiveAdminMobileLabel,
  responsiveAdminTable,
  responsiveAdminTableBody,
  responsiveAdminTableCell,
  responsiveAdminTableHead,
  responsiveAdminTableRow,
  responsiveAdminTableScroll,
  th,
} from "@/components/adminUi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fmtMoney } from "@/lib/format";
import { saveDemoForm } from "@/lib/demo/form-adapter";
import { sampleInput } from "@/lib/demo/policy";
import { quoteHref } from "@/lib/demo/presentation";
import type { DemoArea } from "@/lib/demo/types";
import { DemoStoreError } from "@/lib/demo/store";
import {
  failedBulkQuoteRowsJson,
  parseBulkQuoteImport,
  type BulkQuoteImportParseConfig,
  type BulkQuoteImportSummary,
  type PreparedBulkQuoteImportRow,
  zodInputFieldNames,
} from "@/lib/quotes/bulk-import-browser";
import { BULK_QUOTE_IMPORT_MAX_FILE_BYTES } from "@/lib/quotes/bulk-import-contract";
import type { Tone } from "@/lib/tones";

type ImportRowStatus =
  | "invalid"
  | "ready"
  | "creating"
  | "created"
  | "deduplicated"
  | "failed"
  | "not_attempted";

type ImportRow = PreparedBulkQuoteImportRow & {
  status: ImportRowStatus;
  quoteId?: number;
  resultError?: string;
};

export type BulkQuoteImportWorkspaceProps = {
  verticalLabel: string;
  vertical: DemoArea;
  quoteBasePath: string;
  failedFilename: string;
  schema: ZodType;
  foreignMarkers: BulkQuoteImportParseConfig["foreignMarkers"];
  summarize: (normalized: Record<string, unknown>) => BulkQuoteImportSummary;
};

const STATUS_PRESENTATION: Record<
  ImportRowStatus,
  { label: string; tone: Tone }
> = {
  invalid: { label: "Invalid", tone: "alert" },
  ready: { label: "Ready", tone: "info" },
  creating: { label: "Creating", tone: "info" },
  created: { label: "Created", tone: "ok" },
  deduplicated: { label: "Already created", tone: "teal" },
  failed: { label: "Failed", tone: "alert" },
  not_attempted: { label: "Not attempted", tone: "warn" },
};

function updateRow(
  rows: ImportRow[],
  rowNumber: number,
  patch: Partial<ImportRow>,
): ImportRow[] {
  return rows.map((row) =>
    row.rowNumber === rowNumber ? { ...row, ...patch } : row,
  );
}

export function BulkQuoteImportWorkspace({
  verticalLabel,
  vertical,
  failedFilename,
  schema,
  foreignMarkers,
  summarize,
}: BulkQuoteImportWorkspaceProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [batchId, setBatchId] = useState("");
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState("");
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  const validRows = rows.filter(
    (row) => row.normalized !== null && row.errors.length === 0,
  );
  const readyRows = rows.filter((row) => row.status === "ready");
  const retryRows = rows.filter(
    (row) => row.status === "failed" || row.status === "not_attempted",
  );
  const completedRows = rows.filter(
    (row) => row.status === "created" || row.status === "deduplicated",
  );
  const invalidRows = rows.filter((row) => row.status === "invalid");
  const hasResults = rows.some((row) =>
    ["created", "deduplicated", "failed", "not_attempted"].includes(row.status),
  );

  function clearUpload() {
    setRows([]);
    setFileName("");
    setFileError("");
    setPasteOpen(false);
    setPasteText("");
    setBatchId("");
    setRunMessage("");
    setProgress({ completed: 0, total: 0 });
    if (inputRef.current) inputRef.current.value = "";
  }

  function prepareJsonText(
    text: string,
    fileSize: number,
    sourceLabel: string,
  ) {
    setFileError("");
    setRunMessage("");
    const result = parseBulkQuoteImport(
      { text, fileSize },
      {
        schema,
        knownFields: zodInputFieldNames(schema),
        foreignMarkers,
        summarize,
      },
    );
    if (!result.ok) {
      setRows([]);
      setFileName(sourceLabel);
      setBatchId("");
      setFileError(result.error);
      return false;
    }
    setRows(
      result.rows.map((row) => ({
        ...row,
        status: row.normalized && row.errors.length === 0 ? "ready" : "invalid",
      })),
    );
    setFileName(sourceLabel);
    setBatchId(crypto.randomUUID());
    setProgress({ completed: 0, total: 0 });
    return true;
  }

  async function prepareFile(file: File | undefined) {
    if (!file) return;
    setFileError("");
    setRunMessage("");
    if (file.size > BULK_QUOTE_IMPORT_MAX_FILE_BYTES) {
      setRows([]);
      setFileName(file.name);
      setBatchId("");
      setFileError("Choose a JSON file no larger than 2 MiB.");
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setRows([]);
      setFileName(file.name);
      setBatchId("");
      setFileError(
        "That file could not be read. Choose it again or try another file.",
      );
      return;
    }
    if (prepareJsonText(text, file.size, file.name)) {
      setPasteOpen(false);
      setPasteText("");
    }
  }

  function togglePasteInput() {
    const nextOpen = !pasteOpen;
    setPasteOpen(nextOpen);
    if (nextOpen) {
      requestAnimationFrame(() => pasteRef.current?.focus());
    }
  }

  function reviewPastedJson() {
    if (!pasteText.trim()) {
      setRows([]);
      setFileName("Pasted JSON");
      setBatchId("");
      setFileError("Paste a JSON array before reviewing it.");
      return;
    }
    const pastedBytes = new Blob([pasteText]).size;
    if (pastedBytes > BULK_QUOTE_IMPORT_MAX_FILE_BYTES) {
      setRows([]);
      setFileName("Pasted JSON");
      setBatchId("");
      setFileError("Paste JSON no larger than 2 MiB.");
      return;
    }
    if (prepareJsonText(pasteText, pastedBytes, "Pasted JSON")) {
      setPasteOpen(false);
    }
  }

  function markRemainingNotAttempted(targets: ImportRow[], afterIndex: number) {
    const remaining = new Set(
      targets.slice(afterIndex + 1).map((row) => row.rowNumber),
    );
    setRows((current) =>
      current.map((row) =>
        remaining.has(row.rowNumber)
          ? { ...row, status: "not_attempted", resultError: undefined }
          : row,
      ),
    );
  }

  async function runImport(targets: ImportRow[]) {
    if (running || !batchId || targets.length === 0) return;
    setRunning(true);
    setRunMessage("");
    setProgress({ completed: 0, total: targets.length });

    for (let index = 0; index < targets.length; index += 1) {
      const row = targets[index];
      if (!row.normalized) continue;
      setRows((current) =>
        updateRow(current, row.rowNumber, {
          status: "creating",
          resultError: undefined,
        }),
      );
      try {
        const quote = await saveDemoForm(vertical, row.normalized);
        setRows((current) =>
          updateRow(current, row.rowNumber, {
            status: "created",
            quoteId: quote.id,
            resultError: undefined,
          }),
        );
      } catch (error) {
        setRows((current) =>
          updateRow(current, row.rowNumber, {
            status: "failed",
            resultError:
              error instanceof Error
                ? error.message
                : "This browser could not save the row. It is safe to retry.",
          }),
        );
        if (
          error instanceof DemoStoreError &&
          [
            "unavailable",
            "storage_full",
            "storage_failure",
            "blocked",
          ].includes(error.code)
        ) {
          markRemainingNotAttempted(targets, index);
          setRunMessage(
            "Browser storage is unavailable. Retry the failed and not-attempted rows after resolving the storage issue.",
          );
          setProgress({ completed: index + 1, total: targets.length });
          setRunning(false);
          return;
        }
      }
      setProgress({ completed: index + 1, total: targets.length });
    }
    setRunning(false);
    setRunMessage(
      "Bulk import finished. Drafts are saved in this browser. Review the result for each row below.",
    );
  }

  function downloadSample() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify([sampleInput(vertical)], null, 2) + "\n"], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${vertical}-loan-example-inputs.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadUnresolvedRows() {
    const contents = failedBulkQuoteRowsJson(rows);
    const url = URL.createObjectURL(
      new Blob([contents], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = failedFilename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="bulk-upload-heading">
        <div className="border-y border-border px-3 py-5 sm:px-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2
                id="bulk-upload-heading"
                className="text-sm font-semibold text-ink"
              >
                Upload quote inputs
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
                Upload or paste one JSON array containing up to 25 exported{" "}
                {verticalLabel.toLowerCase()} quote-input objects. Each valid
                row will be repriced and saved as a new Draft in this browser.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={downloadSample}
                disabled={running}
              >
                <Download size={16} strokeWidth={1.8} aria-hidden />
                Download example JSON
              </Button>
              <label
                data-bulk-quote-upload
                className="relative inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-border-strong bg-surface/80 px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-panel focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand"
              >
                <Upload size={16} strokeWidth={1.8} aria-hidden />
                {fileName ? "Choose another file" : "Choose JSON file"}
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/json,.json"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  disabled={running}
                  onClick={(event) => {
                    event.currentTarget.value = "";
                  }}
                  onChange={(event) =>
                    void prepareFile(event.target.files?.[0])
                  }
                />
              </label>
              <Button
                variant="secondary"
                aria-expanded={pasteOpen}
                aria-controls="bulk-paste-input"
                onClick={togglePasteInput}
                disabled={running}
              >
                <ClipboardPaste size={16} strokeWidth={1.8} aria-hidden />
                {pasteOpen ? "Close paste input" : "Paste JSON"}
              </Button>
            </div>
          </div>
          {pasteOpen && (
            <div
              id="bulk-paste-input"
              className="mt-4 border-t border-border pt-4"
            >
              <label
                htmlFor="bulk-pasted-json"
                className="text-sm font-medium text-ink"
              >
                Paste JSON array
              </label>
              <p
                id="bulk-pasted-json-help"
                className="mt-1 text-xs leading-relaxed text-muted"
              >
                Paste the exported quote-input array below, then review it
                before creating any Drafts.
              </p>
              <textarea
                ref={pasteRef}
                id="bulk-pasted-json"
                aria-describedby="bulk-pasted-json-help"
                value={pasteText}
                onChange={(event) => {
                  setPasteText(event.target.value);
                  if (fileError) setFileError("");
                }}
                rows={8}
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                className={`${inp} mt-3 min-h-40 resize-y font-mono leading-relaxed`}
                placeholder='[{ "customerReference": "Example", ... }]'
              />
              <div className="mt-3 flex justify-end">
                <Button
                  variant={rows.length === 0 ? "primary" : "secondary"}
                  onClick={reviewPastedJson}
                  disabled={running}
                >
                  Review pasted JSON
                </Button>
              </div>
            </div>
          )}
          <p className="mt-3 flex items-center gap-2 text-xs text-muted">
            <FileJson size={14} strokeWidth={1.8} aria-hidden />
            JSON array only · 2 MiB maximum for file or paste · revisions and
            mixed verticals are rejected
          </p>
          {fileError && (
            <p role="alert" className="mt-3 text-sm text-alert">
              {fileError}
            </p>
          )}
        </div>
      </section>

      {rows.length > 0 && (
        <section
          aria-labelledby="bulk-preview-heading"
          className={adminTableShell}
        >
          <div className="flex flex-wrap items-start justify-between gap-3 px-3 pb-3 pt-4">
            <div>
              <h2
                id="bulk-preview-heading"
                className="text-sm font-semibold text-ink"
              >
                {hasResults ? "Import results" : "Review upload"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {fileName} · {validRows.length} valid · {invalidRows.length}{" "}
                invalid
                {hasResults ? ` · ${completedRows.length} completed` : ""}
              </p>
            </div>
            <Badge tone={invalidRows.length > 0 ? "warn" : "ok"}>
              {validRows.length} of {rows.length} can be created
            </Badge>
          </div>

          <div className={responsiveAdminTableScroll} tabIndex={0}>
            <table className={responsiveAdminTable}>
              <caption className="sr-only">
                Preview and import status for {verticalLabel} quote rows
              </caption>
              <thead className={responsiveAdminTableHead}>
                <tr>
                  <th className={th} scope="col">
                    Row
                  </th>
                  <th className={th} scope="col">
                    Customer or business
                  </th>
                  <th className={th} scope="col">
                    Scenario
                  </th>
                  <th className={th} scope="col">
                    Amount
                  </th>
                  <th className={th} scope="col">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className={responsiveAdminTableBody}>
                {rows.map((row) => {
                  const presentation = STATUS_PRESENTATION[row.status];
                  return (
                    <tr key={row.rowNumber} className={responsiveAdminTableRow}>
                      <td className={responsiveAdminTableCell}>
                        <span className={responsiveAdminMobileLabel}>Row</span>
                        <span className="tnum text-xs text-muted">
                          {row.rowNumber}
                        </span>
                      </td>
                      <td className={responsiveAdminTableCell}>
                        <span className={responsiveAdminMobileLabel}>
                          Customer or business
                        </span>
                        <span className="font-medium text-ink">
                          {row.summary.label}
                        </span>
                        {row.errors.length > 0 && (
                          <ul className="mt-1 space-y-1 text-xs leading-relaxed text-alert">
                            {row.errors.map((error) => (
                              <li key={error}>{error}</li>
                            ))}
                          </ul>
                        )}
                        {row.unknownFields.length > 0 && (
                          <p className="mt-1 text-xs leading-relaxed text-warn">
                            Ignored unknown{" "}
                            {row.unknownFields.length === 1
                              ? "field"
                              : "fields"}
                            : {row.unknownFields.join(", ")}
                          </p>
                        )}
                      </td>
                      <td className={responsiveAdminTableCell}>
                        <span className={responsiveAdminMobileLabel}>
                          Scenario
                        </span>
                        <span>{row.summary.scenario}</span>
                      </td>
                      <td className={responsiveAdminTableCell}>
                        <span className={responsiveAdminMobileLabel}>
                          Amount
                        </span>
                        <span className="tnum">
                          {fmtMoney(row.summary.amount)}
                        </span>
                      </td>
                      <td className={responsiveAdminTableCell}>
                        <span className={responsiveAdminMobileLabel}>
                          Status
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={presentation.tone}>
                            {presentation.label}
                          </Badge>
                          {row.quoteId && (
                            <Link
                              href={quoteHref(vertical, row.quoteId)}
                              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-xs font-medium text-brand hover:bg-panel"
                            >
                              View quote
                              <ExternalLink
                                size={13}
                                strokeWidth={1.8}
                                aria-hidden
                              />
                            </Link>
                          )}
                        </div>
                        {row.resultError && (
                          <p className="mt-1 max-w-sm text-xs leading-relaxed text-alert">
                            {row.resultError}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearUpload}
                disabled={running}
              >
                <X size={15} strokeWidth={1.8} aria-hidden />
                Clear
              </Button>
              {hasResults && completedRows.length < rows.length && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={downloadUnresolvedRows}
                  disabled={running}
                >
                  <Download size={15} strokeWidth={1.8} aria-hidden />
                  Download unresolved rows
                </Button>
              )}
              {retryRows.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void runImport(retryRows)}
                  disabled={running}
                >
                  <RotateCcw size={15} strokeWidth={1.8} aria-hidden />
                  Retry {retryRows.length}{" "}
                  {retryRows.length === 1 ? "row" : "rows"}
                </Button>
              )}
            </div>
            {!hasResults && readyRows.length > 0 && (
              <Button
                variant="primary"
                onClick={() => void runImport(readyRows)}
                disabled={running}
              >
                Create {readyRows.length} Draft{" "}
                {readyRows.length === 1 ? "quote" : "quotes"}
              </Button>
            )}
          </div>
        </section>
      )}

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="min-h-6 text-sm text-muted"
      >
        {running && progress.total > 0 && (
          <div className="space-y-2">
            <p>
              Creating row {Math.min(progress.completed + 1, progress.total)} of{" "}
              {progress.total}…
            </p>
            <progress
              className="h-1.5 w-full max-w-md accent-brand"
              max={progress.total}
              value={progress.completed}
            >
              {progress.completed} of {progress.total}
            </progress>
          </div>
        )}
        {!running && runMessage && <p>{runMessage}</p>}
      </div>
    </div>
  );
}
