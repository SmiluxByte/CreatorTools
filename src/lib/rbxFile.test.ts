import { expect, it } from "vitest";
import {
  buildLlmBundle,
  buildTreeText,
  getLineCount,
  getSafeFileStem,
  getSafePath,
  type RbxProject,
} from "./rbxFile";

const project: RbxProject = {
  fileName: "My Place.rbxlx",
  format: ".rbxlx",
  instanceCount: 4,
  containerCount: 2,
  roots: [
    {
      name: "ServerScriptService",
      className: "ServerScriptService",
      path: "ServerScriptService",
      children: [
        {
          name: "Main",
          className: "Script",
          path: "ServerScriptService/Main",
          scriptId: "script-1",
          children: [],
        },
      ],
    },
  ],
  scripts: [
    {
      id: "script-1",
      name: "Main",
      className: "Script",
      path: "ServerScriptService/Main",
      source: "print('hello')",
      sourceAvailable: true,
      lineCount: 1,
      runContext: "Legacy",
    },
  ],
};

it("counts source lines and sanitizes export paths", () => {
  expect(getLineCount("one\ntwo\nthree")).toBe(3);
  expect(getLineCount("")).toBe(0);
  expect(getSafeFileStem(" My Place!!.rbxlx ")).toBe("My-Place");
  expect(getSafePath("ServerScriptService/Main:server")).toBe("ServerScriptService/Main_server");
});

it("keeps the hierarchy and class in the tree export", () => {
  const tree = buildTreeText(project);
  expect(tree).toContain("+ ServerScriptService [ServerScriptService]");
  expect(tree).toContain("* Main [Script]");
});

it("creates a compact LLM bundle with file boundaries", () => {
  const bundle = buildLlmBundle(project);
  expect(bundle).toContain("--- FILE: ServerScriptService/Main");
  expect(bundle).toContain("--- CLASS: Script");
  expect(bundle).toContain("print('hello')");
  expect(bundle).toContain("--- END FILE");
  expect(bundle).toContain("No code was executed");
});
