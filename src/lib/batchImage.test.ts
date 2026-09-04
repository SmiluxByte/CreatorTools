import { expect, it } from "vitest";
import {
  getBatchFilename,
  getImagePlacement,
  getStrokeOffsets,
  sanitizeFileStem,
} from "./batchImage";

it("fits a wide image inside a square without cropping", () => {
  expect(getImagePlacement(1600, 900, 256, 256, "contain")).toEqual({
    x: 0,
    y: 56,
    width: 256,
    height: 144,
  });
});

it("covers a square canvas with a wide image", () => {
  expect(getImagePlacement(1600, 900, 256, 256, "cover")).toEqual({
    x: -99.55555555555554,
    y: 0,
    width: 455.1111111111111,
    height: 256,
  });
});

it("creates safe filenames for batch exports", () => {
  expect(sanitizeFileStem("  My Cool Icon!!.PNG ")).toBe("My-Cool-Icon");
  expect(getBatchFilename("My Cool Icon.png", "resize", 256, 256)).toBe(
    "My-Cool-Icon-256x256.png",
  );
  expect(getBatchFilename("My Cool Icon.png", "stroke")).toBe("My-Cool-Icon-stroke.png");
  expect(getBatchFilename("My Cool Icon.png", "stroke", 256, 256, true)).toBe(
    "My-Cool-Icon-256x256-stroke.png",
  );
});

it("builds a circular set of stroke offsets", () => {
  const offsets = getStrokeOffsets(2);
  expect(offsets).toContainEqual({ x: 0, y: 0 });
  expect(offsets).not.toContainEqual({ x: 2, y: 2 });
});
