export const Lender_PRODUCT_VALUES = [
  "transaction_account",
  "savings_account",
  "term_deposit",
  "home_loan",
  "personal_loan",
  "commercial_loan",
  "credit_card",
] as const;

export type LenderProduct = (typeof Lender_PRODUCT_VALUES)[number];

export const Lender_PRODUCT_OPTIONS: ReadonlyArray<{
  value: LenderProduct;
  label: string;
}> = [
  { value: "transaction_account", label: "Transaction account" },
  { value: "savings_account", label: "Savings account" },
  { value: "term_deposit", label: "Term deposit" },
  { value: "home_loan", label: "Home loan" },
  { value: "personal_loan", label: "Personal loan" },
  { value: "commercial_loan", label: "Commercial loan" },
  { value: "credit_card", label: "Credit card" },
];

const lenderProductValues = new Set<string>(Lender_PRODUCT_VALUES);
const productOrder = new Map(
  Lender_PRODUCT_VALUES.map((value, index) => [value, index] as const),
);
const productLabels = new Map(
  Lender_PRODUCT_OPTIONS.map((item) => [item.value, item.label] as const),
);

export function inLenderCatalogueOrder(
  values: Iterable<LenderProduct>,
): LenderProduct[] {
  return [...values].sort(
    (left, right) => productOrder.get(left)! - productOrder.get(right)!,
  );
}

function isLenderProduct(value: unknown): value is LenderProduct {
  return typeof value === "string" && lenderProductValues.has(value);
}

export function lenderProductsFromJson(value: unknown): LenderProduct[] {
  if (!Array.isArray(value)) return [];
  const valid = new Set<LenderProduct>();
  for (const candidate of value) {
    if (isLenderProduct(candidate)) valid.add(candidate);
  }
  return inLenderCatalogueOrder(valid);
}

export function lenderProductLabels(
  values: readonly LenderProduct[],
): string[] {
  return inLenderCatalogueOrder(values).map((value) =>
    productLabels.get(value)!,
  );
}

export function isMultipleLenderProductRelationship(
  values: readonly LenderProduct[] | null | undefined,
): boolean {
  return (values?.length ?? 0) >= 2;
}
