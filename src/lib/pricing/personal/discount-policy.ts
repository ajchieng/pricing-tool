// Fictional demonstration policy values; not lender calibration.
import {
  discountOnlyRateCurve,
  isDiscountEntitlementCurve,
} from "@/lib/pricing/score-engine";
import type { CustomerScoreRateCurveConfig } from "@/lib/pricing/types";
import type { PersonalProductSecurityType } from "./types";

const PERSONAL_MAX_DISCOUNT_BY_SECURITY = {
  secured: 1.2,
  unsecured: 0.9,
} as const satisfies Record<PersonalProductSecurityType, number>;

export function personalDiscountOnlyRateCurve(
  thresholdScore = 46,
  securedMaxDiscount: number = PERSONAL_MAX_DISCOUNT_BY_SECURITY.secured,
  unsecuredMaxDiscount: number = PERSONAL_MAX_DISCOUNT_BY_SECURITY.unsecured,
): CustomerScoreRateCurveConfig {
  return {
    ...discountOnlyRateCurve(securedMaxDiscount, thresholdScore),
    maxDiscountBySecurity: {
      secured: securedMaxDiscount,
      unsecured: unsecuredMaxDiscount,
    },
  };
}

export function personalMaxDiscountsForCurve(
  curve: CustomerScoreRateCurveConfig,
): Record<PersonalProductSecurityType, number> {
  const configured = curve.maxDiscountBySecurity;
  return {
    secured:
      typeof configured?.secured === "number" &&
      Number.isFinite(configured.secured)
        ? configured.secured
        : curve.maxDiscount,
    unsecured:
      typeof configured?.unsecured === "number" &&
      Number.isFinite(configured.unsecured)
        ? configured.unsecured
        : curve.maxDiscount,
  };
}

export function personalRateCurveForSecurity(
  curve: CustomerScoreRateCurveConfig,
  securityType: PersonalProductSecurityType,
): CustomerScoreRateCurveConfig {
  if (!isDiscountEntitlementCurve(curve)) return curve;
  return discountOnlyRateCurve(
    personalMaxDiscountsForCurve(curve)[securityType],
    curve.neutralScore,
  );
}
