import { expect, test } from "@playwright/test";

test.describe("схема на главной", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("при открытии построена схема примера", async ({ page }) => {
    const chart = page.getByRole("figure", { name: "Блок-схема" });
    await expect(chart.getByText("Начало", { exact: true })).toBeVisible();
    await expect(chart.getByText("Конец", { exact: true })).toBeVisible();
    await expect(chart.getByText("да", { exact: true }).first()).toBeVisible();
    await expect(chart.getByText("нет", { exact: true }).first()).toBeVisible();
  });

  test("без двоеточия схема устарела и есть сообщение со строкой; с двоеточием — снова обычная", async ({
    page,
  }) => {
    const code = page.getByRole("textbox", { name: "Код программы" });
    const chart = page.getByRole("figure", { name: "Блок-схема" });
    await expect(chart.getByText("Начало", { exact: true })).toBeVisible();
    const sample = await code.inputValue();

    await code.fill(sample.replace("while i <= n:", "while i <= n"));
    await expect(chart.getByText("схема устарела")).toBeVisible();
    await expect(page.getByRole("list", { name: "Ошибки" })).toContainText(
      "Строка 4: не хватает «:»",
    );
    await expect(chart.getByText("Начало", { exact: true })).toBeVisible();

    await code.fill(sample);
    await expect(chart.getByText("схема устарела")).toBeHidden();
    await expect(page.getByRole("list", { name: "Ошибки" })).toBeHidden();
  });

  test("HTML в коде виден текстом и не исполняется", async ({ page }) => {
    const dialogs: string[] = [];
    page.on("dialog", (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });
    const chart = page.getByRole("figure", { name: "Блок-схема" });
    await expect(chart.getByText("Начало", { exact: true })).toBeVisible();

    await page
      .getByRole("textbox", { name: "Код программы" })
      .fill('print("<img src=x onerror=alert(1)>")');
    await expect(chart).toContainText("onerror=alert(1)>");
    await expect(chart.locator("img")).toHaveCount(0);
    expect(dialogs).toEqual([]);
  });
});
