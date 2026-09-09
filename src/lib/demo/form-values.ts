import {
  BASE_INITIAL as HOME_INITIAL,
  type FormState as HomeFormState,
} from "@/components/home-loans/form-state";
import {
  BASE_INITIAL as PERSONAL_INITIAL,
  type FormState as PersonalFormState,
} from "@/components/personal-loans/form-state";
import {
  INITIAL as COMMERCIAL_INITIAL,
  type FormState as CommercialFormState,
} from "@/components/commercial-loans/form-state";
import type { DemoArea } from "./types";

const choices = new Set([
  "retentionArrearsHardship18Months",
  "retentionArrearsPast12Months",
  "largestCustomerRevenueAboveThreshold",
  "operatingInRegion",
]);

/** Only form-owned fields are projected from a validated, frozen request. */
function projectForm<T extends object>(
  defaults: T,
  input: Record<string, unknown>,
): T {
  const values: Record<string, unknown> = Object.fromEntries(
    Object.entries(defaults),
  );
  for (const [key, initial] of Object.entries(defaults)) {
    if (!Object.hasOwn(input, key)) continue;
    const value = input[key];
    if (choices.has(key)) {
      values[key] = typeof value === "boolean" ? (value ? "yes" : "no") : "";
    } else if (key === "creditScores") {
      values[key] =
        Array.isArray(value) && value.length ? value.map(String) : [""];
    } else if (key === "securities") {
      if (Array.isArray(value) && value.length) {
        values[key] = value.map((item: Record<string, unknown>, index) => ({
          id: `saved-security-${index}`,
          type: String(item.type ?? "commercial_property"),
          value: item.value == null ? "" : String(item.value),
          description: String(item.description ?? ""),
          isPrimary: item.isPrimary === true,
        }));
        values.securityMode = value.every((item) => item.type === "unsecured")
          ? "unsecured"
          : "secured";
      }
    } else if (Array.isArray(initial)) {
      values[key] = Array.isArray(value) ? [...value] : [];
    } else if (typeof initial === "string") {
      values[key] = value == null ? "" : String(value);
    } else if (typeof initial === "boolean") {
      values[key] = value === true;
    } else {
      values[key] = typeof value === "number" ? value : null;
    }
  }
  if ("upfrontFeeOverrideEnabled" in defaults) {
    values.upfrontFeeOverrideEnabled = input.upfrontFeeOverride != null;
    values.monthlyFeeOverrideEnabled = input.monthlyFeeOverride != null;
  }
  if (input.channel === "online") values.commissions = "0";
  return values as T;
}

export function demoFormValues(
  area: "home",
  input: Record<string, unknown>,
): HomeFormState;
export function demoFormValues(
  area: "personal",
  input: Record<string, unknown>,
): PersonalFormState;
export function demoFormValues(
  area: "commercial",
  input: Record<string, unknown>,
): CommercialFormState;
export function demoFormValues(
  area: DemoArea,
  input: Record<string, unknown>,
): HomeFormState | PersonalFormState | CommercialFormState;
export function demoFormValues(area: DemoArea, input: Record<string, unknown>) {
  if (area === "home") return projectForm(HOME_INITIAL, input);
  if (area === "personal") return projectForm(PERSONAL_INITIAL, input);
  return projectForm(COMMERCIAL_INITIAL, input);
}
