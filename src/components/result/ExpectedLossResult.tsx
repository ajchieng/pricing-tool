import { Line } from "@/components/result/shared";
import { fmtMoney, fmtPct } from "@/lib/format";
import type { ExpectedLossResult as ExpectedLossCalculation } from "@/lib/pricing/credit-risk/expected-loss";

export function ExpectedLossResult({
  expectedLoss,
}: {
  expectedLoss: ExpectedLossCalculation | null | undefined;
}) {
  if (expectedLoss?.basis === "provisional") {
    return (
      <div className="mt-2 border-t border-border pt-2">
        <p className="text-sm font-medium text-ink">Expected-loss treatment</p>
        <p className="mt-1 text-sm text-muted">
          Fictional expected credit loss is unavailable
          {expectedLoss.technicalReason
            ? `: ${expectedLoss.technicalReason}`
            : "."}
        </p>
        <Line
          label="Effective ECL (provisional)"
          value={fmtMoney(expectedLoss.effectiveExpectedCreditLossAmount)}
        />
        <p className="mt-1 text-xs text-warn">
          This assumption completes the indicative P&amp;L but cannot satisfy
          quote acceptance.
        </p>
      </div>
    );
  }

  if (expectedLoss?.basis === "manual_override") {
    return (
      <div className="mt-2 border-t border-border pt-2">
        <p className="mb-1 text-sm font-medium text-ink">
          Expected-loss treatment
        </p>
        <Line
          label="Fictional model ECL"
          value={
            expectedLoss.expectedCreditLossAmount == null
              ? "Unavailable"
              : fmtMoney(expectedLoss.expectedCreditLossAmount)
          }
        />
        <Line
          label="Effective ECL (demo override)"
          value={fmtMoney(expectedLoss.effectiveExpectedCreditLossAmount)}
        />
        <Line
          label="Override reason"
          value={expectedLoss.expectedCreditLossOverrideReason ?? "—"}
        />
        {expectedLoss.expectedLossOverrideByName ? (
          <Line
            label="Authorised by"
            value={`${expectedLoss.expectedLossOverrideByName}${
              expectedLoss.expectedLossOverrideByRole
                ? ` (${expectedLoss.expectedLossOverrideByRole})`
                : ""
            }`}
          />
        ) : null}
        {expectedLoss.status !== "calculated" &&
        expectedLoss.technicalReason ? (
          <p className="mt-1 text-xs text-muted">
            Fictional model unavailable: {expectedLoss.technicalReason}
          </p>
        ) : null}
      </div>
    );
  }

  if (
    !expectedLoss ||
    expectedLoss.status === "not_configured" ||
    expectedLoss.status === "incompatible_policy"
  ) {
    return (
      <div className="mt-2 border-t border-border pt-2">
        <p className="text-sm font-medium text-ink">Expected-loss evidence</p>
        <p className="mt-1 text-sm text-muted">
          Expected credit loss is unavailable
          {expectedLoss?.technicalReason
            ? `: ${expectedLoss.technicalReason}`
            : "."}
        </p>
      </div>
    );
  }

  if (expectedLoss.status === "incomplete_inputs") {
    return (
      <div className="mt-2 border-t border-border pt-2">
        <p className="text-sm font-medium text-ink">Expected-loss evidence</p>
        <p className="mt-1 text-sm text-muted">
          Expected credit loss: More information required.
          {expectedLoss.technicalReason
            ? ` ${expectedLoss.technicalReason}`
            : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 border-t border-border pt-2">
      <p className="mb-1 text-sm font-medium text-ink">
        Expected-loss evidence
      </p>
      <Line
        label="Risk-only score"
        value={`${expectedLoss.riskOnlyScore?.toFixed(1) ?? "—"} / 100`}
      />
      <Line label="Risk grade" value={expectedLoss.riskGrade ?? "—"} />
      <Line
        label="Probability of default"
        value={fmtPct(expectedLoss.probabilityOfDefaultPct)}
      />
      <Line
        label="Loss given default"
        value={fmtPct(expectedLoss.lossGivenDefaultPct)}
      />
      <Line
        label="Exposure at default"
        value={fmtMoney(expectedLoss.exposureAtDefaultAmount)}
      />
      <Line
        label="Expected credit loss"
        value={fmtMoney(expectedLoss.effectiveExpectedCreditLossAmount)}
      />
      <Line
        label="Policy version"
        value={
          expectedLoss.policyVersion == null
            ? "—"
            : `v${expectedLoss.policyVersion}`
        }
      />
    </div>
  );
}
