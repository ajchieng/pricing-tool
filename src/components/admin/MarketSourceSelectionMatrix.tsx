"use client";

import { useState, useTransition } from "react";
import { saveDemoMarketSelections } from "@/lib/demo/market-configuration";
import { reportConfigurationResult } from "@/lib/demo/configuration-react";
import { btn, btnGhost, inp } from "@/components/adminUi";
import type { MarketSearchVertical } from "@/lib/market/verticals";

type SourceSelection = {
  id: number;
  lenderName: string;
  brandName: string | null;
  operationalAvailable: boolean;
  isOwnBrand: boolean;
  home: boolean;
  personal: boolean;
  commercial: boolean;
};

const COLUMNS: Array<{ vertical: MarketSearchVertical; label: string }> = [
  { vertical: "home", label: "Home" },
  { vertical: "personal", label: "Personal" },
  { vertical: "commercial", label: "Commercial" },
];

export function MarketSourceSelectionMatrix({
  sources,
  configurationVersion,
}: {
  sources: SourceSelection[];
  configurationVersion: number;
}) {
  const [draftConfigurationVersion, setDraftConfigurationVersion] =
    useState(configurationVersion);
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(() =>
    Object.fromEntries(
      sources.map((source) => [
        source.id,
        {
          home: source.home,
          personal: source.personal,
          commercial: source.commercial,
        },
      ]),
    ),
  );

  function setColumn(vertical: MarketSearchVertical, enabled: boolean) {
    setSelected((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, values]) => [
          id,
          {
            ...values,
            [vertical]: sources.find((source) => source.id === Number(id))
              ?.isOwnBrand
              ? false
              : enabled,
          },
        ]),
      ),
    );
  }

  function save(formData: FormData) {
    startTransition(async () => {
      try {
        const next = await saveDemoMarketSelections(
          draftConfigurationVersion,
          selected,
          String(formData.get("changeReason") ?? ""),
        );
        setDraftConfigurationVersion(next.version);
        reportConfigurationResult(
          "Lender selections saved for Market Search in this browser.",
          "success",
        );
      } catch (error) {
        reportConfigurationResult(
          error instanceof Error
            ? error.message
            : "Lender selections could not be saved.",
          "error",
        );
      }
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save(new FormData(event.currentTarget));
      }}
    >
      {draftConfigurationVersion !== configurationVersion && (
        <p
          role="status"
          className="border-b border-warn/40 bg-warn-soft px-4 py-3 text-sm"
        >
          Configuration changed while these selections were open. Your draft is
          preserved; use Reset changes to load the current selections before
          saving.
        </p>
      )}
      <div
        className="relative overflow-x-auto"
        role="region"
        tabIndex={0}
        aria-label="Market Search lender selection matrix"
      >
        <table className="w-full min-w-[620px] text-sm">
          <thead className="border-b border-border-strong">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-muted">
                Lender
              </th>
              {COLUMNS.map(({ vertical, label }) => (
                <th
                  key={vertical}
                  className="px-4 py-3 text-center font-semibold text-muted"
                >
                  <span className="block">{label}</span>
                  <span className="mt-1 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setColumn(vertical, true)}
                      className="min-h-11 text-xs font-semibold text-brand hover:text-brand-strong"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setColumn(vertical, false)}
                      className="min-h-11 text-xs font-semibold text-muted hover:text-ink"
                    >
                      Clear all
                    </button>
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-left font-semibold text-muted">
                Catalogue
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sources.map((source) => (
              <tr key={source.id}>
                <td className="px-4 py-3">
                  <input type="hidden" name="sourceId" value={source.id} />
                  <span className="font-semibold text-ink">
                    {source.brandName ?? source.lenderName}
                  </span>
                  {source.brandName &&
                  source.brandName !== source.lenderName ? (
                    <span className="mt-0.5 block text-xs text-faint">
                      {source.lenderName}
                    </span>
                  ) : null}
                  {source.isOwnBrand ? (
                    <span className="mt-1 block text-xs text-faint">
                      Own brand · excluded from competitor evidence
                    </span>
                  ) : null}
                </td>
                {COLUMNS.map(({ vertical, label }) => (
                  <td key={vertical} className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      name={`${vertical}:${source.id}`}
                      checked={selected[source.id]?.[vertical] ?? false}
                      disabled={source.isOwnBrand || pending}
                      onChange={(event) =>
                        setSelected((current) => ({
                          ...current,
                          [source.id]: {
                            ...current[source.id],
                            [vertical]: event.target.checked,
                          },
                        }))
                      }
                      aria-label={`${label} Loans — ${source.brandName ?? source.lenderName}`}
                      className="size-5"
                    />
                  </td>
                ))}
                <td className="px-4 py-3 text-xs">
                  <span
                    className={
                      source.operationalAvailable ? "text-ok" : "text-warn"
                    }
                  >
                    {source.operationalAvailable ? "Available" : "Unavailable"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-border bg-panel px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="block flex-1 text-xs font-semibold text-muted">
          Change reason
          <input
            name="changeReason"
            maxLength={500}
            placeholder="Why are these lender selections changing?"
            className={`${inp} mt-1.5`}
          />
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelected(
                Object.fromEntries(
                  sources.map((source) => [
                    source.id,
                    {
                      home: source.home,
                      personal: source.personal,
                      commercial: source.commercial,
                    },
                  ]),
                ),
              );
              setDraftConfigurationVersion(configurationVersion);
            }}
            className={btnGhost}
          >
            Reset changes
          </button>
          <button type="submit" className={btn} disabled={pending}>
            {pending ? "Saving…" : "Save selections"}
          </button>
        </div>
      </div>
    </form>
  );
}
