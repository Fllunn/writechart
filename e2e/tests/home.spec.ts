import { expect, test } from "@playwright/test";

test("главная показывает заголовок", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Writechart" })).toBeVisible();
});
