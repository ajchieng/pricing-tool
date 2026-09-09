"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Search, X } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import {
  aliasesForParameter,
  compactParameterValue,
  dedupeParameterSearchItems,
  groupParameterSearchItems,
  parameterValueFromControlSnapshots,
  rankParameterSearchItems,
  type QuoteParameterControlSnapshot,
  type QuoteParameterKind,
  type QuoteParameterSearchItem,
} from "@/lib/quotes/parameter-search";

type BrowserParameterEntry = QuoteParameterSearchItem<HTMLElement>;

const RESULT_LIMIT = 24;

function isSuppressedByDisplayMode(element: HTMLElement): boolean {
  const conditional = element.closest<HTMLElement>(
    ".simple-only, .simple-optional",
  );
  return conditional ? getComputedStyle(conditional).display === "none" : false;
}

function controlLabel(control: HTMLInputElement): string {
  const wrappingLabel = control.closest("label");
  const explicitLabel = control.id
    ? document.querySelector<HTMLLabelElement>(
        `label[for="${CSS.escape(control.id)}"]`,
      )
    : null;
  return compactParameterValue(
    wrappingLabel?.textContent ?? explicitLabel?.textContent ?? control.value,
  );
}

function controlSnapshots(
  target: HTMLElement,
): QuoteParameterControlSnapshot[] {
  const controls = Array.from(
    target.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >('input:not([type="hidden"]), select, textarea'),
  ).filter((control) => !control.disabled);
  if (controls.length === 0) return [];

  const radioGroups = new Set<string>();
  const checkboxCount = controls.filter(
    (control) =>
      control instanceof HTMLInputElement && control.type === "checkbox",
  ).length;
  const snapshots: QuoteParameterControlSnapshot[] = [];
  for (const control of controls) {
    if (control instanceof HTMLSelectElement) {
      const selected = Array.from(control.selectedOptions)
        .map((option) => option.textContent?.trim() ?? option.value)
        .filter(Boolean);
      snapshots.push({ kind: "select", selected });
      continue;
    }
    if (control instanceof HTMLTextAreaElement) {
      snapshots.push({ kind: "text", value: control.value });
      continue;
    }
    if (control.type === "radio") {
      const group = control.name || control.id;
      if (radioGroups.has(group)) continue;
      radioGroups.add(group);
      const checked = controls.find(
        (candidate): candidate is HTMLInputElement =>
          candidate instanceof HTMLInputElement &&
          candidate.type === "radio" &&
          (candidate.name || candidate.id) === group &&
          candidate.checked,
      );
      snapshots.push({
        kind: "radio",
        checkedLabel: checked ? controlLabel(checked) : undefined,
      });
      continue;
    }
    if (control.type === "checkbox") {
      snapshots.push({
        kind: "checkbox",
        checked: control.checked,
        label: controlLabel(control),
        booleanValue: checkboxCount === 1,
      });
      continue;
    }
    snapshots.push({ kind: "text", value: control.value });
  }
  return snapshots;
}

function parameterValue(target: HTMLElement): string {
  const markedValue = target.matches("[data-quote-parameter-value]")
    ? target
    : target.querySelector<HTMLElement>("[data-quote-parameter-value]");
  return parameterValueFromControlSnapshots(
    controlSnapshots(target),
    markedValue?.textContent ?? "",
  );
}

function collectQuoteParameters(): BrowserParameterEntry[] {
  const targets = Array.from(
    document.querySelectorAll<HTMLElement>(
      "[data-quote-parameter-scope] [data-quote-parameter-label]",
    ),
  ).filter((target) => !isSuppressedByDisplayMode(target));
  const entries = targets.flatMap((target, index) => {
    const scope = target.closest<HTMLElement>("[data-quote-parameter-scope]");
    const kind = scope?.dataset.quoteParameterScope as
      QuoteParameterKind | undefined;
    const label = target.dataset.quoteParameterLabel?.trim();
    if (!scope || !label || (kind !== "input" && kind !== "result")) return [];

    const groupTarget = target.closest<HTMLElement>(
      "[data-quote-parameter-group]",
    );
    const group =
      groupTarget?.dataset.quoteParameterGroup?.trim() ||
      (kind === "input" ? "Quote inputs" : "Pricing result");
    const value = parameterValue(target);
    const identity = `${kind}|${label}|${group}|${value}`;

    return [
      {
        key: target.dataset.quoteParameterKey || `${identity}|${index}`,
        label,
        aliases: aliasesForParameter(label),
        group,
        kind,
        value,
        target,
      },
    ];
  });
  return dedupeParameterSearchItems(entries);
}

