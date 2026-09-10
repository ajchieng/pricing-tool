/** Read-only presentation adapters for the exact policy used by the static demo. */
import {
  commercialConfigFor,
  commercialDefaults,
  getDemoFormConfig,
  getDemoPolicy,
  homeMargins,
  homeProducts,
  homeRates,
  personalDefaults,
  personalMargins,
  personalProducts,
} from "@/lib/demo/policy";
import { getDemoConfiguration } from "@/lib/demo/configuration";
import type { PersonalApprovalRuleConfig } from "@/lib/pricing/personal/types";
import type { CommercialFacilityType } from "@/lib/pricing/commercial/types";
import { publishedRateRole } from "@/lib/pricing/rate-role";

export function getHomeGuidePolicy() {
  return {
    ...getDemoPolicy("home"),
    marginSettings: homeMargins,
    profitabilityDefaults: getDemoFormConfig("home").profitabilityDefaults,
    rateBands: homeRates.map((rate) => ({
      ...rate,
      productName:
        homeProducts.find((product) => product.id === rate.productId)?.name ??
        "Removed product",
      rate: rate.cardedRate,
      pricingRole: publishedRateRole(rate.pricingRole),
    })),
  };
}

export function getPersonalGuidePolicy() {
  return {
    ...getDemoPolicy("personal"),
    products: personalProducts,
    marginSettings: personalMargins,
    approvalRules: getDemoConfiguration().tables
      .personal_approval_rule as unknown as PersonalApprovalRuleConfig[],
    profitabilityDefaults: personalDefaults,
  };
}

export function getCommercialGuidePolicy() {
  const config = commercialConfigFor({ facilityType: "term_loan" });
  return {
    ...getDemoPolicy("commercial"),
    marginPolicy: config.marginPolicy!,
    approval: config.approval,
    dscrBands: config.dscrBands,
    profitabilityDefaults: commercialDefaults,
    facilities: (
      [
        "term_loan",
        "overdraft",
        "equipment_finance",
        "commercial_property",
      ] as CommercialFacilityType[]
    ).map((facilityType) => {
      const facility = commercialConfigFor({ facilityType });
      const base = facility.baseRates[facilityType];
      return {
        facilityType,
        label: base.standard.label,
        baseRateName: base.standard.baseRateName,
        rates: (["standard", "non_standard"] as const).map((loanType) => ({
          loanType,
          rate: base[loanType].rate,
          selectedRateId: base[loanType].selectedRateId ?? null,
          pricingRole: publishedRateRole(base[loanType].pricingRole),
        })),
        fees: facility.fees,
        marginPolicy: facility.marginPolicy!,
      };
    }),
  };
}

export type CommercialPricingGuidePolicy = ReturnType<
  typeof getCommercialGuidePolicy
>;
