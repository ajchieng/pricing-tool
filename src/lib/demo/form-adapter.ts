import { calculateDemo, getDemoFormConfig } from "./pricing";
import { getDemoConfiguration } from "./configuration";
import { saveQuote } from "./store";
import type { DemoArea } from "./types";
import type { MarketQuoteEvidence } from "@/lib/market/quote-evidence-values";

/** Saves always recalculate the formal request, never the scenario preview. */
export async function saveDemoForm(
  area: DemoArea,
  payload: Record<string, unknown>,
  revisedFromQuoteId?: number,
  marketEvidence: MarketQuoteEvidence | null = null,
  expectedConfigurationVersion?: number,
) {
  function assertCurrentPolicy() {
    if (
      expectedConfigurationVersion !== undefined &&
      getDemoConfiguration().version !== expectedConfigurationVersion
    )
      throw new Error(
        "Configuration changed while this quote was being priced. Wait for the updated result before saving.",
      );
  }
  assertCurrentPolicy();
  const calculation = await calculateDemo(area, payload);
  assertCurrentPolicy();
  const { result } = calculation;
  const input: Record<string, unknown> = calculation.input;
  const name =
    area === "commercial" ? input.businessName : input.customerReference;
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error(
      area === "commercial"
        ? "Enter a business name before saving."
        : "Enter a customer reference before saving.",
    );
  }
  if (
    result.finalDisplayRate == null ||
    !Number.isFinite(result.finalDisplayRate)
  ) {
    throw new Error("Complete the pricing inputs before saving this quote.");
  }
  const productName =
    area === "home"
      ? (getDemoFormConfig("home").products.find(
          (product) => product.id === input.productId,
        )?.name ?? "Home loan")
      : area === "personal"
        ? (getDemoFormConfig("personal").products.find(
            (product) => product.id === input.productId,
          )?.name ?? "Personal loan")
        : String(input.facilityType ?? "Commercial facility").replaceAll(
            "_",
            " ",
          );
  return saveQuote(
    {
      area,
      customerName: name.trim(),
      input: { ...input, marketEvidence },
      result,
      summary: {
        productName,
        amount: typeof input.loanAmount === "number" ? input.loanAmount : 0,
        rate: result.finalDisplayRate,
        repayment: result.monthlyRepayment,
        approval: result.approvalLevel,
      },
    },
    revisedFromQuoteId,
  );
}