function focusableControl(target: HTMLElement): HTMLElement | null {
  return target.querySelector<HTMLElement>(
    'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]',
  );
}

function openAncestors(target: HTMLElement) {
  const details = Array.from(
    target.closest("details") ? [target.closest("details")!] : [],
  );
  let ancestor = target.parentElement?.closest("details");
  while (ancestor) {
    if (!details.includes(ancestor)) details.push(ancestor);
    ancestor = ancestor.parentElement?.closest("details") ?? null;
  }
  details.reverse().forEach((detail) => {
    detail.open = true;
  });

  const section = target.closest<HTMLElement>("section[aria-labelledby]");
  const toggleId = section?.id ? `${section.id}-toggle` : null;
  const toggle = toggleId ? document.getElementById(toggleId) : null;
  if (toggle?.getAttribute("aria-expanded") === "false") toggle.click();
}

function revealParameter(entry: BrowserParameterEntry) {
  openAncestors(entry.target);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      entry.target.setAttribute("data-search-highlight", "true");
      entry.target.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center",
        inline: "nearest",
      });
      const control = focusableControl(entry.target);
      if (control) {
        control.focus({ preventScroll: true });
      } else {
        entry.target.tabIndex = -1;
        entry.target.focus({ preventScroll: true });
      }
      window.setTimeout(
        () => {
          entry.target.removeAttribute("data-search-highlight");
        },
        reducedMotion ? 700 : 1800,
      );
    });
  });
}

export interface QuoteParameterFinderHandle {
  open: () => void;
}

export const QuoteParameterFinder = forwardRef<
  QuoteParameterFinderHandle,
  { triggerClassName?: string }
