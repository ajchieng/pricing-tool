import { z } from "zod";
import {
  Lender_PRODUCT_VALUES,
  inLenderCatalogueOrder,
} from "./lender-products";

const lenderProductValueSchema = z.enum(Lender_PRODUCT_VALUES);

/**
 * Server-boundary validation for Lender relationship products. Keep this schema
 * separate from the browser-safe catalogue helpers so quote workspaces do not
 * ship the Zod runtime merely to hydrate saved JSON.
 */
export const lenderProductsSchema = z
  .array(lenderProductValueSchema)
  .max(Lender_PRODUCT_VALUES.length)
  .superRefine((values, context) => {
    if (new Set(values).size !== values.length) {
      context.addIssue({
        code: "custom",
        message: "Each Lender product can only be selected once.",
      });
    }
  })
  .transform((values) => inLenderCatalogueOrder(values));
