import { HOURGLASS_ASSETS } from "../config/assets";
import { COUNTDOWN_STAGES } from "../config/countdown";
import type {
  CountdownStage,
  EditorSettings,
  HourglassAsset,
  HourglassState,
  HourglassStyle,
  StageOverrides,
} from "../types";

export const HOURGLASS_STATE_OPTIONS: { value: HourglassState; label: string }[] = [
  { value: "almost-filled", label: "Almost Filled" },
  { value: "low", label: "Low" },
  { value: "empty", label: "Empty" },
];

export function getStageState(
  stage: CountdownStage,
  overrides: StageOverrides,
): HourglassState {
  return overrides[stage.id] ?? stage.defaultHourglassState;
}

export function getHourglassAsset(
  style: HourglassStyle,
  state: HourglassState,
): HourglassAsset | undefined {
  return HOURGLASS_ASSETS.find((asset) => asset.style === style && asset.state === state);
}

export function getStageAsset(
  stage: CountdownStage,
  settings: Pick<
    EditorSettings,
    "automateSequenceIcons" | "hourglassId" | "hourglassStyle" | "stageOverrides"
  >,
): HourglassAsset | undefined {
  if (!settings.automateSequenceIcons) {
    return HOURGLASS_ASSETS.find((asset) => asset.id === settings.hourglassId);
  }
  return getHourglassAsset(
    settings.hourglassStyle,
    getStageState(stage, settings.stageOverrides),
  );
}

export function getPreviewStage(text: string): CountdownStage {
  const normalizedText = text.trim().toUpperCase();
  return (
    COUNTDOWN_STAGES.find((stage) => stage.label === normalizedText) ?? COUNTDOWN_STAGES[0]
  );
}
