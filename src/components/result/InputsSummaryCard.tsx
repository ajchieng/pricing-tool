import type { WarningItem } from "@/lib/pricing/types";
import { Line, RailSegment } from "@/components/result/shared";
import { WarningList } from "@/components/result/WarningList";
import type { QuoteContext } from "@/components/ResultPanel";
import { fmtMoney, labelYesNoUnknown } from "@/lib/format";
import { lenderProductLabels } from "@/lib/pricing/lender-products";

// Quiet restatement of the risk, relationship and strategic inputs behind the
// result, with any risk-specific warnings. Secondary by design — it echoes the
// form.

export function InputsSummaryCard({
  lvr,
  context,
  riskWarnings,
  bare = false,
}: {
  lvr: number | null;
  context?: QuoteContext;
  riskWarnings: WarningItem[];
  bare?: boolean;
}) {
  return (
    <RailSegment
      title={bare ? undefined : "Risk, relationship & strategic summary"}
      bare={bare}
    >
      {context && (
        <>
          <Line label="Stream" value={labelStream(context.customerStream)} />
          <Line label="Channel" value={labelChannel(context.channel)} />
        </>
      )}
      <div className="mb-1 text-xs font-medium text-muted">Risk</div>
      <Line label="LVR" value={lvr != null ? `${lvr.toFixed(2)}%` : "—"} />
      {context && (
        <>
          {context.customerStream === "retention" ? (
            <>
              <Line
                label="Current customer rate"
                value={
                  context.currentCustomerRate != null
                    ? `${context.currentCustomerRate.toFixed(2)}%`
                    : "—"
                }
              />
              <Line
                label="Arrears or hardship, past 18 months"
                value={labelNullableBoolean(
                  context.retentionArrearsHardship18Months,
                )}
              />
              {context.retentionArrearsHardship18Months === true && (
                <Line
                  label="Arrears, past 12 months"
                  value={labelNullableBoolean(
                    context.retentionArrearsPast12Months,
                  )}
                />
              )}
            </>
          ) : (
            <>
              <Line
                label="Credit score"
                value={context.creditScore != null ? context.creditScore : "—"}
              />
              <Line
                label="DTI ratio"
                value={
                  context.dtiRatio != null
                    ? `${context.dtiRatio.toFixed(1)}×`
                    : "—"
                }
              />
              {context.serviceabilityIncomeMeasure === "serviceability_nsi" ? (
                <Line
                  label="Serviceability NSI (monthly)"
                  value={
                    context.serviceabilityNsi != null
                      ? fmtMoney(context.serviceabilityNsi, 2)
                      : "—"
                  }
                />
              ) : (
                <Line
                  label="Gross annual income"
                  value={
                    context.grossAnnualIncome != null
                      ? fmtMoney(context.grossAnnualIncome, 0)
                      : "—"
                  }
                />
              )}
            </>
          )}
        </>
      )}
      {riskWarnings.length > 0 ? (
        <div className="mt-2">
          <WarningList warnings={riskWarnings} dense />
        </div>
      ) : (
        <p className="mt-1 text-xs text-faint">No risk warnings.</p>
      )}

      {context && context.customerStream !== "new_to_bank" && (
        <div className="mt-3 border-t border-border pt-2">
          <div className="mb-1 text-xs font-medium text-muted">
            Relationship
          </div>
          <Line label="Years as member" value={context.yearsAsMember ?? "—"} />
          <Line
            label="Existing Lender products"
            value={
              lenderProductLabels(context.lenderProducts).join(", ") || "—"
            }
          />
        </div>
      )}
      {context && (
        <div className="mt-3 border-t border-border pt-2">
          <div className="mb-1 text-xs font-medium text-muted">Strategic</div>
          <Line
            label="Lives in Region"
            value={labelYesNoUnknown(context.livesInServiceRegion)}
          />
          <Line
            label="VIP customer"
            value={context.vipCustomer ? "Yes" : "No"}
          />
        </div>
      )}
      {context && context.channel === "broker" && (
        <div className="mt-3 border-t border-border pt-2">
          <div className="mb-1 text-xs font-medium text-muted">Broker</div>
          <Line label="Broker name" value={context.brokerName || "—"} />
          <Line label="Company" value={context.brokerCompany || "—"} />
          <Line
            label="In our region"
            value={
              context.brokerInRegion === "yes"
                ? "Yes"
                : context.brokerInRegion === "no"
                  ? "No"
                  : "—"
            }
          />
          <Line
            label="Lender volume, past 12 months"
            value={labelBrokerVolume(context.brokerVolumeBand)}
          />
          <Line
            label="Loans with discretion"
            value={
              context.brokerDiscretionPct != null
                ? `${context.brokerDiscretionPct.toFixed(1)}%`
                : "—"
            }
          />
        </div>
      )}
    </RailSegment>
  );
}

function labelStream(value: QuoteContext["customerStream"]) {
  if (value === "existing_member") return "Existing Member";
  if (value === "retention") return "Retention";
  return "New to Bank";
}

function labelChannel(value: QuoteContext["channel"]) {
  if (value === "broker") return "Broker Stream";
  if (value === "online") return "Online";
  return "Direct";
}

function labelNullableBoolean(value: boolean | null | undefined) {
  return value == null ? "—" : value ? "Yes" : "No";
}

function labelBrokerVolume(value: QuoteContext["brokerVolumeBand"]) {
  if (value === "1_3") return "1–3";
  if (value === "4_6") return "4–6";
  if (value === "7_9") return "7–9";
  if (value === "10_plus") return "10+";
  return "—";
}
