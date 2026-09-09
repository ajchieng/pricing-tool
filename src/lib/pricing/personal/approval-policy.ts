import type { ApprovalLevel } from "@/lib/pricing/types";
import { PERSONAL_APPROVAL } from "./config";
import type { PersonalApprovalRuleConfig } from "./types";

const APPROVAL_SEVERITY: Record<ApprovalLevel, number> = {
  none: 0,
  manager: 1,
  senior: 2,
  review: 3,
  exception: 4,
};

export function fallbackPersonalApprovalRules(): PersonalApprovalRuleConfig[] {
  const P = PERSONAL_APPROVAL;
  return [
    {
      id: 0,
      name: "Manager — large unsecured exposure",
      approvalLevel: "manager",
      conditionType: "unsecured_amount",
      conditionOperator: "gt",
      conditionValue: String(P.unsecuredManagerAmount),
      reasonText: "Large unsecured exposure.",
      active: true,
      priority: 10,
    },
    {
      id: 0,
      name: "Manager — large personal loan exposure",
      approvalLevel: "manager",
      conditionType: "loan_amount",
      conditionOperator: "gt",
      conditionValue: String(P.largeAmountManager),
      reasonText: "Large personal loan exposure.",
      active: true,
      priority: 20,
    },
    {
      id: 0,
      name: "Manager — retention pricing",
      approvalLevel: "manager",
      conditionType: "retention_applied",
      conditionOperator: "eq",
      conditionValue: "true",
      reasonText: "Retention pricing requires manager approval.",
      active: true,
      priority: 25,
    },
    {
      id: 0,
      name: "Senior — requested rate well below suggested",
      approvalLevel: "senior",
      conditionType: "requested_below_suggested",
      conditionOperator: "gt",
      conditionValue: String(P.requestedBelowSuggestedSenior),
      reasonText: "Requested rate is more than 0.90% below the suggested rate.",
      active: true,
      priority: 30,
    },
    {
      id: 0,
      name: "Manager — requested rate below suggested",
      approvalLevel: "manager",
      conditionType: "requested_below_suggested",
      conditionOperator: "gt",
      conditionValue: String(P.requestedBelowSuggestedManager),
      reasonText: "Requested rate is more than 0.30% below the suggested rate.",
      active: true,
      priority: 40,
    },
    {
      id: 0,
      name: "Review — credit score not captured",
      approvalLevel: "review",
      conditionType: "credit_not_scored",
      conditionOperator: "eq",
      conditionValue: "true",
      reasonText: "Credit score not captured.",
      active: true,
      priority: 50,
    },
    {
      id: 0,
      name: "Manager — marginal score band",
      approvalLevel: "manager",
      conditionType: "score_band_watch",
      conditionOperator: "eq",
      conditionValue: "true",
      reasonText: "Marginal customer score band.",
      active: true,
      priority: 60,
    },
    {
      id: 0,
      name: "Review — weak score band",
      approvalLevel: "review",
      conditionType: "score_band_weak",
      conditionOperator: "eq",
      conditionValue: "true",
      reasonText: "Weak customer score band.",
      active: true,
      priority: 70,
    },
    {
      id: 0,
      name: "Review — affordability tight",
      approvalLevel: "review",
      conditionType: "affordability_tight",
      conditionOperator: "eq",
      conditionValue: "true",
      reasonText: "Repayment leaves limited surplus income.",
      active: true,
      priority: 80,
    },
    {
      id: 0,
      name: "Review — affordability not assessed",
      approvalLevel: "review",
      conditionType: "affordability_not_assessed",
      conditionOperator: "eq",
      conditionValue: "true",
      reasonText: "Repayment affordability has not been assessed.",
      active: true,
      priority: 90,
    },
    {
      id: 0,
      name: "Review — employment/income stability",
      approvalLevel: "review",
      conditionType: "employment_review_required",
      conditionOperator: "eq",
      conditionValue: "true",
      reasonText: "Employment / income stability flagged for review.",
      active: true,
      priority: 100,
    },
    {
      id: 0,
      name: "Senior — margin below target",
      approvalLevel: "senior",
      conditionType: "margin_below_target",
      conditionOperator: "eq",
      conditionValue: "true",
      reasonText: "Estimated margin is below the target margin.",
      active: true,
      priority: 110,
    },
    {
      id: 0,
      name: "Exception — margin below hard minimum",
      approvalLevel: "exception",
      conditionType: "margin_below_hard_min",
      conditionOperator: "eq",
      conditionValue: "true",
      reasonText:
        "Estimated margin is below the hard minimum margin. Do not proceed without a pricing exception.",
      active: true,
      priority: 120,
    },
  ];
}

