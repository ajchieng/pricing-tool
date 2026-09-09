import { expect, test } from "@playwright/test";

test("keyboard users can search parameters and navigate the workspace", async ({
  page,
}, testInfo) => {
  await page.goto("/home-loans/new/");
  await page
    .getByRole("button", { name: "Load sample scenario", exact: true })
    .click();
  const finder = page.getByRole("button", { name: /Find parameter/ });
  await finder.focus();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Find a quote parameter" });
  await expect(dialog).toBeVisible();
  const search = dialog.getByRole("combobox", {
    name: "Search inputs and results",
  });
  await expect(search).toBeFocused();
  await search.fill("Loan amount");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("textbox", { name: "Loan amount", exact: false }),
  ).toBeFocused();
  await finder.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(finder).toBeFocused();

  if (testInfo.project.name === "mobile") {
    const menu = page.getByRole("button", { name: "Open navigation" });
    await menu.focus();
    await page.keyboard.press("Enter");
    const navigation = page.getByRole("dialog", {
      name: "Navigation",
      exact: true,
    });
    await expect(
      navigation.getByRole("button", { name: "Close navigation" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(navigation).toBeHidden();
    await expect(menu).toBeFocused();
  }
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});
