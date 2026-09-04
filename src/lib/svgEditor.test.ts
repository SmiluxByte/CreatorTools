import { expect, it } from "vitest";
import { applySvgColorReplacements, getSvgColorValues, svgColorToHex } from "./svgEditor";

it("finds direct SVG colors without listing none or currentColor", () => {
  expect(getSvgColorValues('<svg fill="#fff"><path stroke="#111" fill="none"/><circle style="fill: rgb(1, 2, 3)"/></svg>')).toEqual([
    "#fff",
    "#111",
    "rgb(1, 2, 3)",
  ]);
});

it("applies multiple color changes without swapping replacements", () => {
  const markup = '<svg><path fill="#fff" stroke="#000"/></svg>';
  expect(applySvgColorReplacements(markup, { "#fff": "#000", "#000": "#fff" })).toBe(
    '<svg><path fill="#000" stroke="#fff"/></svg>',
  );
});

it("converts common SVG color values for color inputs", () => {
  expect(svgColorToHex("#abc")).toBe("#aabbcc");
  expect(svgColorToHex("rgb(12, 34, 56)")).toBe("#0c2238");
  expect(svgColorToHex("white")).toBe("#ffffff");
});