type RequiredRule = {
  conditionType: string;
  label: string;
  minimumLevel: ApprovalLevel;
  kind: "numeric" | "boolean";
  exactLevel?: ApprovalLevel;
};

const REQUIRED_RULES: RequiredRule[] = [
  {
    conditionType: "unsecured_amount",
    label: "unsecured exposure",
    minimumLevel: "manager",
    kind: "numeric",
  },
  {
    conditionType: "loan_amount",
    label: "loan amount",
    minimumLevel: "manager",
    kind: "numeric",
  },
  {
    conditionType: "retention_applied",
    label: "retention pricing",
    minimumLevel: "manager",
    kind: "boolean",
  },
  {
    conditionType: "requested_below_suggested",
    label: "manager requested-rate",
    minimumLevel: "manager",
    exactLevel: "manager",
    kind: "numeric",
  },
  {
    conditionType: "requested_below_suggested",
    label: "senior requested-rate",
    minimumLevel: "senior",
    exactLevel: "senior",
    kind: "numeric",
  },
  {
    conditionType: "credit_not_scored",
    label: "missing credit",
    minimumLevel: "review",
    kind: "boolean",
  },
  {
    conditionType: "score_band_watch",
    label: "Watch score",
    minimumLevel: "manager",
    kind: "boolean",
  },
  {
    conditionType: "score_band_weak",
    label: "Weak score",
    minimumLevel: "review",
    kind: "boolean",
  },
  {
    conditionType: "affordability_tight",
    label: "tight affordability",
    minimumLevel: "review",
    kind: "boolean",
  },
  {
    conditionType: "affordability_not_assessed",
    label: "unassessed affordability",
    minimumLevel: "review",
    kind: "boolean",
  },
  {
    conditionType: "employment_review_required",
    label: "employment review",
    minimumLevel: "review",
    kind: "boolean",
  },
  {
    conditionType: "margin_below_target",
    label: "target-margin",
    minimumLevel: "senior",
    kind: "boolean",
  },
  {
    conditionType: "margin_below_hard_min",
    label: "hard-minimum-margin",
    minimumLevel: "exception",
    kind: "boolean",
  },
];

function ruleSatisfies(
  rule: PersonalApprovalRuleConfig,
  requirement: RequiredRule,
): boolean {
  if (!rule.active || rule.conditionType !== requirement.conditionType) {
    return false;
  }
  if (
    requirement.exactLevel != null
      ? rule.approvalLevel !== requirement.exactLevel
      : APPROVAL_SEVERITY[rule.approvalLevel] <
        APPROVAL_SEVERITY[requirement.minimumLevel]
  ) {
    return false;
  }
  if (requirement.kind === "boolean") {
    return (
      rule.conditionOperator === "eq" &&
      rule.conditionValue.trim().toLowerCase() === "true"
    );
  }
  return (
    ["lt", "lte", "gt", "gte", "eq"].includes(rule.conditionOperator) &&
    rule.conditionValue.trim() !== "" &&
    Number.isFinite(Number(rule.conditionValue))
  );
}

export function personalApprovalPolicyContractErrors(
  rules: PersonalApprovalRuleConfig[],
): string[] {
  return REQUIRED_RULES.flatMap((requirement) =>
    rules.some((rule) => ruleSatisfies(rule, requirement))
      ? []
      : [
          `Personal approval policy requires a valid ${requirement.label} rule at ${requirement.exactLevel ?? requirement.minimumLevel} level or higher.`,
        ],
  );
}

export function resolvePersonalApprovalPolicy(
  rules: PersonalApprovalRuleConfig[],
): {
  approvalRules: PersonalApprovalRuleConfig[];
  fallback: boolean;
  errors: string[];
} {
  const errors = personalApprovalPolicyContractErrors(rules);
  return errors.length > 0
    ? {
        approvalRules: fallbackPersonalApprovalRules(),
        fallback: true,
        errors,
      }
    : { approvalRules: rules, fallback: false, errors: [] };
}
