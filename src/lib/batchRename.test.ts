import { expect, it } from "vitest";
import { buildRenamePlan, getRenamedFilename } from "./batchRename";

it("applies name and number tokens while preserving extensions", () => {
  expect(getRenamedFilename("My Icon.PNG", { template: "asset-{n}", startNumber: 4, padding: 3 }, 0)).toBe(
    "asset-004.PNG",
  );
  expect(getRenamedFilename("My Icon.PNG", { template: "{name}-{ext}", startNumber: 1, padding: 2 }, 0)).toBe(
    "My-Icon-PNG.PNG",
  );
});

it("adds a stable suffix when a rename pattern collides", () => {
  expect(buildRenamePlan(["one.txt", "two.txt", "three.txt"], { template: "same", startNumber: 1, padding: 2 })).toEqual([
    { originalName: "one.txt", newName: "same.txt" },
    { originalName: "two.txt", newName: "same-2.txt" },
    { originalName: "three.txt", newName: "same-3.txt" },
  ]);
});
