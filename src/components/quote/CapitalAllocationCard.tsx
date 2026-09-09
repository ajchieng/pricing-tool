import type { CapitalAllocationResult } from "@/lib/pricing/capital/types";
import { Select } from "@/components/quote-form-ui";
import { Field, inputClass } from "@/components/ui/Field";
import { MoneyInput, RateInput } from "@/components/ui/inputs";
import { StatusText } from "@/components/ui/StatusText";
import { PROFITABILITY_TAX_RATE_PCT } from "@/lib/pricing/profitability-policy";

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

type Props = {
  variant: "home" | "personal" | "commercial";
  canOverride: boolean;
  capitalAllocation: CapitalAllocationResult | null;
  capitalStandardStatus?: string;
  onCapitalStandardStatusChange?: (value: string) => void;
  eligibleLmi?: boolean;
  onEligibleLmiChange?: (value: boolean) => void;
  homeGuaranteeSchemeEligible?: boolean;
  onHomeGuaranteeSchemeEligibleChange?: (value: boolean) => void;
  isOverdraft?: boolean;
  isCommercialProperty?: boolean;
  currentDrawnBalance?: string;
  onCurrentDrawnBalanceChange?: (value: string) => void;
  apsExposureClass?: string;
  onApsExposureClassChange?: (value: string) => void;
  capitalClassificationConfirmed?: boolean;
  onCapitalClassificationConfirmedChange?: (value: boolean) => void;
  capitalPropertyStandardStatus?: string;
  onCapitalPropertyStandardStatusChange?: (value: string) => void;
  capitalPropertyCashFlowDependent?: boolean;
  onCapitalPropertyCashFlowDependentChange?: (value: boolean) => void;
  riskWeightOverridePct: string;
  onRiskWeightOverridePctChange: (value: string) => void;
  taxRateOverridePct: string;
  onTaxRateOverridePctChange: (value: string) => void;
  creditConversionFactorOverridePct?: string;
  onCreditConversionFactorOverridePctChange?: (value: string) => void;
  capitalOverrideReason: string;
  onCapitalOverrideReasonChange: (value: string) => void;
};

function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2.5 rounded-lg border border-border-strong bg-surface px-3 text-sm text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}

