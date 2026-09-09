import { expect, test, type Page } from "@playwright/test";
import type { DemoCore, DemoQuote } from "../../src/lib/demo/types";

// Always create a blank context, including when targeting a public deployment.
test.use({
  storageState: { cookies: [], origins: [] },
  serviceWorkers: "block",
});

async function readLocalRecords<T>(
  page: Page,
  storeName: "home" | "cores",
): Promise<T[]> {
  return page.evaluate(async (storeName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open("pricing-portfolio-demo");
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error);
    });
    try {
      return await new Promise<unknown[]>((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const reading = tx.objectStore(storeName).getAll();
        tx.oncomplete = () => resolve(reading.result);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }, storeName) as Promise<T[]>;
}

async function saveQuoteEditor(page: Page, revision = false): Promise<number> {
  const button = page
    .locator("button:visible")
    .filter({ hasText: revision ? /^Save revised quote$/ : /^Save quote$/ })
    .first();
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page).toHaveURL(/\/home-loans\/quote\/\?id=\d+$/);
  await expect(
    page.getByRole("link", { name: "Revise quote", exact: true }),
  ).toBeVisible();
  return Number(new URL(page.url()).searchParams.get("id"));
}

test("public demo calculates, saves, revises and reviews without sign-in or backend requests", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  expect(baseURL).toBeTruthy();
  const expectedOrigin = new URL(baseURL!).origin;
  const unexpectedRequests: { method: string; url: string }[] = [];
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const isFetch =
      request.resourceType() === "fetch" || request.resourceType() === "xhr";
    // Next.js probes exported document routes with HEAD before prefetching.
    const isStaticDocumentProbe =
      request.method() === "HEAD" &&
      /^\/(?:(?:home|personal|commercial)-loans\/(?:(?:new|quote|revise|guide(?:\/profitability)?)\/)?|(?:market-search|about)\/)?$/.test(
        url.pathname,
      );
    const isStaticNextPayload =
      isStaticDocumentProbe ||
      url.pathname.endsWith(".txt") ||
      url.pathname.startsWith("/_next/static/") ||
      url.searchParams.has("_rsc");
    if (
      url.origin !== expectedOrigin ||
      !["GET", "HEAD"].includes(request.method()) ||
      /^\/api(?:\/|$)/.test(url.pathname) ||
      (isFetch && !isStaticNextPayload)
    ) {
      unexpectedRequests.push({ method: request.method(), url: request.url() });
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });

  await expect
    .poll(async () => (await context.storageState()).origins.length)
    .toBe(0);
  expect(await context.cookies()).toEqual([]);
  const response = await page.goto("/home-loans/new/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(`${expectedOrigin}/home-loans/new/`);
  await page
    .getByRole("button", { name: "Load sample scenario", exact: true })
    .click();
  await page
    .getByLabel("Customer name or reference", { exact: true })
    .fill("Public Demo Smoke Example");
  const originalId = await saveQuoteEditor(page);
  const original = (await readLocalRecords<DemoQuote>(page, "home")).find(
    (quote) => quote.id === originalId,
  )!;
  expect(original.summary.rate).toBeGreaterThan(0);
  expect(original.summary.amount).toBe(420_000);

  await page.getByRole("link", { name: "Revise quote", exact: true }).click();
  const amount = page.locator("#loan-amount");
  await expect(amount).toBeVisible();
  await amount.focus();
  await amount.fill("460000");
  const revisedId = await saveQuoteEditor(page, true);
  expect(revisedId).not.toBe(originalId);
  const saved = await readLocalRecords<DemoQuote>(page, "home");
  const revised = saved.find((quote) => quote.id === revisedId)!;
  expect(revised).toMatchObject({
    coreId: original.coreId,
    revision: 2,
    summary: { amount: 460_000 },
  });
  expect(revised.result).not.toEqual(original.result);
  expect(saved.find((quote) => quote.id === originalId)).toEqual(original);

  await page
    .getByRole("combobox", { name: "Review decision", exact: true })
    .selectOption("accepted");
  await page
    .getByLabel("Review reason (required)", { exact: true })
    .fill(
      "Public demonstration: complete saved capital, expected loss and profit reviewed.",
    );
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  await expect(page.getByText("Review saved.", { exact: true })).toBeVisible();
  const core = (await readLocalRecords<DemoCore>(page, "cores")).find(
    (item) => item.id === original.coreId,
  )!;
  expect(core).toMatchObject({
    currentQuoteId: revisedId,
    status: "reviewed",
    review: { quoteId: revisedId, decision: "accepted", actor: "Demo user" },
  });
  expect(core.history.map((event) => event.action)).toEqual([
    "created",
    "revised",
    "reviewed",
  ]);

  await page.getByRole("button", { name: "History (2)", exact: true }).click();
  await page
    .getByRole("listitem")
    .filter({
      has: page.getByRole("heading", { name: "Version 1", exact: true }),
    })
    .getByRole("link", { name: "View this version", exact: true })
    .click();
  await expect(page).toHaveURL(
    `${expectedOrigin}/home-loans/quote/?id=${originalId}`,
  );
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Open current version", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Review decision", exact: true }),
  ).toHaveCount(0);
  expect(
    (await readLocalRecords<DemoQuote>(page, "home")).find(
      (quote) => quote.id === originalId,
    ),
  ).toEqual(original);
  expect(pageErrors).toEqual([]);
  expect(
    unexpectedRequests,
    "The demo must use only static same-origin GET/HEAD resources and Next.js route payloads.",
  ).toEqual([]);
  await testInfo.attach("public-demo-verification", {
    contentType: "application/json",
    body: JSON.stringify(
      {
        origin: expectedOrigin,
        browserProject: testInfo.project.name,
        cleanBrowser: true,
        originalQuoteId: originalId,
        revisedQuoteId: revisedId,
        originalVersionUnchanged: true,
        review: core.review?.decision,
        backendRequests: unexpectedRequests,
      },
      null,
      2,
    ),
  });
});
