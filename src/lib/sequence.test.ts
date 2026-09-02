import { expect, it } from "vitest";
import { COUNTDOWN_STAGES } from "../config/countdown";
import { getPreviewStage, getStageAsset, getStageState } from "./sequence";

it("uses the intended default hourglass progression", () => {
  expect(COUNTDOWN_STAGES.map((stage) => stage.defaultHourglassState)).toEqual([
    "almost-filled",
    "almost-filled",
    "low",
    "low",
    "empty",
    "empty",
    "empty",
  ]);
});

it("applies a quiet per-stage override without changing other stages", () => {
  expect(getStageState(COUNTDOWN_STAGES[2], { "6H": "empty" })).toBe("empty");
  expect(getStageState(COUNTDOWN_STAGES[3], { "6H": "empty" })).toBe("low");
});

it("switches the entire sequence between solid and outline assets", () => {
  expect(
    getStageAsset(COUNTDOWN_STAGES[0], {
      automateSequenceIcons: true,
      hourglassId: "hourglass-low",
      hourglassStyle: "solid",
      stageOverrides: {},
    })?.id,
  ).toBe("hourglass-almost-filled");
  expect(
    getStageAsset(COUNTDOWN_STAGES[0], {
      automateSequenceIcons: true,
      hourglassId: "hourglass-low",
      hourglassStyle: "outline",
      stageOverrides: {},
    })?.id,
  ).toBe("hourglass-almost-filled-outline");
});

it("uses the selected picker asset when sequence automation is off", () => {
  expect(
    getStageAsset(COUNTDOWN_STAGES[0], {
      automateSequenceIcons: false,
      hourglassId: "hourglass-empty-outline",
      hourglassStyle: "solid",
      stageOverrides: {},
    })?.id,
  ).toBe("hourglass-empty-outline");
});

it("matches the editor text to a sequence stage", () => {
  expect(getPreviewStage(" 30m ").id).toBe("30M");
  expect(getPreviewStage("Custom").id).toBe("24H");
});
