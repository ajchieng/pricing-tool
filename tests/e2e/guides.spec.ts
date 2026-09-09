import { expect, test } from "@playwright/test";

test("restored guides retain score diagrams, profitability navigation and browser PDF export", async ({
  page,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      requests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.print = () =>
      document.documentElement.setAttribute("data-guide-print", "requested");
  });
  for (const area of ["home", "personal", "commercial"]) {
    await page.goto(`/${area}-loans/guide/`);
    const productName = `${area[0].toUpperCase()}${area.slice(1)} Loans`;
    await expect(
      page
        .getByRole("navigation", {
          name: `${productName} navigation`,
          exact: true,
        })
        .getByRole("link", { name: "Guide", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    const tabs = page.getByRole("navigation", {
      name: "Guide sections",
      exact: true,
    });
    await expect(
      tabs.getByRole("link", { name: /^Customer score/ }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("img", {
        name: "Category weight donut chart",
        exact: true,
      }),
    ).toBeAttached();
    await expect(
      page.getByRole("heading", {
        name: "Every factor in the model",
        exact: true,
      }),
    ).toBeAttached();
    await expect(
      page.getByRole("heading", {
        name: "Active factor scoring rules",
        exact: true,
      }),
    ).toBeAttached();
    await page.getByRole("button", { name: "Export PDF", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-guide-print",
      "requested",
    );
    await tabs.getByRole("link", { name: /^Profitability/ }).click();
    await expect(page).toHaveURL(
      new RegExp(`/${area}-loans/guide/profitability/?$`),
    );
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "profitability calculation guide",
    );
    await expect(
      tabs.getByRole("link", { name: /^Profitability/ }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByText("Fictional demonstration assumptions.", { exact: false }),
    ).toBeVisible();
    await tabs.getByRole("link", { name: /^Customer score/ }).click();
    await expect(page).toHaveURL(new RegExp(`/${area}-loans/guide/?$`));
  }
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
});
