type QuoteVertical = "home" | "personal" | "commercial";

export type ExpectedLossEadMethod =
  | "one_year_scheduled_balance"
  | "expected_principal"
  | "drawn_plus_ccf_undrawn";

export interface ExpectedLossPdBandConfig {
  id: number | null;
  riskGrade: string;
  minRiskScore: number;
  annualPdPct: number;
  active: boolean;
}

export interface ExpectedLossLgdBandConfig {
  id: number | null;
  lossScope: string;
  lgdPct: number;
  active: boolean;
}

export interface ExpectedLossEadSettingConfig {
  id: number | null;
  exposureScope: string;
  method: ExpectedLossEadMethod;
  undrawnCcfPct: number | null;
  active: boolean;
}

export interface ExpectedLossPolicyConfig {
  id: number | null;
  vertical: QuoteVertical;
  version: number;
  name: string;
  description: string | null;
  compatibleRiskDefinitionHash: string;
  sourceScoreModelArea: string;
  sourceScoreModelVersion: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  active: boolean;
  pdBands: ExpectedLossPdBandConfig[];
  lgdBands: ExpectedLossLgdBandConfig[];
  eadSettings: ExpectedLossEadSettingConfig[];
}

const REQUIRED_LGD_SCOPES: Record<QuoteVertical, readonly string[]> = {
  home: ["owner_occupied", "investment"].flatMap((purpose) =>
    ["lvr_le_60", "lvr_le_80", "lvr_le_90", "lvr_over_90"].flatMap(
      (lvrBand) => [
        `${purpose}_${lvrBand}_standard`,
        `${purpose}_${lvrBand}_lmi`,
      ],
    ),
  ),
  personal: ["secured", "unsecured"],
  commercial: [
    "cash_secured",
    "coverage_ge_1_5",
    "coverage_ge_1",
    "coverage_ge_0_5",
    "coverage_lt_0_5",
    "unsecured",
  ],
};

const REQUIRED_EAD_SCOPES: Record<QuoteVertical, readonly string[]> = {
  home: ["amortising"],
  personal: ["amortising"],
  commercial: ["amortising", "interest_only", "overdraft"],
};

