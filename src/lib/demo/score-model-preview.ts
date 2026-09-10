import {
  ALLOWED_CUSTOMER_SCORE_FIELDS,
  evaluateCustomerScoreModel,
} from "@/lib/pricing/customer-score";
import {
  PERSONAL_SCORE_FIELDS,
  evaluatePersonalScoreModel,
} from "@/lib/pricing/personal/score-model";
import {
  COMMERCIAL_SCORE_VALIDATION_FIELDS,
  evaluateCommercialScoreModel,
} from "@/lib/pricing/commercial/score-model";
import { scoreModelValidationErrors } from "@/lib/pricing/score-model-validation";
import type {
  CustomerScoreModelConfig,
  PricingInput,
} from "@/lib/pricing/types";
import type { PersonalPricingInput } from "@/lib/pricing/personal/types";
import type { CommercialPricingInput } from "@/lib/pricing/commercial/types";
import {
  commercialConfigFor,
  personalConfigFor,
  sampleInput,
  type DemoArea,
} from "./policy";

/** The same pure score engines used by the calculators, entirely in this browser. */
export function previewDemoScoreModel(
  area: DemoArea,
  activeModel: CustomerScoreModelConfig,
  draftModel: CustomerScoreModelConfig,
) {
  const fields =
    area === "home"
      ? ALLOWED_CUSTOMER_SCORE_FIELDS
      : area === "personal"
        ? PERSONAL_SCORE_FIELDS
        : COMMERCIAL_SCORE_VALIDATION_FIELDS;
  const errors = scoreModelValidationErrors(draftModel, fields);
  if (errors.length) throw new Error(errors.join(" "));
  const input = sampleInput(area);
  const evaluate = (model: CustomerScoreModelConfig) => {
    if (area === "home")
      return evaluateCustomerScoreModel(input as PricingInput, model);
    if (area === "personal") {
      const personalInput = input as PersonalPricingInput;
      return evaluatePersonalScoreModel(personalInput, model, {
        baseRate: personalConfigFor(personalInput).product?.cardedRate,
      });
    }
    const commercialInput = input as CommercialPricingInput;
    const config = commercialConfigFor(commercialInput);
    return evaluateCommercialScoreModel(commercialInput, model, {
      baseRate:
        config.baseRates[commercialInput.facilityType][
          commercialInput.loanType ?? "standard"
        ].rate,
      customerConcentrationThresholdPct:
        config.customerConcentrationThresholdPct,
    });
  };
  return { active: evaluate(activeModel), draft: evaluate(draftModel) };
}