>(function QuoteParameterFinder({ triggerClassName = "" }, forwardedRef) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef(true);
  const [entries, setEntries] = useState<BrowserParameterEntry[]>([]);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const titleId = useId();
  const descriptionId = useId();
  const resultsId = useId();
  const statusId = useId();

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const inputs = rankParameterSearchItems(
      entries.filter((entry) => entry.kind === "input"),
      query,
    );
    const results = rankParameterSearchItems(
      entries.filter((entry) => entry.kind === "result"),
      query,
    );
    return [...inputs, ...results].slice(0, RESULT_LIMIT);
  }, [entries, query]);

  function openDialog() {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : triggerRef.current;
    restoreFocusRef.current = true;
    setEntries(collectQuoteParameters());
    setQuery("");
    setActiveIndex(0);
    dialogRef.current?.showModal();
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  useImperativeHandle(forwardedRef, () => ({ open: openDialog }));

  function choose(entry: BrowserParameterEntry) {
    restoreFocusRef.current = false;
    closeDialog();
    revealParameter(entry);
  }

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        if (dialogRef.current?.open) searchRef.current?.focus();
        else openDialog();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!dialogRef.current?.open || matches.length === 0) return;
    const optionIndex = Math.min(activeIndex, matches.length - 1);
    document
      .getElementById(`${resultsId}-option-${optionIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, matches.length, resultsId]);

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (matches.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + matches.length) % matches.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(matches.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(matches[Math.min(activeIndex, matches.length - 1)]);
    }
  }

  const { inputs: inputMatches, results: resultMatches } =
    groupParameterSearchItems(matches);
  let flatIndex = -1;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDialog}
        className={buttonClass("secondary", "sm", triggerClassName)}
        aria-keyshortcuts="Meta+K Control+K"
      >
        <Search size={15} strokeWidth={1.8} aria-hidden />
        Find parameter
        <span className="hidden text-[11px] font-normal text-faint xl:inline">
          ⌘/Ctrl K
        </span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={() => {
          if (restoreFocusRef.current) previousFocusRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        className="quote-parameter-dialog overflow-hidden border-0 bg-surface p-0 text-ink shadow-[var(--shadow-lg)] sm:rounded-2xl sm:border sm:border-border"
      >
        <div className="flex h-full min-h-0 flex-col sm:h-auto">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-ink">
                Find a quote parameter
              </h2>
              <p id={descriptionId} className="mt-1 text-sm text-muted">
                Search the inputs and calculated results available on this
                quote.
              </p>
            </div>
            <button
              type="button"
              onClick={closeDialog}
              className={buttonClass("ghost", "sm", "shrink-0 px-3")}
              aria-label="Close parameter finder"
            >
              <X size={18} strokeWidth={1.8} aria-hidden />
            </button>
          </header>

          <div className="shrink-0 border-b border-border p-4 sm:px-5">
            <label htmlFor={`${resultsId}-search`} className="sr-only">
              Search inputs and results
            </label>
            <div className="relative">
              <Search
                size={17}
                strokeWidth={1.8}
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                ref={searchRef}
                id={`${resultsId}-search`}
                type="search"
                role="combobox"
                aria-autocomplete="list"
                aria-controls={resultsId}
                aria-describedby={statusId}
                aria-expanded={query.trim() ? true : false}
                aria-activedescendant={
                  matches.length > 0
                    ? `${resultsId}-option-${Math.min(activeIndex, matches.length - 1)}`
                    : undefined
                }
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search inputs and results…"
                className="min-h-12 w-full rounded-lg border border-border-strong bg-surface py-2 pl-10 pr-3 text-base text-ink placeholder:text-faint sm:text-sm"
              />
            </div>
            <p
              id={statusId}
              role="status"
              aria-live="polite"
              className="sr-only"
            >
              {query.trim()
                ? `${matches.length} matching parameter${matches.length === 1 ? "" : "s"}.`
                : "Type a parameter name to search."}
            </p>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto sm:max-h-[min(52dvh,28rem)] sm:flex-none"
            id={resultsId}
            role={matches.length > 0 ? "listbox" : undefined}
          >
            {!query.trim() ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-medium text-ink">
                  Start with a parameter name
                </p>
                <p className="mt-1 text-sm text-muted">
                  Try “credit score”, “ECL”, “loan to value” or “DSCR”.
                </p>
              </div>
            ) : matches.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-medium text-ink">
                  No available parameter found
                </p>
                <p className="mt-1 text-sm text-muted">
                  Check the wording or calculate the quote to make result
                  parameters available.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {[
                  ["Inputs", inputMatches],
                  ["Results", resultMatches],
                ].map(([heading, groupEntries]) => {
                  const typedEntries = groupEntries as BrowserParameterEntry[];
                  if (typedEntries.length === 0) return null;
                  return (
                    <section
                      key={heading as string}
                      aria-label={heading as string}
                    >
                      <h3 className="sticky top-0 z-10 border-b border-border bg-panel/95 px-5 py-2 text-xs font-semibold text-muted">
                        {heading as string}
                      </h3>
                      <ul>
                        {typedEntries.map((entry) => {
                          flatIndex += 1;
                          const optionIndex = flatIndex;
                          return (
                            <li key={entry.key}>
                              <button
                                id={`${resultsId}-option-${optionIndex}`}
                                type="button"
                                role="option"
                                tabIndex={-1}
                                aria-selected={optionIndex === activeIndex}
                                onMouseMove={() => setActiveIndex(optionIndex)}
                                onClick={() => choose(entry)}
                                className={`grid w-full grid-cols-[minmax(0,1fr)_minmax(6rem,0.42fr)] gap-4 border-b border-border/70 px-5 py-3 text-left transition-colors last:border-b-0 ${
                                  optionIndex === activeIndex
                                    ? "bg-brand-tint"
                                    : "hover:bg-panel/60"
                                }`}
                              >
                                <span className="min-w-0">
                                  <span className="block text-sm font-semibold text-ink">
                                    {entry.label}
                                  </span>
                                  <span className="mt-0.5 block truncate text-xs text-muted">
                                    {entry.group}
                                  </span>
                                </span>
                                <span
                                  className="tnum min-w-0 truncate text-right text-sm font-medium text-ink"
                                  title={entry.value}
                                >
                                  {entry.value}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
          </div>

          <footer className="hidden shrink-0 border-t border-border px-5 py-2 text-xs text-faint sm:flex sm:items-center sm:justify-between">
            <span>↑ ↓ navigate · Enter open · Esc close</span>
            <span>Values stay on this page</span>
          </footer>
        </div>
      </dialog>
    </>
  );
});