function finiteRange(value: number, minimum: number, maximum: number): boolean {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

export function expectedLossPolicyValidationErrors(
  policy: ExpectedLossPolicyConfig,
): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(policy.version) || policy.version <= 0) {
    errors.push("Policy version must be a positive integer.");
  }
  if (!policy.name.trim()) errors.push("Policy name is required.");
  if (!/^[a-f0-9]{64}$/i.test(policy.compatibleRiskDefinitionHash)) {
    errors.push("Compatible Risk-definition hash must be a SHA-256 hex value.");
  }
  if (policy.effectiveTo && policy.effectiveTo <= policy.effectiveFrom) {
    errors.push("Policy effective end must be after its start.");
  }

  const pdBands = policy.pdBands.filter((band) => band.active);
  if (pdBands.length === 0) {
    errors.push("At least one active PD band is required.");
  } else {
    const grades = new Set<string>();
    const minimums = new Set<number>();
    const sorted = [...pdBands].sort(
      (left, right) => left.minRiskScore - right.minRiskScore,
    );
    for (const band of sorted) {
      if (!band.riskGrade.trim())
        errors.push("Every PD band needs a risk grade.");
      if (grades.has(band.riskGrade)) {
        errors.push(`PD risk grade ${band.riskGrade} is duplicated.`);
      }
      grades.add(band.riskGrade);
      if (!finiteRange(band.minRiskScore, 0, 100)) {
        errors.push(`PD band ${band.riskGrade} has an invalid minimum score.`);
      }
      if (minimums.has(band.minRiskScore)) {
        errors.push(`PD minimum score ${band.minRiskScore} is duplicated.`);
      }
      minimums.add(band.minRiskScore);
      if (!finiteRange(band.annualPdPct, 0, 100)) {
        errors.push(`PD band ${band.riskGrade} must be between 0 and 100%.`);
      }
    }
    if (sorted[0]?.minRiskScore !== 0) {
      errors.push("PD bands must cover Risk scores from 0.");
    }
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index].annualPdPct > sorted[index - 1].annualPdPct) {
        errors.push("PD must not increase as the Risk-only score improves.");
        break;
      }
    }
  }

  const lgdByScope = new Map(
    policy.lgdBands
      .filter((band) => band.active)
      .map((band) => [band.lossScope, band]),
  );
  for (const scope of REQUIRED_LGD_SCOPES[policy.vertical]) {
    const band = lgdByScope.get(scope);
    if (!band) {
      errors.push(`Missing active LGD scope ${scope}.`);
    } else if (!finiteRange(band.lgdPct, 0, 100)) {
      errors.push(`LGD scope ${scope} must be between 0 and 100%.`);
    }
  }
  if (
    lgdByScope.size !== policy.lgdBands.filter((band) => band.active).length
  ) {
    errors.push("Active LGD scopes must be unique.");
  }
  const monotonicLgdSequences =
    policy.vertical === "home"
      ? ["owner_occupied", "investment"].flatMap((purpose) =>
          ["standard", "lmi"].map((cover) =>
            ["lvr_le_60", "lvr_le_80", "lvr_le_90", "lvr_over_90"].map(
              (band) => `${purpose}_${band}_${cover}`,
            ),
          ),
        )
      : policy.vertical === "personal"
        ? [["secured", "unsecured"]]
        : [
            [
              "cash_secured",
              "coverage_ge_1_5",
              "coverage_ge_1",
              "coverage_ge_0_5",
              "coverage_lt_0_5",
              "unsecured",
            ],
          ];
  for (const sequence of monotonicLgdSequences) {
    for (let index = 1; index < sequence.length; index += 1) {
      const safer = lgdByScope.get(sequence[index - 1]);
      const riskier = lgdByScope.get(sequence[index]);
      if (safer && riskier && safer.lgdPct > riskier.lgdPct) {
        errors.push(
          `LGD must not fall as loss severity increases (${sequence[index - 1]} → ${sequence[index]}).`,
        );
        break;
      }
    }
  }

  const eadByScope = new Map(
    policy.eadSettings
      .filter((setting) => setting.active)
      .map((setting) => [setting.exposureScope, setting]),
  );
  for (const scope of REQUIRED_EAD_SCOPES[policy.vertical]) {
    const setting = eadByScope.get(scope);
    if (!setting) {
      errors.push(`Missing active EAD scope ${scope}.`);
      continue;
    }
    const expectedMethod: ExpectedLossEadMethod =
      scope === "overdraft"
        ? "drawn_plus_ccf_undrawn"
        : scope === "interest_only"
          ? "expected_principal"
          : "one_year_scheduled_balance";
    if (setting.method !== expectedMethod) {
      errors.push(`EAD scope ${scope} must use ${expectedMethod}.`);
    }
    if (
      setting.method === "drawn_plus_ccf_undrawn" &&
      (setting.undrawnCcfPct == null ||
        !finiteRange(setting.undrawnCcfPct, 0, 100))
    ) {
      errors.push(`EAD scope ${scope} needs a CCF between 0 and 100%.`);
    }
    if (
      setting.method !== "drawn_plus_ccf_undrawn" &&
      setting.undrawnCcfPct != null
    ) {
      errors.push(`EAD scope ${scope} must not configure an undrawn CCF.`);
    }
  }
  if (
    eadByScope.size !==
    policy.eadSettings.filter((setting) => setting.active).length
  ) {
    errors.push("Active EAD scopes must be unique.");
  }

  return errors;
}

export function assertValidExpectedLossPolicy(
  policy: ExpectedLossPolicyConfig,
): void {
  const errors = expectedLossPolicyValidationErrors(policy);
  if (errors.length > 0) {
    throw new Error(`Invalid expected-loss policy: ${errors.join(" ")}`);
  }
}

export function requiredExpectedLossScopes(vertical: QuoteVertical) {
  return {
    lgd: [...REQUIRED_LGD_SCOPES[vertical]],
    ead: [...REQUIRED_EAD_SCOPES[vertical]],
  };
}
