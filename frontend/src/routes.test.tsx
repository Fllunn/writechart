import { render, screen } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { expect, test, vi } from "vitest";
import { routes } from "@/routes";

// В jsdom нет Web Worker: схема здесь не строится, проверяется только страница.
class FakeWorker {
  onmessage = null;
  onerror = null;
  postMessage() {}
  terminate() {}
}
vi.stubGlobal("Worker", FakeWorker);

test("главная страница показывает заголовок, поле кода и выбор языка", () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });

  render(<RouterProvider router={router} />);

  expect(screen.getByRole("heading", { level: 1, name: "Writechart" })).toBeInTheDocument();
  expect(
    screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Код программы" }).value,
  ).toContain("while i <= n:");
  const language = screen.getByRole("combobox", { name: "Язык" });
  expect(language).toHaveValue("python");
  expect([...language.querySelectorAll("option")].map((option) => option.textContent)).toEqual([
    "Python",
  ]);
});
