import { expect, test, type Page } from "@playwright/test";
import type { DemoArea, DemoCore, DemoQuote } from "../../src/lib/demo/types";

const databaseName = "pricing-portfolio-demo";
const domainConfig = {
  home: { name: "Home", amountId: "loan-amount", revisedAmount: "460000" },
  personal: { name: "Personal", amountId: "pl-amount", revisedAmount: "18000" },
  commercial: {
    name: "Commercial",
    amountId: "cl-amount",
    revisedAmount: "350000",
  },
} as const;

async function readStore<T>(page: Page, storeName: string): Promise<T[]> {
  return page.evaluate(
    async ({ databaseName, storeName }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const opening = indexedDB.open(databaseName);
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
    },
    { databaseName, storeName },
  ) as Promise<T[]>;
}

function quoteId(page: Page): number {
  return Number(new URL(page.url()).searchParams.get("id"));
}

async function loadScenario(
  page: Page,
  area: DemoArea,
  name: string,
): Promise<void> {
  await page.goto(`/${area}-loans/new/`);
  await page
    .getByRole("button", { name: "Load sample scenario", exact: true })
    .click();
  await page
    .getByLabel(
      area === "commercial" ? "Business name" : "Customer name or reference",
      { exact: true },
    )
    .fill(name);
  await expect(
    page
      .locator("button:visible")
      .filter({ hasText: /^Save quote$/ })
      .first(),
  ).toBeEnabled();
}

async function saveEditor(
  page: Page,
  area: DemoArea,
  revision = false,
): Promise<number> {
  const save = page
    .locator("button:visible")
    .filter({ hasText: revision ? /^Save revision$/ : /^Save quote$/ })
    .first();
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page).toHaveURL(new RegExp(`/${area}-loans/quote/\\?id=\\d+$`));
  await expect(
    page.getByRole("link", { name: "Revise quote", exact: true }),
  ).toBeVisible();
  return quoteId(page);
}

test("opens the complete fictional workspace anonymously with seeded revisions", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Lending workspace", exact: true }),
  ).toBeVisible();
  expect(await readStore<DemoQuote>(page, "home")).toHaveLength(3);
  expect(await readStore<DemoQuote>(page, "personal")).toHaveLength(2);
  expect(await readStore<DemoQuote>(page, "commercial")).toHaveLength(2);
  const home = await readStore<DemoQuote>(page, "home");
  const current = home.find((quote) => quote.revision === 2)!;
  await page.goto(`/home-loans/quote/?id=${current.id}`);
  await page.getByRole("button", { name: "History (2)", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Revision history" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Version 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Version 2 · Current", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Alex Morgan",
  );
  expect(await page.context().cookies()).toEqual([]);
});

