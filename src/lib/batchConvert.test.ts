import { expect, it } from "vitest";
import { getConvertFilename, getConvertMime } from "./batchConvert";

it("maps formats to browser MIME types", () => {
  expect(getConvertMime("png")).toBe("image/png");
  expect(getConvertMime("jpg")).toBe("image/jpeg");
  expect(getConvertMime("webp")).toBe("image/webp");
});

it("creates safe converted filenames", () => {
  expect(getConvertFilename("My Cool Icon.PNG", "webp")).toBe("My-Cool-Icon.webp");
});
