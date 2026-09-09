import { Line } from "@/components/result/shared";
import { fmtMoney, fmtPct } from "@/lib/format";
import type { CapitalAllocationResult as CapitalResult } from "@/lib/pricing/capital/types";
import { ScenarioMetricValue } from "@/components/result/ScenarioMetricDelta";

export function CapitalAllocationResult({
  capital,
  baselineReturnOnEquity,
}: {
  capital: CapitalResult | null;
  baselineReturnOnEquity?: number | null;
}) {
  if (!capital) return null;

  const status =
    capital.classificationBasis === "override"
      ? "Demo override"
      : capital.classificationConfirmed
        ? "Confirmed"
        : "Provisional";

  return (
    <div className="mt-2 border-t border-border pt-2">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold text-ink">
          Capital allocation
        </span>
        <span className="text-[11px] text-faint">{status}</span>
      </div>
      <Line label="APS classification" value={capital.classificationLabel} />
      <Line
        label="Regulatory exposure"
        value={fmtMoney(capital.regulatoryExposure, 0)}
        hint="Drawn exposure plus the CCF-adjusted undrawn commitment, where applicable."
      />
      {capital.undrawnExposure > 0 && (
        <Line
          label="Undrawn CCF"
          value={fmtPct(capital.creditConversionFactorPct)}
        />
      )}
      <Line label="Risk weight" value={fmtPct(capital.riskWeightPct)} />
      <Line
        label="Risk-weighted assets"
        value={fmtMoney(capital.riskWeightedAssets, 0)}
      />
      <Line label="Capital ratio" value={fmtPct(capital.capitalRatioPct)} />
      <Line
        label="Allocated capital"
        value={fmtMoney(capital.allocatedCapital, 0)}
      />
      <div className="mt-1 border-t border-border pt-1">
        <Line
          label="Indicative ROE"
          value={
            baselineReturnOnEquity === undefined ? (
              <strong className="font-serif text-base">
                {fmtPct(capital.returnOnEquity)}
              </strong>
            ) : (
              <ScenarioMetricValue
                current={capital.returnOnEquity}
                baseline={baselineReturnOnEquity}
                kind="percentage-point"
              >
                <strong className="font-serif text-base">
                  {fmtPct(capital.returnOnEquity)}
                </strong>
              </ScenarioMetricValue>
            )
          }
          tone={(capital.returnOnEquity ?? 0) < 0 ? "text-warn" : "text-ink"}
          hint="Profit after tax ÷ allocated capital. Pricing indication only."
        />
      </div>
      {!capital.classificationConfirmed && (
        <p className="mt-1 text-[11px] leading-4 text-warn">
          Provisional APS classification — confirm before accepting the quote.
        </p>
      )}
      {capital.overrideReason && (
        <p className="mt-1 text-[11px] leading-4 text-muted">
          Override: {capital.overrideReason}
        </p>
      )}
    </div>
  );
}
