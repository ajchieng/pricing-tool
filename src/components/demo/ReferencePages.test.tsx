import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AboutPage } from "./ReferencePages";

describe("fictional policy reference", () => {
  it("explains browser isolation and snapshots without unsupported claims", () => {
    const rendered = renderToStaticMarkup(<AboutPage />);
    expect(rendered).toContain("https://github.com/ajchieng/pricing-tool");
    expect(rendered).toContain("Historical pricing stays frozen");
    expect(rendered).toContain("Changes stay in this browser");
    expect(rendered).toContain("fictional products");
  });
});
