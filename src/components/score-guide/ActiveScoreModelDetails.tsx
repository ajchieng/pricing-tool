import type { ScoreModelCategoryRollup } from "@/lib/pricing/score-guide-data";
import type {
  CustomerScoreNumericRule,
  CustomerScoreModelConfig,
  CustomerScoreValueMapping,
} from "@/lib/pricing/types";

function formatNumber(value: number, dp = 2) {
  return value.toFixed(dp).replace(/\.00$/, "");
}

function ruleCondition(rule: CustomerScoreNumericRule) {
  if (rule.operator === "present") return "Value entered";
  if (rule.operator === "missing") return "Value missing";
  if (rule.operator === "between") {
    return `${formatNumber(Number(rule.value))} to ${formatNumber(Number(rule.valueMax))}`;
  }
  const operator = {
    lte: "≤",
    lt: "<",
    gte: "≥",
    gt: ">",
    eq: "=",
  }[rule.operator];
  return `${operator} ${formatNumber(Number(rule.value))}`;
}

function mappingValue(mapping: CustomerScoreValueMapping) {
  if (mapping.value == null) return "Missing / null";
  if (typeof mapping.value === "boolean") return mapping.value ? "Yes" : "No";
  return String(mapping.value).replaceAll("_", " ");
}

export function ActiveScoreModelDetails({
  categories,
  model,
}: {
  categories: ScoreModelCategoryRollup[];
  model: CustomerScoreModelConfig;
}) {
  return (
    <section className="border-y border-border py-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">Active factor scoring rules</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
          These are the mappings, numeric thresholds and missing-value scores in
          the model shown above. Raw weights are freely configurable; normalised
          influence is the factor&apos;s raw weight divided by the total enabled
          raw weight.
        </p>
      </div>

      <div className="space-y-7">
        {categories.map((category) => (
          <div key={category.category}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
              <h3 className="text-sm font-semibold">{category.label}</h3>
              <p className="tnum text-xs text-muted">
                Raw {formatNumber(category.rawWeight)} · Normalised{" "}
                {category.normalisedWeight.toFixed(1)}%
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {category.factors.map((factor) => (
                <article
                  key={factor.key}
                  className="rounded-lg border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-ink">
                        {factor.label}
                      </h4>
                      <p className="mt-1 font-mono text-[11px] text-faint">
                        {factor.field}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted">
                      <p className="tnum">
                        Raw weight {formatNumber(factor.rawWeight)}
                      </p>
                      <p className="tnum mt-1">
                        {factor.normalisedWeight.toFixed(2)}% influence
                      </p>
                      <p className="tnum mt-1">
                        Missing score {formatNumber(factor.missingScore)}
                      </p>
                      <p className="mt-1">
                        {factor.scoringMethod === "linear_points"
                          ? `Linear · ${factor.monotonicDirection ?? "monotonic"}`
                          : "Step thresholds"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 divide-y divide-border border-y border-border">
                    {factor.rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2 text-xs"
                      >
                        <div>
                          <p className="font-medium text-ink">{rule.label}</p>
                          <p className="mt-0.5 text-muted">
                            {ruleCondition(rule)}
                          </p>
                        </div>
                        <p className="tnum self-center font-semibold text-ink">
                          Score {formatNumber(rule.score)}
                        </p>
                      </div>
                    ))}
                    {factor.points.map((point) => (
                      <div
                        key={point.value}
                        className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2 text-xs"
                      >
                        <div>
                          <p className="font-medium text-ink">
                            {point.label ??
                              `Input ${formatNumber(point.value)}`}
                          </p>
                          <p className="mt-0.5 text-muted">
                            Input {formatNumber(point.value)}
                          </p>
                        </div>
                        <p className="tnum self-center font-semibold text-ink">
                          Score {formatNumber(point.score)}
                        </p>
                      </div>
                    ))}
                    {factor.mappings.map((mapping) => (
                      <div
                        key={JSON.stringify(mapping.value)}
                        className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2 text-xs"
                      >
                        <div>
                          <p className="font-medium text-ink">
                            {mapping.label}
                          </p>
                          <p className="mt-0.5 capitalize text-muted">
                            {mappingValue(mapping)}
                          </p>
                        </div>
                        <p className="tnum self-center font-semibold text-ink">
                          Score {formatNumber(mapping.score)}
                        </p>
                      </div>
                    ))}
                    {model.factors
                      .find((item) => item.key === factor.key)
                      ?.alternativeNumericSources?.map((source) => (
                        <div key={source.field} className="py-3 text-xs">
                          <h5 className="font-semibold text-ink">
                            Alternative input: {source.label}
                          </h5>
                          <p className="mt-1 text-muted">
                            Used when this serviceability input is selected.
                          </p>
                          {source.rules.map((rule) => (
                            <div
                              key={rule.id}
                              className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-t border-border pt-2"
                            >
                              <div>
                                <p className="font-medium text-ink">
                                  {rule.label}
                                </p>
                                <p className="mt-0.5 text-muted">
                                  {ruleCondition(rule)}
                                </p>
                              </div>
                              <p className="tnum self-center font-semibold text-ink">
                                Score {formatNumber(rule.score)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
