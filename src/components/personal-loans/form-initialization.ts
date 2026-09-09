import {
  costOfFundsDefaultText,
  personalCostOfFundsDefault,
  type PersonalCostOfFundsDefaults,
} from "@/lib/pricing/cost-of-funds-defaults";
import { personalProductSecurityType } from "@/lib/pricing/personal/config";
import {
  personalDefaultFieldStrings,
  type PersonalProfitabilityDefaultsByChannelAndSecurity,
} from "@/lib/quotes/profitability-defaults";
import {
  BASE_INITIAL,
  type FormState,
} from "@/components/personal-loans/form-state";
import type { PersonalProductFees } from "@/lib/products/fees";

export interface PersonalLoanProductOption extends PersonalProductFees {
  id: number;
  name: string;
  productCategory: string;
  securityType: "secured" | "unsecured";
  maxTermMonths: number | null;
  cardedRate: number | null;
  comparisonRate: number | null;
}

export function personalChannelDefaultsApplied({
  initialValues,
  applyProfitabilityDefaults,
}: {
  initialValues?: Partial<FormState>;
  /** Fresh quotes take governed defaults; revisions keep saved dollar values. */
  applyProfitabilityDefaults?: boolean;
}): boolean {
  return applyProfitabilityDefaults ?? initialValues == null;
}

export function securityForPersonalProduct(
  product: PersonalLoanProductOption | undefined,
): FormState["securityType"] {
  return product?.securityType === "unsecured"
    ? "unsecured"
    : "secured_vehicle";
}

export function initialPersonalLoanFormState(
  products: PersonalLoanProductOption[],
  profitabilityDefaults: PersonalProfitabilityDefaultsByChannelAndSecurity = {},
  costOfFundsDefaults: PersonalCostOfFundsDefaults = [],
): FormState {
  const first = products[0];
  const securityType = securityForPersonalProduct(first);
  const defaults = personalDefaultFieldStrings(
    profitabilityDefaults,
    BASE_INITIAL.channel,
    personalProductSecurityType(securityType),
  );
  return {
    ...BASE_INITIAL,
    productId: first ? String(first.id) : "",
    securityType,
    costOfFunds: costOfFundsDefaultText(
      personalCostOfFundsDefault(
        costOfFundsDefaults,
        first?.id ?? null,
        personalProductSecurityType(securityType),
      ),
    ),
    commissions: defaults.commissions,
    otherIncome: defaults.otherIncome,
    expenses: defaults.expenses,
  };
}
