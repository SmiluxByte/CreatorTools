import { expect, it } from "vitest";
import { getCoverCrop, MAX_SOURCE_FILE_BYTES } from "./image";

it("crops the sides of a wide image", () => {
  expect(getCoverCrop(1024, 512)).toEqual({
    sourceX: 256,
    sourceY: 0,
    sourceWidth: 512,
    sourceHeight: 512,
  });
});

it("crops the top and bottom of a tall image", () => {
  expect(getCoverCrop(512, 1024)).toEqual({
    sourceX: 0,
    sourceY: 256,
    sourceWidth: 512,
    sourceHeight: 512,
  });
});

it("keeps a square image unchanged", () => {
  expect(getCoverCrop(512, 512)).toEqual({
    sourceX: 0,
    sourceY: 0,
    sourceWidth: 512,
    sourceHeight: 512,
  });
});

it("uses a 25 MB source limit", () => {
  expect(MAX_SOURCE_FILE_BYTES).toBe(25 * 1024 * 1024);
});
