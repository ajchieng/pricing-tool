"use client";

import { useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { mutateDemoConfiguration } from "@/lib/demo/configuration";
import { reportConfigurationResult } from "@/lib/demo/configuration-react";
import { previewDemoScoreModel } from "@/lib/demo/score-model-preview";
import { adminConfigTargetId } from "@/lib/admin-config-search-core";
import {
  btn,
  btnDanger,
  btnGhost,
  btnRowDanger,
  inp,
} from "@/components/adminUi";
import { Badge } from "@/components/ui/Badge";
import { AsyncStatus } from "@/components/ui/AsyncStatus";
import type {
  CustomerScoreBandConfig,
  CustomerScoreFactorConfig,
  CustomerScoreModelConfig,
  CustomerScoreResult,
} from "@/lib/pricing/types";
import {
  discountOnlyRateCurve,
  isDiscountEntitlementCurve,
  MAX_DISCOUNT_THRESHOLD_SCORE,
  MAX_GOVERNED_DISCOUNT_PCT,
} from "@/lib/pricing/score-engine";
import {
  personalDiscountOnlyRateCurve,
  personalMaxDiscountsForCurve,
} from "@/lib/pricing/personal/discount-policy";

type FieldOption = {
  field: string;
  label: string;
  fieldType: CustomerScoreFactorConfig["fieldType"];
  category: CustomerScoreFactorConfig["category"];
};

type PreviewResponse = {
  active: CustomerScoreResult;
  draft: CustomerScoreResult;
};

function ScoreModelSubmitButton({ instantApply }: { instantApply: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={btn} disabled={pending}>
      {pending
        ? instantApply
          ? "Publishing…"
          : "Submitting…"
        : instantApply
          ? "Publish score model"
          : "Submit score model for approval"}
    </button>
  );
}

function modelBody(model: CustomerScoreModelConfig) {
  return {
    factors: model.factors,
    bands: model.bands,
    rateCurve: model.rateCurve,
  };
}

function cloneModel(model: CustomerScoreModelConfig): CustomerScoreModelConfig {
  return JSON.parse(JSON.stringify(model)) as CustomerScoreModelConfig;
}

function asDiscountOnlyModel(
  model: CustomerScoreModelConfig,
  fallbackCurve: CustomerScoreModelConfig["rateCurve"],
): CustomerScoreModelConfig {
  const cloned = cloneModel(model);
  return {
    ...cloned,
    rateCurve: isDiscountEntitlementCurve(cloned.rateCurve)
      ? cloned.rateCurve
      : cloneModel({ ...cloned, rateCurve: fallbackCurve }).rateCurve,
  };
}

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function valueForInput(value: unknown): string {
  if (value == null) return "";
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
    ? String(value)
    : "";
}

function coerceMappingValue(
  raw: string,
  fieldType: CustomerScoreFactorConfig["fieldType"],
): string | number | boolean | null {
  if (raw === "") return null;
  if (fieldType === "boolean") return raw === "true";
  if (fieldType === "number") return Number(raw);
  return raw;
}

function defaultFactor(option: FieldOption): CustomerScoreFactorConfig {
  if (option.fieldType === "number") {
    return {
      key: `${option.field}-${Date.now()}`,
      label: option.label,
      category: option.category,
      field: option.field,
      fieldType: option.fieldType,
      enabled: true,
      weight: 2,
      missingScore: 50,
      rules: [
        {
          id: "present",
          label: "Value entered",
          operator: "present",
          score: 55,
          reason: `${option.label} is entered.`,
        },
      ],
    };
  }

  return {
    key: `${option.field}-${Date.now()}`,
    label: option.label,
    category: option.category,
    field: option.field,
    fieldType: option.fieldType,
    enabled: true,
    weight: 2,
    missingScore: 50,
    mappings:
      option.fieldType === "boolean"
        ? [
            { value: true, score: 70, label: "Yes" },
            { value: false, score: 50, label: "No" },
          ]
        : [{ value: null, score: 50, label: "Fallback" }],
  };
}

function PreviewTile({
  label,
  result,
}: {
  label: string;
  result: CustomerScoreResult;
}) {
  return (
    <div className="rounded-lg bg-surface p-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className="tnum text-2xl font-semibold text-ink">
            {result.score.toFixed(2)}
          </p>
          <p className="text-xs capitalize text-muted">{result.band}</p>
        </div>
        <div className="text-right">
          <p className="tnum text-lg font-semibold text-ink">
            {result.scoreDiscountPct.toFixed(2)}%
          </p>
          <p className="text-xs text-muted">score discount</p>
          {result.discountEntitlementPct != null && (
            <p className="text-xs text-muted">
              {result.discountEntitlementPct.toFixed(1)}% of cap
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ScoreModelEditor({
  activeModel,
  defaultModel,
  fields,
  productArea = "home",
  configurationVersion,
  instantApply = true,
  initialSelectedKey,
}: {
  activeModel: CustomerScoreModelConfig;
  defaultModel: CustomerScoreModelConfig;
  fields: FieldOption[];
  productArea?: CustomerScoreModelConfig["productArea"];
  configurationVersion: number;
  initialSelectedKey?: string;
  /** Browser demo publications apply immediately and record their version. */
  instantApply?: boolean;
}) {
  const [draftConfigurationVersion, setDraftConfigurationVersion] =
    useState(configurationVersion);
  const [name, setName] = useState(`${activeModel.name} draft`);
  const [description, setDescription] = useState(activeModel.description ?? "");
  const [model, setModel] = useState(() =>
    asDiscountOnlyModel(activeModel, defaultModel.rateCurve),
  );
  const [selectedKey, setSelectedKey] = useState(
    activeModel.factors.some((factor) => factor.key === initialSelectedKey)
      ? (initialSelectedKey ?? "")
      : (activeModel.factors.find((factor) => factor.enabled)?.key ??
          activeModel.factors[0]?.key ??
          ""),
  );
  const [fieldToAdd, setFieldToAdd] = useState<string>(
    fields[0]?.field ?? "loanAmount",
  );
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalWeight = useMemo(
    () =>
      model.factors
        .filter((factor) => factor.enabled)
        .reduce(
          (sum, factor) => sum + Math.max(0, Number(factor.weight) || 0),
          0,
        ),
    [model.factors],
  );
  const personalDiscountCaps =
    productArea === "personal"
      ? personalMaxDiscountsForCurve(model.rateCurve)
      : null;

  const selectedFactor = model.factors.find(
    (factor) => factor.key === selectedKey,
  );
  const selectedIndex = model.factors.findIndex(
    (factor) => factor.key === selectedKey,
  );
  const selectedField = selectedFactor
    ? fields.find((field) => field.field === selectedFactor.field)
    : null;

  function updateFactor(
    index: number,
    next: Partial<CustomerScoreFactorConfig>,
  ) {
    setModel((current) => ({
      ...current,
      factors: current.factors.map((factor, i) =>
        i === index ? { ...factor, ...next } : factor,
      ),
    }));
  }

  function addFactor() {
    const option = fields.find((field) => field.field === fieldToAdd);
    if (!option) return;
    const factor = defaultFactor(option);
    setModel((current) => ({
      ...current,
      factors: [...current.factors, factor],
    }));
    setSelectedKey(factor.key);
  }

  function removeSelectedFactor() {
    if (!selectedFactor) return;
    const remaining = model.factors.filter(
      (factor) => factor.key !== selectedFactor.key,
    );
    setModel((current) => ({ ...current, factors: remaining }));
    setSelectedKey(remaining[0]?.key ?? "");
  }

  function resetToDefault() {
    const confirmed = window.confirm(
      "Load the built-in default score model into this draft? Your current draft edits will be replaced. Nothing is saved until you publish.",
    );
    if (!confirmed) return;
    const fresh = asDiscountOnlyModel(defaultModel, defaultModel.rateCurve);
    setModel(fresh);
    setName(defaultModel.name);
    setDescription(defaultModel.description ?? "");
    setSelectedKey(
      fresh.factors.find((factor) => factor.enabled)?.key ??
        fresh.factors[0]?.key ??
        "",
    );
    setPreview(null);
    setPreviewError(null);
    setDraftConfigurationVersion(configurationVersion);
  }

  function updateBand(index: number, next: Partial<CustomerScoreBandConfig>) {
    setModel((current) => ({
      ...current,
      bands: current.bands.map((band, i) =>
        i === index ? { ...band, ...next } : band,
      ),
    }));
  }

  function updateDiscountCurve(next: {
    thresholdScore?: number;
    securedMaxDiscount?: number;
    unsecuredMaxDiscount?: number;
  }) {
    setModel((current) => {
      const thresholdScore =
        next.thresholdScore ?? current.rateCurve.neutralScore;
      if (productArea === "personal") {
        const caps = personalMaxDiscountsForCurve(current.rateCurve);
        return {
          ...current,
          rateCurve: personalDiscountOnlyRateCurve(
            thresholdScore,
            next.securedMaxDiscount ?? caps.secured,
            next.unsecuredMaxDiscount ?? caps.unsecured,
          ),
        };
      }
      return {
        ...current,
        rateCurve: discountOnlyRateCurve(
          next.securedMaxDiscount ?? current.rateCurve.maxDiscount,
          thresholdScore,
        ),
      };
    });
  }

  function previewDraft() {
    setPreviewError(null);
    startTransition(async () => {
      try {
        setPreview(
          previewDemoScoreModel(productArea ?? "home", activeModel, {
            ...model,
            productArea,
            name,
            description,
          }),
        );
      } catch (error) {
        setPreviewError(
          error instanceof Error
            ? error.message
            : "Preview failed. Check the model values and try again.",
        );
      }
    });
  }

  async function publishModel(formData: FormData) {
    try {
      const next = await mutateDemoConfiguration({
        expectedVersion: draftConfigurationVersion,
        targetType: "score_model",
        action: "create",
        data: {
          productArea,
          name,
          description: description.trim() || null,
          modelJson: modelBody(model),
        },
        reason: String(
          formData.get("changeReason") || "Published customer score model",
        ),
      });
      const published = next.scoreModels[productArea ?? "home"];
      setDraftConfigurationVersion(next.version);
      setModel(cloneModel(published));
      setName(`${published.name} draft`);
      setDescription(published.description ?? "");
      setPreview(null);
      reportConfigurationResult(
        "Score model published. New calculations use this version.",
        "success",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The score model could not be published.";
      setPreviewError(message);
      reportConfigurationResult(message, "error");
    }
  }

  const hiddenModelJson = JSON.stringify(
    modelBody({ ...model, name, description }),
  );
  return (
    <div className="space-y-5">
      {draftConfigurationVersion !== configurationVersion && (
        <div className="rounded-lg border border-warn/40 bg-warn-soft p-3 text-sm">
          <p>
            This draft is preserved, but configuration changed while it was
            open. Reload the active model before publishing.
          </p>
          <button
            type="button"
            className={`${btnGhost} mt-2`}
            onClick={() => {
              setModel(cloneModel(activeModel));
              setName(`${activeModel.name} draft`);
              setDescription(activeModel.description ?? "");
              setSelectedKey(activeModel.factors[0]?.key ?? "");
              setDraftConfigurationVersion(configurationVersion);
              setPreview(null);
              setPreviewError(null);
            }}
          >
            Reload active model
          </button>
        </div>
      )}
      <section
        id={
          activeModel.id != null
            ? adminConfigTargetId(`${productArea}-score-model`, activeModel.id)
            : undefined
        }
        data-admin-search-target={activeModel.id != null ? true : undefined}
        tabIndex={activeModel.id != null ? -1 : undefined}
        className="border-t border-border pt-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Active model v{activeModel.version}
            </h2>
            <p className="mt-1 max-w-prose text-sm text-muted">
              {instantApply
                ? "Edit a draft policy, preview the effect against a representative quote, then publish it for calculations in this browser."
                : "Edit a draft policy, preview the effect against a representative quote, then submit it to maker-checker approval."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={resetToDefault} className={btnGhost}>
              Reset to default
            </button>
            <Badge tone="info" size="sm">
              {model.factors.filter((factor) => factor.enabled).length} active
              factors
            </Badge>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="block text-sm font-medium text-ink">
            Model name
            <input
              className={`${inp} mt-1`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-label="Model name"
            />
          </label>
          <label className="block text-sm font-medium text-ink md:col-span-2">
            Description
            <input
              className={`${inp} mt-1`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-label="Model description"
            />
          </label>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]">
        <section className="border-t border-border">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink">Factor weights</h2>
              <span className="tnum text-xs text-muted">
                {totalWeight.toFixed(2)} relative pts
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted">
              Each enabled factor can use any raw weight from 0 to 100. Weights
              do not need to total 100 and categories have no fixed budgets; the
              engine normalises the enabled raw weights when calculating a
              score.
            </p>
          </div>
          <div className="max-h-[620px] overflow-auto p-2">
            {model.factors.map((factor, index) => {
              const effectiveShare =
                totalWeight > 0
                  ? (Math.max(0, factor.weight) / totalWeight) * 100
                  : 0;
              const active = factor.key === selectedKey;
              return (
                <div
                  key={factor.key}
                  id={adminConfigTargetId(
                    `${productArea}-score-factor`,
                    factor.key,
                  )}
                  data-admin-search-target
                  tabIndex={-1}
                  className={`mb-1 w-full rounded-lg border transition-colors ${
                    active
                      ? "border-brand bg-brand-soft text-ink"
                      : "border-transparent hover:bg-surface"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedKey(factor.key)}
                    aria-pressed={active}
                    className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left"
                  >
                    <span className="text-sm font-medium">{factor.label}</span>
                    <span className="tnum text-xs text-muted">
                      {effectiveShare.toFixed(1)}%
                    </span>
                  </button>
                  <div className="flex min-h-[44px] flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 px-3 py-1.5">
                    <label className="inline-flex min-h-[44px] items-center gap-2 text-xs font-medium text-muted">
                      <input
                        type="checkbox"
                        checked={factor.enabled}
                        onChange={(event) =>
                          updateFactor(index, { enabled: event.target.checked })
                        }
                        aria-label={`${factor.label} enabled`}
                      />
                      Enabled
                    </label>
                    <label className="ml-auto inline-flex min-h-[44px] items-center gap-2 text-xs font-medium text-muted">
                      Weight
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.25"
                        value={factor.weight}
                        onChange={(event) =>
                          updateFactor(index, {
                            weight: toNumber(event.target.value),
                          })
                        }
                        aria-label={`${factor.label} weight`}
                        className="min-h-9 w-24 rounded-md border border-border-strong bg-surface px-2 text-right text-sm text-ink"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <select
                value={fieldToAdd}
                onChange={(event) => setFieldToAdd(event.target.value)}
                className={inp}
                aria-label="Field to add as score factor"
              >
                {fields.map((field) => (
                  <option key={field.field} value={field.field}>
                    {field.label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={addFactor} className={btnGhost}>
                Add
              </button>
            </div>
          </div>
        </section>

        <section className="border-t border-border pt-4">
          {selectedFactor && selectedIndex >= 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink">
                    {selectedFactor.label}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {selectedField?.label ?? selectedFactor.field} maps to a
                    0-100 factor score.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeSelectedFactor}
                  className={btnDanger}
                >
                  Remove
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="block text-sm font-medium text-ink">
                  Label
                  <input
                    className={`${inp} mt-1`}
                    value={selectedFactor.label}
                    onChange={(event) =>
                      updateFactor(selectedIndex, { label: event.target.value })
                    }
                    aria-label="Selected factor label"
                  />
                </label>
                <label className="block text-sm font-medium text-ink">
                  Category
                  <select
                    className={`${inp} mt-1`}
                    value={selectedFactor.category}
                    onChange={(event) =>
                      updateFactor(selectedIndex, {
                        category: event.target
                          .value as CustomerScoreFactorConfig["category"],
                      })
                    }
                    aria-label="Selected factor category"
                  >
                    <option value="loan">Loan</option>
                    <option value="risk">Risk</option>
                    <option value="relationship">Relationship</option>
                    <option value="strategic">Strategic</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-ink">
                  Missing score
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className={`${inp} mt-1`}
                    value={selectedFactor.missingScore}
                    onChange={(event) =>
                      updateFactor(selectedIndex, {
                        missingScore: toNumber(event.target.value),
                      })
                    }
                    aria-label="Selected factor missing score"
                  />
                </label>
              </div>

              {selectedFactor.fieldType === "number" ? (
                <div className="space-y-4">
                  <label className="block max-w-sm text-sm font-medium text-ink">
                    Numeric scoring method
                    <select
                      className={`${inp} mt-1`}
                      value={selectedFactor.scoringMethod ?? "step"}
                      disabled={
                        (selectedFactor.alternativeNumericSources?.length ??
                          0) > 0
                      }
                      onChange={(event) => {
                        const scoringMethod = event.target.value as
                          "step" | "linear_points";
                        updateFactor(selectedIndex, {
                          scoringMethod:
                            scoringMethod === "step"
                              ? undefined
                              : scoringMethod,
                          ...(scoringMethod === "linear_points" &&
                          (!selectedFactor.points ||
                            selectedFactor.points.length < 2)
                            ? {
                                points: [
                                  { value: 0, score: 0, label: "Lower point" },
                                  {
                                    value: 100,
                                    score: 100,
                                    label: "Upper point",
                                  },
                                ],
                                monotonicDirection: "increasing" as const,
                              }
                            : {}),
                        });
                      }}
                      aria-label="Numeric scoring method"
                    >
                      <option value="step">Step thresholds</option>
                      <option value="linear_points">
                        Linear interpolation
                      </option>
                    </select>
                  </label>
                  {selectedFactor.scoringMethod === "linear_points" ? (
                    <LinearPointEditor
                      factor={selectedFactor}
                      onChange={(points, monotonicDirection) =>
                        updateFactor(selectedIndex, {
                          points,
                          monotonicDirection,
                        })
                      }
                    />
                  ) : (
                    <RuleEditor
                      title={
                        selectedFactor.alternativeNumericSources?.length
                          ? `${selectedField?.label ?? selectedFactor.field} thresholds`
                          : "Threshold rules"
                      }
                      rules={selectedFactor.rules ?? []}
                      onChange={(next) =>
                        updateFactor(selectedIndex, { rules: next })
                      }
                    />
                  )}
                  {selectedFactor.alternativeNumericSources?.map(
                    (source, sourceIndex) => (
                      <div
                        key={source.field}
                        className="border-t border-border pt-4"
                      >
                        <p className="mb-3 max-w-prose text-xs leading-5 text-muted">
                          {source.label} is an alternative source for this same
                          factor. It shares the factor weight and neutral
                          missing score, so only one income-capacity
                          contribution is counted.
                        </p>
                        <RuleEditor
                          title={`${source.label} thresholds`}
                          rules={source.rules}
                          onChange={(rules) =>
                            updateFactor(selectedIndex, {
                              alternativeNumericSources:
                                selectedFactor.alternativeNumericSources?.map(
                                  (item, index) =>
                                    index === sourceIndex
                                      ? { ...item, rules }
                                      : item,
                                ),
                            })
                          }
                        />
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <MappingEditor
                  factor={selectedFactor}
                  onChange={(next) =>
                    updateFactor(selectedIndex, { mappings: next })
                  }
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">
              Select a factor to edit its scoring rules.
            </p>
          )}
        </section>
      </div>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="border-t border-border pt-4">
          <h2 className="text-sm font-semibold text-ink">
            Discount entitlement
          </h2>
          <p
            id={`${productArea}-discount-curve-help`}
            className="mt-1 max-w-[65ch] text-sm text-muted"
          >
            Scores at or below the threshold receive no discount. Higher scores
            earn an equal share of the governed maximum, reaching the full
            discount at 100. Customer scores cannot create a loading.
          </p>
          <div
            className={`mt-3 grid gap-x-4 gap-y-3 border-y border-border py-3 ${
              personalDiscountCaps
                ? "sm:grid-cols-2 xl:grid-cols-4"
                : "sm:grid-cols-3"
            }`}
          >
            <label className="block text-sm font-medium text-ink">
              Discount threshold
              <input
                type="number"
                min="0"
                max={MAX_DISCOUNT_THRESHOLD_SCORE}
                step="1"
                value={model.rateCurve.neutralScore}
                onChange={(event) =>
                  updateDiscountCurve({
                    thresholdScore: toNumber(event.target.value),
                  })
                }
                aria-label="Discount threshold score"
                aria-describedby={`${productArea}-discount-curve-help`}
                className={`${inp} tnum mt-1`}
              />
            </label>
            <div className="py-1">
              <p className="text-xs text-muted">Full discount at</p>
              <p className="tnum mt-1 text-lg font-semibold text-ink">100</p>
            </div>
            <label className="block text-sm font-medium text-ink">
              {personalDiscountCaps
                ? "Secured maximum discount"
                : "Maximum discount"}
              <div className="relative mt-1">
                <input
                  type="number"
                  min="0"
                  max={MAX_GOVERNED_DISCOUNT_PCT}
                  step="0.01"
                  value={
                    personalDiscountCaps?.secured ?? model.rateCurve.maxDiscount
                  }
                  onChange={(event) =>
                    updateDiscountCurve({
                      securedMaxDiscount: toNumber(event.target.value),
                    })
                  }
                  aria-label={
                    personalDiscountCaps
                      ? "Secured maximum discount"
                      : "Maximum discount"
                  }
                  aria-describedby={`${productArea}-discount-curve-help`}
                  className={`${inp} tnum pe-9`}
                />
                <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-muted">
                  pp
                </span>
              </div>
            </label>
            {personalDiscountCaps ? (
              <label className="block text-sm font-medium text-ink">
                Unsecured maximum discount
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="0"
                    max={MAX_GOVERNED_DISCOUNT_PCT}
                    step="0.01"
                    value={personalDiscountCaps.unsecured}
                    onChange={(event) =>
                      updateDiscountCurve({
                        unsecuredMaxDiscount: toNumber(event.target.value),
                      })
                    }
                    aria-label="Unsecured maximum discount"
                    aria-describedby={`${productArea}-discount-curve-help`}
                    className={`${inp} tnum pe-9`}
                  />
                  <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-muted">
                    pp
                  </span>
                </div>
              </label>
            ) : null}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h2 className="text-sm font-semibold text-ink">Score bands</h2>
          <div className="mt-3 space-y-2">
            {model.bands.map((band, index) => (
              <div key={band.key} className="grid grid-cols-[1fr_110px] gap-2">
                <input
                  className={inp}
                  value={band.label}
                  onChange={(event) =>
                    updateBand(index, { label: event.target.value })
                  }
                  aria-label={`${band.key} band label`}
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  className={inp}
                  value={band.minScore}
                  onChange={(event) =>
                    updateBand(index, {
                      minScore: toNumber(event.target.value),
                    })
                  }
                  aria-label={`${band.key} minimum score`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Preview and submit
            </h2>
            <p className="mt-1 text-sm text-muted">
              Preview compares the active model with this draft using a
              representative quote.
            </p>
          </div>
          <button
            type="button"
            onClick={previewDraft}
            disabled={isPending}
            className={btnGhost}
          >
            {isPending ? "Previewing..." : "Preview draft"}
          </button>
        </div>
        {isPending ? (
          <AsyncStatus kind="pending" className="mt-3 text-sm">
            Generating score-model preview…
          </AsyncStatus>
        ) : null}
        {previewError && (
          <AsyncStatus kind="error" className="mt-3 text-sm">
            {previewError}
          </AsyncStatus>
        )}
        {preview && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <PreviewTile label="Active model" result={preview.active} />
            <PreviewTile label="Draft model" result={preview.draft} />
          </div>
        )}
        <form action={publishModel} className="mt-5 space-y-5">
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-ink">
              Automatic publication record
            </h3>
            <p className="mt-1 max-w-[70ch] text-sm leading-6 text-muted">
              Publishing records the demo user, time, new model version and
              previous version automatically in this browser.
            </p>
          </div>

          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="description" value={description} />
          <input type="hidden" name="productArea" value={productArea} />
          <input type="hidden" name="modelJson" value={hiddenModelJson} />
          <div className="flex justify-end gap-2">
            <ScoreModelSubmitButton instantApply={Boolean(instantApply)} />
          </div>
        </form>
      </section>
    </div>
  );
}

function LinearPointEditor({
  factor,
  onChange,
}: {
  factor: CustomerScoreFactorConfig;
  onChange: (
    points: NonNullable<CustomerScoreFactorConfig["points"]>,
    direction: NonNullable<CustomerScoreFactorConfig["monotonicDirection"]>,
  ) => void;
}) {
  const points = factor.points ?? [];
  const direction = factor.monotonicDirection ?? "increasing";
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <label className="block text-sm font-medium text-ink">
          Monotonic direction
          <select
            className={`${inp} mt-1`}
            value={direction}
            onChange={(event) =>
              onChange(
                points,
                event.target.value as "increasing" | "decreasing",
              )
            }
            aria-label="Linear scoring direction"
          >
            <option value="increasing">Higher input, higher score</option>
            <option value="decreasing">Higher input, lower score</option>
          </select>
        </label>
        <button
          type="button"
          className={btnGhost}
          onClick={() =>
            onChange(
              [
                ...points,
                {
                  value: (points.at(-1)?.value ?? 0) + 1,
                  score: points.at(-1)?.score ?? 50,
                  label: "New point",
                },
              ],
              direction,
            )
          }
        >
          Add point
        </button>
      </div>
      <p className="mb-3 text-xs leading-5 text-muted">
        Values between points are interpolated continuously. Inputs outside the
        first and last point are clamped to the nearest endpoint.
      </p>
      <div className="space-y-2">
        {points.map((point, index) => (
          <div
            key={`${factor.key}-point-${index}`}
            className="grid gap-2 md:grid-cols-[1fr_130px_110px_72px]"
          >
            <input
              className={inp}
              value={point.label ?? ""}
              onChange={(event) =>
                onChange(
                  points.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, label: event.target.value }
                      : item,
                  ),
                  direction,
                )
              }
              aria-label="Linear point label"
            />
            <input
              type="number"
              step="any"
              className={inp}
              value={point.value}
              onChange={(event) =>
                onChange(
                  points.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, value: toNumber(event.target.value) }
                      : item,
                  ),
                  direction,
                )
              }
              aria-label="Linear point value"
            />
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              className={inp}
              value={point.score}
              onChange={(event) =>
                onChange(
                  points.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, score: toNumber(event.target.value) }
                      : item,
                  ),
                  direction,
                )
              }
              aria-label="Linear point score"
            />
            <button
              type="button"
              className={btnRowDanger}
              onClick={() =>
                onChange(
                  points.filter((_, itemIndex) => itemIndex !== index),
                  direction,
                )
              }
              aria-label="Remove linear point"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RuleEditor({
  title,
  rules,
  onChange,
}: {
  title: string;
  rules: NonNullable<CustomerScoreFactorConfig["rules"]>;
  onChange: NonNullable<CustomerScoreFactorConfig["rules"]> extends infer Rules
    ? (rules: Rules & CustomerScoreFactorConfig["rules"]) => void
    : never;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <button
          type="button"
          className={btnGhost}
          onClick={() =>
            onChange([
              ...rules,
              {
                id: `rule-${Date.now()}`,
                label: "New threshold",
                operator: "gte",
                value: 0,
                score: 50,
              },
            ])
          }
        >
          Add rule
        </button>
      </div>
      <div className="space-y-2">
        {rules.map((rule, index) => (
          <div
            key={rule.id}
            className="grid gap-2 md:grid-cols-[1fr_120px_100px_100px_90px_44px]"
          >
            <input
              className={inp}
              value={rule.label}
              onChange={(event) =>
                onChange(
                  rules.map((item, i) =>
                    i === index ? { ...item, label: event.target.value } : item,
                  ),
                )
              }
              aria-label="Rule label"
            />
            <select
              className={inp}
              value={rule.operator}
              onChange={(event) =>
                onChange(
                  rules.map((item, i) =>
                    i === index
                      ? {
                          ...item,
                          operator: event.target.value as typeof rule.operator,
                        }
                      : item,
                  ),
                )
              }
              aria-label="Rule operator"
            >
              {[
                "gte",
                "gt",
                "lte",
                "lt",
                "eq",
                "between",
                "present",
                "missing",
              ].map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            <input
              type="number"
              className={inp}
              value={rule.value ?? ""}
              onChange={(event) =>
                onChange(
                  rules.map((item, i) =>
                    i === index
                      ? { ...item, value: toNumber(event.target.value) }
                      : item,
                  ),
                )
              }
              aria-label="Rule value"
            />
            <input
              type="number"
              className={inp}
              value={rule.valueMax ?? ""}
              onChange={(event) =>
                onChange(
                  rules.map((item, i) =>
                    i === index
                      ? { ...item, valueMax: toNumber(event.target.value) }
                      : item,
                  ),
                )
              }
              aria-label="Rule max value"
            />
            <input
              type="number"
              min="0"
              max="100"
              className={inp}
              value={rule.score}
              onChange={(event) =>
                onChange(
                  rules.map((item, i) =>
                    i === index
                      ? { ...item, score: toNumber(event.target.value) }
                      : item,
                  ),
                )
              }
              aria-label="Rule score"
            />
            <button
              type="button"
              className={btnRowDanger}
              onClick={() => onChange(rules.filter((_, i) => i !== index))}
              aria-label="Remove rule"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MappingEditor({
  factor,
  onChange,
}: {
  factor: CustomerScoreFactorConfig;
  onChange: NonNullable<
    CustomerScoreFactorConfig["mappings"]
  > extends infer Mappings
    ? (mappings: Mappings & CustomerScoreFactorConfig["mappings"]) => void
    : never;
}) {
  const mappings = factor.mappings ?? [];
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">Value mappings</h3>
        <button
          type="button"
          className={btnGhost}
          onClick={() =>
            onChange([
              ...mappings,
              { value: null, label: "New value", score: 50 },
            ])
          }
        >
          Add mapping
        </button>
      </div>
      <div className="space-y-2">
        {mappings.map((mapping, index) => (
          <div
            key={`${factor.key}-${index}`}
            className="grid gap-2 md:grid-cols-[1fr_1fr_100px_44px]"
          >
            <input
              className={inp}
              value={valueForInput(mapping.value)}
              onChange={(event) =>
                onChange(
                  mappings.map((item, i) =>
                    i === index
                      ? {
                          ...item,
                          value: coerceMappingValue(
                            event.target.value,
                            factor.fieldType,
                          ),
                        }
                      : item,
                  ),
                )
              }
              aria-label="Mapping value"
            />
            <input
              className={inp}
              value={mapping.label}
              onChange={(event) =>
                onChange(
                  mappings.map((item, i) =>
                    i === index ? { ...item, label: event.target.value } : item,
                  ),
                )
              }
              aria-label="Mapping label"
            />
            <input
              type="number"
              min="0"
              max="100"
              className={inp}
              value={mapping.score}
              onChange={(event) =>
                onChange(
                  mappings.map((item, i) =>
                    i === index
                      ? { ...item, score: toNumber(event.target.value) }
                      : item,
                  ),
                )
              }
              aria-label="Mapping score"
            />
            <button
              type="button"
              className={btnRowDanger}
              onClick={() => onChange(mappings.filter((_, i) => i !== index))}
              aria-label="Remove mapping"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
