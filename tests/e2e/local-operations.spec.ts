import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

for (const area of ["home", "personal", "commercial"] as const) {
  test(`${area} original bulk-import workflow reviews sample JSON and saves only valid rows`, async ({
    page,
  }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      if (
        !["GET", "HEAD"].includes(request.method()) ||
        new URL(request.url()).pathname.startsWith("/api/")
      )
        writes.push(request.url());
    });
    await page.goto(`/${area}-loans/`);
    await page.getByRole("link", { name: "Bulk import", exact: true }).click();
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download example JSON" }).click();
    const download = await downloading;
    const rows = JSON.parse(await readFile((await download.path())!, "utf8"));
    rows.push({ loanAmount: -1 });
    await page.getByRole("button", { name: "Paste JSON", exact: true }).click();
    await page
      .getByLabel("Paste JSON array", { exact: true })
      .fill(JSON.stringify(rows));
    await page.getByRole("button", { name: "Review pasted JSON" }).click();
    await expect(
      page.getByRole("heading", { name: "Review upload", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Create 1 Draft quote", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Import results", exact: true }),
    ).toBeVisible();
    const quote = page.locator(`a[href^="/${area}-loans/quote/?id="]`).first();
    await expect(quote).toBeVisible();
    const href = await quote.getAttribute("href");
    await quote.click();
    await expect(page).toHaveURL(
      new RegExp(`/${area}-loans/quote/\\?id=\\d+$`),
    );
    await page.reload();
    await expect(
      page.getByRole("link", { name: "Revise quote", exact: true }),
    ).toBeVisible();
    expect(href).toContain("?id=");
    expect(writes).toEqual([]);
  });
}

test("local feedback retains attachments, triage history and browser isolation", async ({
  page,
  browser,
  baseURL,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url());
  });
  await page.goto("/feedback/");
  await page
    .getByLabel("Feedback", { exact: true })
    .fill("Fictional review: the pricing explanation is easy to follow.");
  await page.getByLabel("Screenshots or files", { exact: true }).setInputFiles({
    name: "demo-note.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Fictional portfolio feedback attachment"),
  });
  await page
    .getByRole("button", { name: "Save feedback", exact: true })
    .click();
  await expect(
    page.getByText(
      "Feedback saved in this browser. Review it in the local feedback inbox.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.goto("/admin/feedback/");
  await expect(
    page
      .getByText("Fictional review: the pricing explanation is easy to follow.")
      .first(),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /Demo user #1.*Fictional review:/ })
    .click();
  await page.locator('select[name="status"]').last().selectOption("reviewed");
  await page
    .locator('textarea[name="adminNotes"]')
    .fill("Reviewed the fictional attachment.");
  await page.getByRole("button", { name: "Save triage", exact: true }).click();
  await expect(
    page.getByText("Triage saved in this browser.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator('textarea[name="adminNotes"]')).toHaveValue(
    "Reviewed the fictional attachment.",
  );
  await page.goto("/admin/audit/?category=feedback");
  await expect(
    page.getByText("feedback.created", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("feedback.triaged", { exact: true }),
  ).toBeVisible();
  const separate = await browser.newContext({ baseURL });
  try {
    const other = await separate.newPage();
    await other.goto("/admin/feedback/");
    await expect(
      other.getByText(
        "Fictional review: the pricing explanation is easy to follow.",
      ),
    ).toHaveCount(0);
  } finally {
    await separate.close();
  }
  expect(writes).toEqual([]);
});

test("market administration applies per-domain lender selections and restores the fictional catalogue", async ({
  page,
}) => {
  await page.goto("/admin/market-search/");
  const homeLender = page.getByRole("checkbox", {
    name: "Home Loans — Riverbank Demo",
    exact: true,
  });
  await expect(homeLender).toBeChecked();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.clientWidth,
      })),
    )
    .toEqual({
      viewport: page.viewportSize()!.width,
      document: page.viewportSize()!.width,
    });
  await homeLender.uncheck();
  await expect(homeLender).not.toBeChecked();
  await page
    .getByRole("button", { name: "Save selections", exact: true })
    .click();
  await expect(
    page.getByText(
      "Lender selections saved for Market Search in this browser.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.goto("/market-search/");
  await expect(
    page.getByRole("link", {
      name: "Add Everyday Home to comparison",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", {
      name: "Add Simple Home to comparison",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/admin/market-search/");
  await page
    .getByRole("button", { name: "Restore fictional catalogue", exact: true })
    .click();
  await expect(
    page.getByText("Fictional catalogue restored in this browser.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/market-search/");
  await expect(
    page.getByRole("link", {
      name: "Add Everyday Home to comparison",
      exact: true,
    }),
  ).toBeVisible();
});
