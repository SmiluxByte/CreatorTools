import JSZip from "jszip";
import { expect, it } from "vitest";
import { COUNTDOWN_STAGES } from "../config/countdown";
import { createSequenceZip, getStageFilename } from "./export";

it("creates clean stage filenames", () => {
  expect(getStageFilename("24H")).toBe("update-icon-24H.png");
  expect(getStageFilename("NOW!")).toBe("update-icon-NOW.png");
  expect(getStageFilename("")).toBe("update-icon-CUSTOM.png");
});

it("packages all seven stages in a ZIP", async () => {
  const frames = COUNTDOWN_STAGES.map((stage) => ({
    filename: getStageFilename(stage.fileToken),
    blob: new Blob(["test"], { type: "image/png" }),
  }));

  const zipBlob = await createSequenceZip(frames);
  const zip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
  const names = Object.keys(zip.files);

  expect(names).toEqual([
    "update-icon-24H.png",
    "update-icon-12H.png",
    "update-icon-6H.png",
    "update-icon-3H.png",
    "update-icon-1H.png",
    "update-icon-30M.png",
    "update-icon-NOW.png",
  ]);
});
