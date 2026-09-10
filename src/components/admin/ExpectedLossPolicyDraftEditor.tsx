"use client";

import { useMemo, useState, useTransition } from "react";
import { mutateDemoConfiguration } from "@/lib/demo/configuration";
import { scheduleDemoConfigurationChange } from "@/lib/demo/configuration-governance";
import { reportConfigurationResult } from "@/lib/demo/configuration-react";
import { AsyncStatus } from "@/components/ui/AsyncStatus";
import { btn, inp } from "@/components/adminUi";

type Vertical = "home" | "personal" | "commercial";

type DraftBand = Record<string, unknown>;

function parseArray(value: string): DraftBand[] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) &&
      parsed.every(
        (item) =>
          item !== null && typeof item === "object" && !Array.isArray(item),
      )
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function formatted(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function ExpectedLossPolicyDraftEditor({
  vertical,
  nextVersion,
  configurationVersion,
  riskDefinitionHash,
  sourceScoreModelVersion,
  lgdScopes,
  eadScopes,
  effectiveFrom,
  onReload,
}: {
  vertical: Vertical;
  nextVersion: number;
  configurationVersion: number;
  riskDefinitionHash: string;
  sourceScoreModelVersion: number;
  lgdScopes: string[];
  eadScopes: string[];
  effectiveFrom: string;
  onReload?: () => void;
}) {
  const [draftConfigurationVersion] = useState(configurationVersion);
  const [pending, startTransition] = useTransition();
  const [publishError, setPublishError] = useState<string | null>(null);
  const [pdBands, setPdBands] = useState(
    formatted([
      {
        riskGrade: "",
        minRiskScore: 0,
        annualPdPct: null,
        active: true,
      },
    ]),
  );
  const [lgdBands, setLgdBands] = useState(
    formatted(
      lgdScopes.map((lossScope) => ({
        lossScope,
        lgdPct: null,
        active: true,
      })),
    ),
  );
  const [eadSettings, setEadSettings] = useState(
    formatted(
      eadScopes.map((exposureScope) => ({
        exposureScope,
        method:
          exposureScope === "overdraft"
            ? "drawn_plus_ccf_undrawn"
            : exposureScope === "interest_only"
              ? "expected_principal"
              : "one_year_scheduled_balance",
        undrawnCcfPct: null,
        active: true,
      })),
    ),
  );
  const [previewEad, setPreviewEad] = useState("");
  const [previewPd, setPreviewPd] = useState("");
  const [previewLgd, setPreviewLgd] = useState("");

  const validation = useMemo(() => {
    const pd = parseArray(pdBands);
    const lgd = parseArray(lgdBands);
    const ead = parseArray(eadSettings);
    const errors: string[] = [];
    if (!pd) errors.push("PD bands must be valid JSON.");
    if (!lgd) errors.push("LGD bands must be valid JSON.");
    if (!ead) errors.push("EAD settings must be valid JSON.");
    if (pd && pd.length === 0) errors.push("At least one PD band is required.");
    for (const scope of lgdScopes) {
      if (!lgd?.some((item) => item.lossScope === scope)) {
        errors.push(`Missing LGD scope: ${scope}.`);
      }
    }
    for (const scope of eadScopes) {
      if (!ead?.some((item) => item.exposureScope === scope)) {
        errors.push(`Missing EAD scope: ${scope}.`);
      }
    }
    const incomplete =
      [...(pd ?? []), ...(lgd ?? [])].some((item) =>
        Object.values(item).some((value) => value === null),
      ) ||
      (ead ?? []).some(
        (item) =>
          item.method === "drawn_plus_ccf_undrawn" &&
          item.undrawnCcfPct == null,
      );
    if (incomplete) errors.push("Enter every PD, LGD and required CCF value.");
    return errors;
  }, [eadScopes, eadSettings, lgdBands, lgdScopes, pdBands]);

  const preview =
    previewEad !== "" && previewPd !== "" && previewLgd !== ""
      ? Number(previewEad) *
        (Number(previewPd) / 100) *
        (Number(previewLgd) / 100)
      : null;

  function publishPolicy(formData: FormData) {
    setPublishError(null);
    startTransition(async () => {
      try {
        const data = {
          vertical,
          version: Number(formData.get("version")),
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? "").trim() || null,
          compatibleRiskDefinitionHash: riskDefinitionHash,
          sourceScoreModelArea: vertical,
          sourceScoreModelVersion,
          effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim(),
          effectiveTo: String(formData.get("effectiveTo") ?? "").trim() || null,
          active: true,
          pdBands: parseArray(pdBands),
          lgdBands: parseArray(lgdBands),
          eadSettings: parseArray(eadSettings),
        };
        const mutation = {
          targetType: "expected_loss_policy" as const,
          action: "create" as const,
          data,
          reason: String(formData.get("changeReason") ?? ""),
        };
        const effectiveAt = new Date(data.effectiveFrom);
        if (effectiveAt.getTime() > Date.now()) {
          await scheduleDemoConfigurationChange({
            expectedVersion: draftConfigurationVersion,
            mutation,
            summary: `Publish ${data.name} v${data.version}`,
            effectiveAt: effectiveAt.toISOString(),
          });
          reportConfigurationResult(
            "Expected-loss policy scheduled in the approval queue. The current policy remains active; publish the scheduled change when due.",
            "success",
          );
        } else {
          await mutateDemoConfiguration({
            expectedVersion: draftConfigurationVersion,
            ...mutation,
          });
          reportConfigurationResult(
            "Expected-loss policy published for calculations in this browser.",
            "success",
          );
        }
        onReload?.();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The expected-loss policy could not be published.";
        setPublishError(message);
        reportConfigurationResult(message, "error");
      }
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        publishPolicy(new FormData(event.currentTarget));
      }}
      className="space-y-5"
    >
      {draftConfigurationVersion !== configurationVersion && (
        <div className="rounded-lg border border-warn/40 bg-warn-soft p-3 text-sm">
          <p>
            This draft is preserved, but configuration changed while it was
            open. Reload the policy before publishing.
          </p>
          <button type="button" className={`${btn} mt-2`} onClick={onReload}>
            Reload active policy
          </button>
        </div>
      )}
      <input type="hidden" name="vertical" value={vertical} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-ink">
          Policy version
          <input
            className={`${inp} mt-1`}
            type="number"
            name="version"
            min="1"
            step="1"
            defaultValue={nextVersion}
            required
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Policy name
          <input className={`${inp} mt-1`} name="name" required />
        </label>
        <label className="text-sm font-medium text-ink">
          Effective from
          <input
            className={`${inp} mt-1`}
            type="date"
            name="effectiveFrom"
            defaultValue={effectiveFrom}
            required
          />
          <span className="mt-1 block text-xs font-normal text-muted">
            Future dates schedule publication through the approval queue.
          </span>
        </label>
        <label className="text-sm font-medium text-ink">
          Effective to (optional)
          <input className={`${inp} mt-1`} type="date" name="effectiveTo" />
        </label>
        <label className="text-sm font-medium text-ink md:col-span-2">
          Description
          <textarea className={`${inp} mt-1 min-h-20`} name="description" />
        </label>
      </div>

      <div className="rounded-lg border border-border bg-panel p-3 text-xs text-muted">
        <p>
          Active score model: v{sourceScoreModelVersion}. Compatible Risk
          definition:
        </p>
        <code className="mt-1 block break-all text-ink">
          {riskDefinitionHash}
        </code>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <label className="text-sm font-medium text-ink">
          PD grades and bands
          <textarea
            className={`${inp} mt-1 min-h-80 font-mono text-xs`}
            name="pdBands"
            value={pdBands}
            onChange={(event) => setPdBands(event.target.value)}
            spellCheck={false}
            required
          />
        </label>
        <label className="text-sm font-medium text-ink">
          LGD scopes
          <textarea
            className={`${inp} mt-1 min-h-80 font-mono text-xs`}
            name="lgdBands"
            value={lgdBands}
            onChange={(event) => setLgdBands(event.target.value)}
            spellCheck={false}
            required
          />
        </label>
        <label className="text-sm font-medium text-ink">
          EAD methods and CCFs
          <textarea
            className={`${inp} mt-1 min-h-80 font-mono text-xs`}
            name="eadSettings"
            value={eadSettings}
            onChange={(event) => setEadSettings(event.target.value)}
            spellCheck={false}
            required
          />
        </label>
      </div>

      <div className="rounded-lg border border-border p-4">
        <h3 className="font-semibold text-ink">Calculation preview</h3>
        <p className="mt-1 text-sm text-muted">
          Check the expected-loss arithmetic using representative inputs. This
          preview does not save or propose the values.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium text-ink">
            EAD ($)
            <input
              className={`${inp} mt-1`}
              type="number"
              min="0"
              value={previewEad}
              onChange={(event) => setPreviewEad(event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-ink">
            PD (%)
            <input
              className={`${inp} mt-1`}
              type="number"
              min="0"
              max="100"
              value={previewPd}
              onChange={(event) => setPreviewPd(event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-ink">
            LGD (%)
            <input
              className={`${inp} mt-1`}
              type="number"
              min="0"
              max="100"
              value={previewLgd}
              onChange={(event) => setPreviewLgd(event.target.value)}
            />
          </label>
        </div>
        <p className="mt-3 text-sm font-semibold text-ink">
          Expected credit loss:{" "}
          {preview == null || !Number.isFinite(preview)
            ? "—"
            : preview.toLocaleString("en-AU", {
                style: "currency",
                currency: "AUD",
              })}
        </p>
      </div>

      <label className="block text-sm font-medium text-ink">
        Change reason
        <input className={`${inp} mt-1`} name="changeReason" required />
      </label>
      {validation.length > 0 && (
        <div className="rounded-lg border border-alert/30 bg-alert/5 p-3">
          <p className="text-sm font-semibold text-alert">
            Complete the policy before proposing it:
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm text-muted">
            {validation.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {publishError && <AsyncStatus kind="error">{publishError}</AsyncStatus>}
      <button
        className={btn}
        type="submit"
        disabled={pending || validation.length > 0}
      >
        {pending ? "Publishing…" : "Publish expected-loss policy"}
      </button>
    </form>
  );
}
