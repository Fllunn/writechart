import { render, screen } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { expect, test } from "vitest";
import { routes } from "@/routes";

test("главная страница показывает заголовок", () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });

  render(<RouterProvider router={router} />);

  expect(screen.getByRole("heading", { level: 1, name: "Writechart" })).toBeInTheDocument();
});
