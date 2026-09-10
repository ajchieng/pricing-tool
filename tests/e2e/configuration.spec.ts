import { expect, test, type Page } from "@playwright/test";
import type {
  DemoConfiguration,
  DemoConfigurationHistory,
} from "../../src/lib/demo/configuration";
import type { DemoArea, DemoQuote } from "../../src/lib/demo/types";

const policyDatabase = "pricing-portfolio-configuration";
const quoteDatabase = "pricing-portfolio-demo";
async function records<T>(
  page: Page,
  databaseName: string,
  storeName: string,
): Promise<T[]> {
  return page.evaluate(
    async ({ databaseName, storeName }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(databaseName);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      try {
        return await new Promise<unknown[]>((resolve, reject) => {
          const tx = database.transaction(storeName, "readonly");
          const read = tx.objectStore(storeName).getAll();
          tx.oncomplete = () => resolve(read.result);
          tx.onabort = () => reject(tx.error);
        });
      } finally {
        database.close();
      }
    },
    { databaseName, storeName },
  ) as Promise<T[]>;
}
async function policy(page: Page) {
  return (
    await records<DemoConfiguration>(page, policyDatabase, "configuration")
  )[0];
}
async function quotes(page: Page, area: DemoArea) {
  return records<DemoQuote>(page, quoteDatabase, area);
}
async function openWorkspace(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Lending pricing", exact: true }),
  ).toBeVisible();
}
async function prepareScenario(page: Page, area: DemoArea, name: string) {
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
async function saveScenario(page: Page, area: DemoArea, name: string) {
  await prepareScenario(page, area, name);
  return saveCurrentScenario(page, area, name);
}
async function saveCurrentScenario(page: Page, area: DemoArea, name: string) {
  const save = page
    .locator("button:visible")
    .filter({ hasText: /^Save quote$/ })
    .first();
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page).toHaveURL(new RegExp(`/${area}-loans/quote/\\?id=\\d+$`));
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  const id = Number(new URL(page.url()).searchParams.get("id"));
  return (await quotes(page, area)).find((quote) => quote.id === id)!;
}
const rateRows = {
  home: {
    id: 1101,
    label: "Carded rate",
    table: "product_rate",
    field: "cardedRate",
  },
  personal: {
    id: 2101,
    label: "Carded rate",
    table: "personal_loan_product_rate",
    field: "cardedRate",
  },
  commercial: {
    id: 3101,
    label: "Base rate",
    table: "commercial_loan_product_rate",
    field: "baseRate",
  },
} as const;
async function updateRate(page: Page, area: DemoArea, value: number) {
  const setting = rateRows[area];
  await page.goto(`/admin/${area}-loans/rates/`);
  const row = page.locator(`#config-${area}-rate-${setting.id}`);
  await expect(row).toBeVisible();
  await row.getByLabel(setting.label, { exact: true }).fill(String(value));
  await row.getByRole("button", { name: "Save", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await policy(page)).tables[setting.table].find(
          (item) => item.id === setting.id,
        )?.[setting.field],
    )
    .toBe(value);
}
async function updateCapital(page: Page, value: number) {
  await page.goto("/admin/global-assumptions/");
  await page
    .getByLabel("Capital ratio (%)", { exact: true })
    .fill(String(value));
  await page
    .getByLabel("Change reason", { exact: true })
    .fill("Fictional browser capital sensitivity");
  await page
    .getByRole("button", { name: "Propose capital ratio", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await policy(page)).tables.capital_allocation_setting[0]
          .capitalRatioPct,
    )
    .toBe(value);
}

