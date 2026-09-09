import type { ProductFees } from "@/lib/products/fees";

/** Server-owned Home product projection consumed by quote form surfaces. */
export interface ProductOption extends ProductFees {
  id: number;
  name: string;
  loanPurpose: "owner_occupied" | "investment";
  rateType: "variable" | "fixed";
  fixedPeriodMonths: number | null;
  minLoanAmount: number | null;
  maxLoanAmount: number | null;
  maxLvr: number | null;
  notes: string | null;
}