for (const area of ["home", "personal", "commercial"] as const) {
  test(`${domainConfig[area].name} calculates, saves, revises and preserves its original decision`, async ({
    page,
  }) => {
    const name = `Browser ${domainConfig[area].name} Example`;
    await loadScenario(page, area, name);
    const initialId = await saveEditor(page, area);
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    const initial = (await readStore<DemoQuote>(page, area)).find(
      (quote) => quote.id === initialId,
    )!;
    expect(initial.summary.rate).toBeGreaterThan(0);
    expect(initial.summary.repayment).toBeGreaterThan(0);
    await page.getByRole("link", { name: "Revise quote", exact: true }).click();
    const amount = page.locator(`#${domainConfig[area].amountId}`);
    await expect(amount).toBeVisible();
    // The money field removes its display formatting on focus before editing.
    await amount.focus();
    await amount.fill(domainConfig[area].revisedAmount);
    const revisedId = await saveEditor(page, area, true);
    const stored = await readStore<DemoQuote>(page, area);
    const revised = stored.find((quote) => quote.id === revisedId)!;
    expect(revised).toMatchObject({ coreId: initial.coreId, revision: 2 });
    expect(revised.input.loanAmount).toBe(
      Number(domainConfig[area].revisedAmount),
    );
    expect(revised.summary.amount).not.toBe(initial.summary.amount);
    expect(stored.find((quote) => quote.id === initialId)).toEqual(initial);
    await page
      .getByRole("button", { name: "History (2)", exact: true })
      .click();
    await page.getByRole("link", { name: "Version 1", exact: true }).click();
    await expect(
      page.getByText(
        "Historical pricing snapshot. Workflow actions are available on the current version.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Revise quote", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("combobox", { name: "Review decision", exact: true }),
    ).toHaveCount(0);
    await page.reload();
    expect(
      (await readStore<DemoQuote>(page, area)).find(
        (quote) => quote.id === initialId,
      ),
    ).toEqual(initial);
    await expect(
      page.getByRole("link", { name: "Open current version", exact: true }),
    ).toBeVisible();
  });
}

test("records review, assignment, comments, stars and searchable workflow history", async ({
  page,
}) => {
  const name = "Workflow Example";
  await loadScenario(page, "home", name);
  const savedId = await saveEditor(page, "home");
  const quote = (await readStore<DemoQuote>(page, "home")).find(
    (item) => item.id === savedId,
  )!;
  await page.getByRole("button", { name: "Star quote", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unstar quote", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("combobox", {
      name: "Assign to a fictional colleague",
      exact: true,
    })
    .selectOption("Sample reviewer");
  await expect(
    page.getByText("Assignment updated.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Add a demo comment", { exact: true })
    .fill("Example scenario checked for a portfolio review.");
  await page.getByRole("button", { name: "Add comment", exact: true }).click();
  await expect(page.getByText("Comment saved.", { exact: true })).toBeVisible();
  await page
    .getByRole("combobox", { name: "Workflow status", exact: true })
    .selectOption("ready_for_review");
  await expect(
    page.getByText("Workflow updated.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save review", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Review reason (required)", { exact: true })
    .fill("Capital and expected loss are complete in this fictional example.");
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  await expect(page.getByText("Review saved.", { exact: true })).toBeVisible();
  const core = (await readStore<DemoCore>(page, "cores")).find(
    (item) => item.id === quote.coreId,
  )!;
  expect(core).toMatchObject({
    starred: true,
    assignee: "Sample reviewer",
    status: "reviewed",
    review: { quoteId: savedId, decision: "accepted", actor: "Demo user" },
  });
  expect(core.comments).toHaveLength(1);
  expect(core.history.map((item) => item.action)).toEqual([
    "created",
    "starred",
    "assigned",
    "commented",
    "workflow",
    "reviewed",
  ]);
  await page.goto("/home-loans/");
  await page.getByLabel("Search saved quotes", { exact: true }).fill(name);
  await page.getByLabel("Starred only", { exact: true }).check();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("Reviewed");
  await page
    .getByLabel("Search saved quotes", { exact: true })
    .fill("not-present-example");
  await expect(
    page.getByRole("heading", { name: "No matching quotes", exact: true }),
  ).toBeVisible();
});

test("isolates browser contexts and resets only this demo's local workspace", async ({
  page,
  browser,
}) => {
  const name = "Isolated Custom Example";
  await loadScenario(page, "personal", name);
  const savedId = await saveEditor(page, "personal");
  const savedUrl = page.url();
  const isolated = await browser.newContext();
  try {
    const otherPage = await isolated.newPage();
    await otherPage.goto(savedUrl);
    await expect(
      otherPage.getByRole("heading", {
        name: "Quote not found in this browser",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      (await readStore<DemoQuote>(otherPage, "personal")).some(
        (quote) => quote.id === savedId,
      ),
    ).toBe(false);
  } finally {
    await isolated.close();
  }
  await page.evaluate(() => localStorage.setItem("unrelated-example", "keep"));
  const openNavigation = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await openNavigation.isVisible()) await openNavigation.click();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page
    .getByRole("button", { name: "Reset workspace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Lending workspace", exact: true }),
  ).toBeVisible();
  expect(await readStore<DemoQuote>(page, "personal")).toHaveLength(2);
  expect(
    await page.evaluate(() => localStorage.getItem("unrelated-example")),
  ).toBe("keep");
  await page.goto(savedUrl);
  await expect(
    page.getByRole("heading", {
      name: "Quote not found in this browser",
      exact: true,
    }),
  ).toBeVisible();
});

test("reports disabled storage and keeps an actionable recovery screen", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: undefined,
    });
  });
  await page.goto("/");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "browser storage",
  );
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reset demo storage", exact: true }),
  ).toBeVisible();
});

test("recovers corrupt demo metadata through its visible reset control", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Lending workspace", exact: true }),
  ).toBeVisible();
  await page.evaluate(async (databaseName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open(databaseName);
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("meta", "readwrite");
        tx.objectStore("meta").put({
          id: "state",
          schemaVersion: 1,
          nextQuoteId: "unreadable",
        });
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }, databaseName);
  await page.reload();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "saved demo format is unreadable",
  );
  await page
    .getByRole("button", { name: "Reset demo storage", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Lending workspace", exact: true }),
  ).toBeVisible();
  expect(await readStore<DemoQuote>(page, "home")).toHaveLength(3);
  expect(await readStore<DemoQuote>(page, "personal")).toHaveLength(2);
  expect(await readStore<DemoQuote>(page, "commercial")).toHaveLength(2);
});

test("shows a quota error without losing inputs or partially saving a quote", async ({
  page,
}) => {
  await loadScenario(page, "home", "Quota Recovery Example");
  const before = await readStore<DemoQuote>(page, "home");
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (
      value: unknown,
      key?: IDBValidKey,
    ) {
      if (this.name === "home") {
        IDBObjectStore.prototype.add = original;
        throw new DOMException(
          "Simulated storage exhaustion",
          "QuotaExceededError",
        );
      }
      return original.call(this, value, key);
    };
  });
  await page
    .locator("button:visible")
    .filter({ hasText: /^Save quote$/ })
    .first()
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Browser storage is full" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Customer name or reference", { exact: true }),
  ).toHaveValue("Quota Recovery Example");
  expect(await readStore<DemoQuote>(page, "home")).toEqual(before);
  await saveEditor(page, "home");
  await expect(
    page.getByRole("heading", { name: "Quota Recovery Example", exact: true }),
  ).toBeVisible();
});