for (const area of ["home", "personal", "commercial"] as const) {
  test(`${area} configuration rate edits reach new pricing and guides while saved quotes stay frozen`, async ({
    page,
  }) => {
    const apiRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/"))
        apiRequests.push(request.url());
    });
    const original = await saveScenario(
      page,
      area,
      `Before ${area} configuration`,
    );
    const state = await policy(page),
      setting = rateRows[area];
    const previous = state.tables[setting.table].find(
      (row) => row.id === setting.id,
    )![setting.field] as number;
    await prepareScenario(page, area, `After ${area} configuration`);
    const editing = await page.context().newPage();
    await updateRate(editing, area, previous + 0.5);
    await editing.goto(`/${area}-loans/guide/`);
    await expect(
      editing.getByRole("heading", {
        name: "Every factor in the model",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      editing
        .getByText(`${(previous + 0.5).toFixed(2)}%`, { exact: true })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByRole("status").filter({
        hasText: `Suggested rate ${(original.summary.rate! + 0.5).toFixed(2)}`,
      }),
    ).toContainText(
      `Suggested rate ${(original.summary.rate! + 0.5).toFixed(2)}`,
    );
    await expect(
      page.getByLabel(
        area === "commercial" ? "Business name" : "Customer name or reference",
        { exact: true },
      ),
    ).toHaveValue(`After ${area} configuration`);
    const updated = await saveCurrentScenario(
      page,
      area,
      `After ${area} configuration`,
    );
    await editing.close();
    expect(updated.summary.rate).toBeCloseTo(original.summary.rate! + 0.5);
    expect(updated.result).not.toEqual(original.result);
    expect(
      (await quotes(page, area)).find((quote) => quote.id === original.id),
    ).toEqual(original);
    const history = await records<DemoConfigurationHistory>(
      page,
      policyDatabase,
      "history",
    );
    expect(history).toContainEqual(
      expect.objectContaining({
        targetType: setting.table,
        action: "update",
        actorName: "Demo user",
        before: expect.objectContaining({ [setting.field]: previous }),
        after: expect.objectContaining({ [setting.field]: previous + 0.5 }),
      }),
    );
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: `After ${area} configuration`,
        exact: true,
      }),
    ).toBeVisible();
    expect(
      (await quotes(page, area)).find((quote) => quote.id === original.id),
    ).toEqual(original);
    expect(apiRequests).toEqual([]);
  });
}

test("score publication and compatible expected-loss publication create new policy versions", async ({
  page,
}) => {
  await openWorkspace(page);
  const before = await policy(page);
  await page.goto("/admin/home-loans/score-model/");
  await page
    .getByLabel("Model name", { exact: true })
    .fill("Browser published Home model");
  await page.getByLabel("Maximum discount", { exact: true }).fill("1.25");
  await page
    .getByRole("button", { name: "Publish score model", exact: true })
    .click();
  await expect
    .poll(async () => (await policy(page)).scoreModels.home.version)
    .toBe(before.scoreModels.home.version + 1);
  await page.goto("/home-loans/guide/");
  await expect(
    page.getByText(/Browser published Home model/).first(),
  ).toBeVisible();
  await page.goto("/admin/home-loans/profitability/");
  const editor = page
    .locator("form")
    .filter({ has: page.locator('textarea[name="pdBands"]') });
  await expect(editor).toHaveCount(1);
  await editor
    .getByLabel("Policy name", { exact: true })
    .fill("Browser compatible Home expected loss");
  await editor.getByLabel(/^Effective from/).fill("2026-01-01");
  const loss = before.expectedLossPolicies.home;
  const withoutIds = (rows: Array<{ id: number | null }>) =>
    rows.map(({ id, ...row }) => {
      void id;
      return row;
    });
  await editor
    .locator('textarea[name="pdBands"]')
    .fill(JSON.stringify(withoutIds(loss.pdBands)));
  await editor
    .locator('textarea[name="lgdBands"]')
    .fill(JSON.stringify(withoutIds(loss.lgdBands)));
  await editor
    .locator('textarea[name="eadSettings"]')
    .fill(JSON.stringify(withoutIds(loss.eadSettings)));
  await editor
    .getByLabel("Change reason", { exact: true })
    .fill("Publish complete compatible fictional calibration");
  await editor
    .getByRole("button", { name: "Publish expected-loss policy", exact: true })
    .click();
  await expect
    .poll(async () => (await policy(page)).expectedLossPolicies.home.version)
    .toBe(loss.version + 1);
  const after = await policy(page);
  expect(after.expectedLossPolicies.home.sourceScoreModelVersion).toBe(
    after.scoreModels.home.version,
  );
  const saved = await saveScenario(page, "home", "Published policy example");
  const result = saved.result as {
    profitability: { expectedLoss: { status: string } };
  };
  expect(result.profitability.expectedLoss.status).toBe("calculated");
  const history = await records<DemoConfigurationHistory>(
    page,
    policyDatabase,
    "history",
  );
  expect(history.map((row) => row.targetType)).toEqual([
    "score_model",
    "expected_loss_policy",
  ]);
});

