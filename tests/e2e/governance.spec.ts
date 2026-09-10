import { expect, test } from "@playwright/test";

test("scheduled policy changes can be cancelled with a recorded reason", async ({
  page,
}) => {
  await page.goto("/admin/global-assumptions/");
  await page.getByLabel("Capital ratio (%)", { exact: true }).fill("13");
  await page
    .getByLabel("Change reason", { exact: true })
    .fill("Fictional future capital scenario");
  await page
    .getByLabel("Effective from (optional, local time)", { exact: true })
    .fill("2099-01-01T12:00");
  await page
    .getByRole("button", { name: "Propose capital ratio", exact: true })
    .click();
  await expect(page.getByRole("main")).toContainText(
    "Scheduled in this browser",
  );
  await page.goto("/admin/governance/");
  const scheduled = page.getByRole("region", {
    name: "Scheduled configuration changes",
    exact: true,
  });
  await expect(
    scheduled.getByRole("button", {
      name: "Cancel scheduled change",
      exact: true,
    }),
  ).toBeVisible();
  await scheduled
    .getByLabel("Cancellation reason", { exact: true })
    .fill("The future demonstration scenario is no longer needed.");
  await scheduled
    .getByRole("button", { name: "Cancel scheduled change", exact: true })
    .click();
  await expect(scheduled).toContainText("No scheduled configuration changes.");
  const decisions = page.getByRole("region", {
    name: "Recent configuration decisions",
    exact: true,
  });
  await expect(decisions).toContainText(
    "The future demonstration scenario is no longer needed.",
  );
  await expect(decisions).toContainText("rejected");
  await page.goto("/admin/global-assumptions/");
  await expect(
    page.getByLabel("Capital ratio (%)", { exact: true }),
  ).toHaveValue("11.5");
});