export function CapitalAllocationCard(props: Props) {
  const capital = props.capitalAllocation;
  const provisional = capital?.classificationBasis === "provisional";
  const showOverrideReason =
    props.riskWeightOverridePct.trim() !== "" ||
    props.taxRateOverridePct.trim() !== "" ||
    (props.creditConversionFactorOverridePct?.trim() ?? "") !== "";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-prose text-xs leading-5 text-muted">
          Indicative quote-level capital allocation under Australian Prudential
          Standard 112 (APS 112). The risk weight is applied to regulatory
          exposure, then to Lender&apos;s fictional capital ratio. This does not
          replace regulatory reporting.
        </p>
        <StatusText tone={provisional ? "warn" : capital ? "info" : "muted"}>
          {capital
            ? provisional
              ? "Classification unconfirmed"
              : `${capital.classificationLabel} · ${capital.riskWeightPct}%`
            : "Waiting for pricing"}
        </StatusText>
      </div>

      {props.variant === "personal" ? (
        <div className="rounded-lg bg-surface px-3 py-3 text-sm text-muted">
          Supported personal loans default to APS 112 other-retail treatment at
          a 100% risk weight.
        </div>
      ) : null}

      {props.variant === "home" ? (
        <div className="grid gap-4 @md:grid-cols-2">
          <Field label="Standard-loan status" htmlFor="capital-standard-status">
            <select
              id="capital-standard-status"
              className={inputClass}
              value={props.capitalStandardStatus ?? "unconfirmed"}
              onChange={(event) =>
                props.onCapitalStandardStatusChange?.(event.target.value)
              }
            >
              <option value="unconfirmed">Unconfirmed — use 100%</option>
              <option value="confirmed_standard">
                Confirmed standard loan
              </option>
              <option value="non_standard">Non-standard loan</option>
            </select>
          </Field>
          <fieldset className="space-y-3">
            <legend className="mb-1 text-sm font-medium text-ink">
              Insurance and guarantee facts
            </legend>
            <Select
              label="Eligible lenders’ mortgage insurance"
              value={props.eligibleLmi ? "yes" : "no"}
              onChange={(value) => props.onEligibleLmiChange?.(value === "yes")}
              options={YES_NO_OPTIONS}
            />
            <Select
              label="Eligible Home Guarantee Scheme certificate"
              value={props.homeGuaranteeSchemeEligible ? "yes" : "no"}
              onChange={(value) =>
                props.onHomeGuaranteeSchemeEligibleChange?.(value === "yes")
              }
              options={YES_NO_OPTIONS}
            />
          </fieldset>
        </div>
      ) : null}

      {props.variant === "commercial" ? (
        <div className="grid gap-4 @md:grid-cols-2">
          <Field label="APS exposure class" htmlFor="capital-exposure-class">
            <select
              id="capital-exposure-class"
              className={inputClass}
              value={props.apsExposureClass ?? ""}
              onChange={(event) =>
                props.onApsExposureClassChange?.(event.target.value)
              }
            >
              <option value="">Suggested from quote facts</option>
              <option value="sme_retail">SME retail — 75%</option>
              <option value="sme_corporate">SME corporate — 85%</option>
              <option value="general_corporate">
                Other general corporate — 100%
              </option>
              <option value="commercial_property_dependent">
                Commercial property — dependent
              </option>
              <option value="specialised_project_finance">
                Specialised project finance — 110%
              </option>
              <option value="specialised_object_or_commodities_finance">
                Specialised object/commodities — 100%
              </option>
            </select>
          </Field>
          {props.isOverdraft ? (
            <Field
              label="Current drawn balance"
              htmlFor="capital-drawn-balance"
              helper="Regulatory exposure adds 40% of the undrawn committed limit."
            >
              <MoneyInput
                id="capital-drawn-balance"
                value={props.currentDrawnBalance ?? ""}
                onChange={(value) => props.onCurrentDrawnBalanceChange?.(value)}
              />
            </Field>
          ) : null}
          {props.isCommercialProperty ? (
            <>
              <Field
                label="Property-loan status"
                htmlFor="capital-property-status"
              >
                <select
                  id="capital-property-status"
                  className={inputClass}
                  value={props.capitalPropertyStandardStatus ?? "unconfirmed"}
                  onChange={(event) =>
                    props.onCapitalPropertyStandardStatusChange?.(
                      event.target.value,
                    )
                  }
                >
                  <option value="unconfirmed">Unconfirmed</option>
                  <option value="confirmed_standard">Confirmed standard</option>
                  <option value="non_standard">Non-standard</option>
                </select>
              </Field>
              <Field label="Repayment source">
                <Checkbox
                  checked={props.capitalPropertyCashFlowDependent ?? true}
                  onChange={(checked) =>
                    props.onCapitalPropertyCashFlowDependentChange?.(checked)
                  }
                >
                  Repayment depends primarily on property cash flows
                </Checkbox>
              </Field>
            </>
          ) : null}
          <Field label="Classification confirmation">
            <Checkbox
              checked={props.capitalClassificationConfirmed ?? false}
              onChange={(checked) =>
                props.onCapitalClassificationConfirmedChange?.(checked)
              }
            >
              I have confirmed the APS classification facts
            </Checkbox>
          </Field>
        </div>
      ) : null}

      {props.canOverride ? (
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-3 text-xs leading-5 text-muted">
            Demo override. Saving records the fictional or derived treatment,
            your identity and the required reason.
          </p>
          <div className="grid gap-4 @md:grid-cols-2">
            <Field label="Risk-weight override" htmlFor="capital-risk-override">
              <RateInput
                id="capital-risk-override"
                value={props.riskWeightOverridePct}
                onChange={props.onRiskWeightOverridePctChange}
              />
            </Field>
            <Field
              label="Tax-rate override"
              htmlFor="capital-tax-rate-override"
              helper={`Blank uses the fictional ${PROFITABILITY_TAX_RATE_PCT.toFixed(2)}% rate.`}
            >
              <RateInput
                id="capital-tax-rate-override"
                value={props.taxRateOverridePct}
                onChange={props.onTaxRateOverridePctChange}
              />
            </Field>
            {props.variant === "commercial" && props.isOverdraft ? (
              <Field label="CCF override" htmlFor="capital-ccf-override">
                <RateInput
                  id="capital-ccf-override"
                  value={props.creditConversionFactorOverridePct ?? ""}
                  onChange={(value) =>
                    props.onCreditConversionFactorOverridePctChange?.(value)
                  }
                />
              </Field>
            ) : null}
            <Field
              label="Override reason"
              htmlFor="capital-override-reason"
              className="@md:col-span-2"
              helper={
                showOverrideReason ? "Required for this override." : undefined
              }
            >
              <textarea
                id="capital-override-reason"
                className={`${inputClass} min-h-20`}
                value={props.capitalOverrideReason}
                onChange={(event) =>
                  props.onCapitalOverrideReasonChange(event.target.value)
                }
                required={showOverrideReason}
              />
            </Field>
          </div>
        </div>
      ) : null}
    </div>
  );
}