test("an open guide refreshes capital and its worked example across tabs without reloading", async ({
  page,
}) => {
  await page.goto("/home-loans/guide/profitability/");
  await expect(
    page.getByRole("heading", {
      name: "Home loan profitability calculation guide",
      exact: true,
    }),
  ).toBeVisible();
  const editing = await page.context().newPage();
  try {
    await updateCapital(editing, 14);
    await expect(
      page.getByText("14.00%", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText(/fictional 14% capital ratio/)).toBeVisible();
    await page.reload();
    await expect(
      page.getByText("14.00%", { exact: true }).first(),
    ).toBeVisible();
    expect(
      (await policy(page)).tables.capital_allocation_setting[0].capitalRatioPct,
    ).toBe(14);
  } finally {
    await editing.close();
  }
});

test("configuration search focuses the exact setting and display preferences and approvals persist", async ({
  page,
}) => {
  await page.goto(
    "/admin/search/?q=Everyday%20Home%20Variable&area=home&kind=setting",
  );
  const result = page.locator(
    'a[href="/admin/home-loans/rates/#config-home-rate-1101"]',
  );
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(
    /\/admin\/home-loans\/rates\/#config-home-rate-1101$/,
  );
  await expect(page.locator("#config-home-rate-1101")).toBeFocused();
  await page.goto(
    "/admin/search/?q=Workspace%20display&area=global&kind=setting",
  );
  await page
    .locator('a[href="/admin/display/#config-global-display-1"]')
    .click();
  await expect(page.locator("#config-global-display-1")).toBeFocused();
  await page.getByLabel(/High contrast workspace/).check();
  await page.getByLabel(/Larger numeric display/).check();
  await page
    .getByRole("button", { name: "Save display settings", exact: true })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-high-contrast",
    "true",
  );
  await expect(page.locator("body")).toHaveAttribute(
    "data-numeric-display",
    "large",
  );
  await page.goto("/admin/governance/");
  await page
    .getByLabel("Decision notes", { exact: true })
    .fill("Reviewed this fictional capital sensitivity");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect
    .poll(async () => (await policy(page)).proposals[0]?.status)
    .toBe("approved");
  expect(
    (await policy(page)).tables.capital_allocation_setting[0].capitalRatioPct,
  ).toBe(12);
  await page.reload();
  await expect(page.locator("body")).toHaveAttribute(
    "data-high-contrast",
    "true",
  );
  await expect(
    page.getByRole("region", { name: "Recent configuration decisions" }),
  ).toContainText("Review illustrative capital allocation");
});

test("invalid rate edits and stale row drafts preserve entered values and prior policy", async ({
  page,
}) => {
  await page.goto("/admin/home-loans/rates/");
  const row = page.locator("#config-home-rate-1101");
  await expect(row).toBeVisible();
  const initial = await policy(page);
  await row.getByLabel("Carded rate", { exact: true }).fill("-2");
  await row.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page
      .getByRole("main")
      .getByRole("alert")
      .filter({ hasText: "Carded rate" }),
  ).toHaveText("Carded rate must be at least 0.");
  await expect(row.getByLabel("Carded rate", { exact: true })).toHaveValue(
    "-2",
  );
  expect((await policy(page)).version).toBe(initial.version);
  await page.reload();
  await expect(row).toBeVisible();
  await row.getByLabel("Carded rate", { exact: true }).fill("7.05");
  const other = await page.context().newPage();
  try {
    await updateRate(other, "home", 6.75);
    await row.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      page
        .getByRole("main")
        .getByRole("alert")
        .filter({ hasText: /changed|Refresh/i }),
    ).toBeVisible();
    await expect(row.getByLabel("Carded rate", { exact: true })).toHaveValue(
      "7.05",
    );
    expect(
      (await policy(page)).tables.product_rate.find((item) => item.id === 1101)
        ?.cardedRate,
    ).toBe(6.75);
  } finally {
    await other.close();
  }
});

test("configuration stays isolated between browser contexts and global reset restores fictional defaults", async ({
  page,
  browser,
}) => {
  await updateCapital(page, 15);
  const currentUrl = page.url();
  const isolated = await browser.newContext();
  try {
    const other = await isolated.newPage();
    await other.goto(currentUrl);
    await expect(
      other.getByLabel("Capital ratio (%)", { exact: true }),
    ).toHaveValue("11.5");
    expect(
      (await policy(other)).tables.capital_allocation_setting[0]
        .capitalRatioPct,
    ).toBe(11.5);
  } finally {
    await isolated.close();
  }
  await page.evaluate(() =>
    localStorage.setItem("unrelated-portfolio-value", "keep"),
  );
  const navigation = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await navigation.isVisible()) await navigation.click();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page
    .getByRole("button", { name: "Reset workspace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Lending pricing", exact: true }),
  ).toBeVisible();
  const reset = await policy(page);
  expect(reset.tables.capital_allocation_setting[0].capitalRatioPct).toBe(11.5);
  expect(await records(page, policyDatabase, "history")).toHaveLength(0);
  expect(await quotes(page, "home")).toHaveLength(3);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("unrelated-portfolio-value"),
    ),
  ).toBe("keep");
});
