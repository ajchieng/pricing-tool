import {
  costOfFundsDefaultText,
  homeCostOfFundsDefault,
  type HomeCostOfFundsDefaults,
} from "@/lib/pricing/cost-of-funds-defaults";
import {
  defaultFieldStrings,
  type ProfitabilityDefaultsByChannel,
} from "@/lib/quotes/profitability-defaults";
import {
  BASE_INITIAL,
  type FormState,
} from "@/components/home-loans/form-state";

export type HomeFormInitializationInput = {
  initialValues?: Partial<FormState>;
  profitabilityDefaults?: ProfitabilityDefaultsByChannel;
  costOfFundsDefaults?: HomeCostOfFundsDefaults;
  /** Fresh quotes take governed channel defaults; revisions keep saved dollars. */
  applyProfitabilityDefaults?: boolean;
  canOverrideExpectedLoss?: boolean;
};

/**
 * Fresh quotes pre-fill line items from the admin-governed per-channel defaults
 * (% of loan amount); revised quotes keep their saved dollars.
 */
export function homeChannelDefaultsApplied({
  initialValues,
  applyProfitabilityDefaults,
}: Pick<
  HomeFormInitializationInput,
  "initialValues" | "applyProfitabilityDefaults"
>): boolean {
  return applyProfitabilityDefaults ?? initialValues == null;
}

/** Channel defaults are percentages, so a form carrying them opens in % mode. */
export function anyHomeChannelHasDefaults(
  profitabilityDefaults: ProfitabilityDefaultsByChannel = {},
): boolean {
  return Object.values(profitabilityDefaults).some(
    (d) =>
      d != null &&
      [d.commissionsPct, d.otherIncomePct, d.expensesPct].some(
        (v) => v != null,
      ),
  );
}

export function initialHomeLoanFormState({
  initialValues,
  profitabilityDefaults = {},
  costOfFundsDefaults = [],
  applyProfitabilityDefaults,
  canOverrideExpectedLoss = false,
}: HomeFormInitializationInput): FormState {
  const base: FormState = { ...BASE_INITIAL, ...initialValues };
  const applyChannelDefaults = homeChannelDefaultsApplied({
    initialValues,
    applyProfitabilityDefaults,
  });
  const defaults = defaultFieldStrings(profitabilityDefaults, base.channel);

  // Cost of funds falls back to the governed margin setting for the selected
  // product/purpose/rate-type until the user overrides it.
  const costOfFunds =
    initialValues?.costOfFunds == null || initialValues.costOfFunds === ""
      ? costOfFundsDefaultText(
          homeCostOfFundsDefault(
            costOfFundsDefaults,
            base.productId,
            base.loanPurpose,
            base.rateType,
          ),
        )
      : base.costOfFunds;

  return {
    ...base,
    costOfFunds,
    commissions:
      base.channel === "online"
        ? "0"
        : applyChannelDefaults
          ? defaults.commissions
          : base.commissions,
    otherIncome: applyChannelDefaults ? defaults.otherIncome : base.otherIncome,
    expenses: applyChannelDefaults ? defaults.expenses : base.expenses,
    // Expected-loss overrides are only restored for a role that may authorise
    // them; otherwise the quote reverts to the model-calculated figure.
    expectedCreditLossOverrideEnabled:
      canOverrideExpectedLoss && base.expectedCreditLossOverrideEnabled,
    expectedCreditLossOverrideReason: canOverrideExpectedLoss
      ? base.expectedCreditLossOverrideReason
      : "",
  };
}
