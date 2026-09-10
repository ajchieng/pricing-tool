import { getDemoConfiguration, type DemoConfiguration } from "./configuration";
import type { SampleMarketProduct } from "./market";

export function isDemoMarketProductEnabled(
  product: SampleMarketProduct,
  configuration: DemoConfiguration = getDemoConfiguration(),
): boolean {
  const source = configuration.tables.market_source_setting.find(
    (row) => row.name === product.lender,
  );
  const field =
    product.area === "home"
      ? "enabledHome"
      : product.area === "personal"
        ? "enabledPersonal"
        : "enabledCommercial";
  const setting = configuration.tables.market_product_setting.find(
    (row) => row.productKey === product.id,
  );
  return source?.[field] === true && setting?.active !== false;
}
