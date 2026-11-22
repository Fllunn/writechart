import { describe, expect, test } from "vitest";
import { flowchart } from "./flowchart.ts";
import { labExamples, scenarioExamples } from "./test-support/examples.ts";
import { parsePython } from "./test-support/parse-python.ts";

// Эталонные SVG: разница видна в PR, человек принимает её глазами.
// Обновить после намеренной правки раскладки: yarn workspace @writechart/core test -u
describe("эталонные SVG", () => {
  test.each(Object.entries({ ...scenarioExamples, ...labExamples }))("%s", async (name, code) => {
    const result = flowchart(await parsePython(code));
    expect(result.errors).toEqual([]);
    await expect(`${result.svg ?? ""}\n`).toMatchFileSnapshot(`./__snapshots__/${name}.svg`);
  });
});
