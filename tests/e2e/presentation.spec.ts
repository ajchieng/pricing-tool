import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("market search filters, compares, and attaches fictional evidence", async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      apiRequests.push(request.url());
  });
  await page.goto("/market-search/");
  await expect(
    page.getByRole("heading", { name: "Market Search", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Search home loans products", { exact: true })
    .fill("Riverbank");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("link", {
      name: "Add Everyday Home to comparison",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Add Simple Home to comparison",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Reset", exact: true }).click();
  await page
    .getByRole("link", { name: "Add Everyday Home to comparison", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Add Simple Home to comparison", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Selected product comparison",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Selected product comparison" }),
  ).toContainText("Everyday Home");
  await page
    .getByRole("link", { name: /^Use in (?:new )?quote$/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/home-loans\/new\/\?marketId=/);
  await expect(
    page.getByRole("heading", { name: "New Home Loan Quote", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Competitor lender", exact: true }),
  ).toHaveValue("Riverbank Demo");
  await expect(
    page.getByText("Market evidence attached", { exact: true }),
  ).toBeVisible();
  expect(apiRequests).toEqual([]);
});

test("all guides, quote exports and missing routes work on the static host", async ({
  page,
}) => {
  for (const area of ["home", "personal", "commercial"]) {
    await page.goto(`/${area}-loans/guide/`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /guide$/i,
    );
    await expect(
      page.getByRole("heading", {
        name: "Active economic policy",
        exact: true,
      }),
    ).toBeVisible();
  }
  await page.goto("/home-loans/quote/?id=2");
  await page.getByText("More", { exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download JSON", exact: true })
    .click();
  expect((await downloadEvent).suggestedFilename()).toBe(
    "pricing-tool-home-2.json",
  );
  await page.emulateMedia({ media: "print" });
  await expect(
    page.getByText(
      "Pricing Tool — fictional portfolio example. Not an offer or credit decision.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  await page.goto("/home-loans/quote/?id=invalid");
  await expect(
    page.getByRole("heading", { name: "Quote not found in this browser" }),
  ).toBeVisible();
  const response = await page.goto("/page-that-does-not-exist/");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "This page isn’t in the demo" }),
  ).toBeVisible();
});

test("desktop and mobile visual and accessibility review", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [],
    external: string[] = [];
  const findings: Array<{ page: string; issue: string; nodes?: unknown }> = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!url.hostname.match(/^(127\.0\.0\.1|localhost)$/))
      external.push(request.url());
  });
  for (const [name, url] of [
    ["workspace", "/"],
    ["home-calculator", "/home-loans/new/"],
    ["home-detail", "/home-loans/quote/?id=2"],
    ["market", "/market-search/"],
    ["guide", "/personal-loans/guide/"],
    ["configuration", "/admin/"],
    ["configuration-rates", "/admin/home-loans/rates/"],
    ["configuration-score", "/admin/home-loans/score-model/"],
    ["configuration-profitability", "/admin/home-loans/profitability/"],
    ["configuration-market", "/admin/market-search/"],
  ] as const) {
    await page.goto(url);
    if (name === "workspace")
      await expect(
        page.getByRole("heading", { name: "Lending pricing" }),
      ).toBeVisible();
    if (name === "home-calculator") {
      await page
        .getByRole("button", { name: "Load sample scenario", exact: true })
        .click();
      await expect(
        page
          .locator("button:visible")
          .filter({ hasText: /^Save quote$/ })
          .first(),
      ).toBeEnabled();
    }
    if (name === "home-detail")
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Alex Morgan",
      );
    if (name.startsWith("configuration"))
      await expect(
        page.getByRole("heading", { name: "Configuration", exact: true }),
      ).toBeVisible();
    if (name === "configuration")
      await expect(
        page
          .getByRole("navigation", { name: "Admin sections" })
          .getByRole("link", { name: "Admin overview", exact: true }),
      ).toHaveAttribute("aria-current", "page");
    if (name.startsWith("configuration"))
      await expect(
        page
          .getByRole("navigation", { name: "Admin sections" })
          .locator('a[aria-current="page"]'),
      ).toBeInViewport({ ratio: 1 });
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1 ||
        window.innerWidth > document.documentElement.clientWidth + 1,
    );
    if (overflow)
      findings.push({ page: name, issue: "Page overflows the viewport" });
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    findings.push(
      ...accessibility.violations.map((item) => ({
        page: name,
        issue: item.id,
        nodes: item.nodes.map((node) => node.target),
      })),
    );
    await page.screenshot({
      path: testInfo.outputPath(`${name}.png`),
      fullPage: name === "workspace" || name === "market",
    });
  }
  expect(findings).toEqual([]);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
