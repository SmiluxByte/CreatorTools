export const CANVAS_SIZE = 512;

export type FontId =
  | "arial-black"
  | "montserrat"
  | "fredoka"
  | "luckiest-guy"
  | "bangers"
  | "baloo-2"
  | "russo-one"
  | "press-start-2p"
  | "anton"
  | "permanent-marker"
  | "comic-neue";

export interface FontOption {
  id: FontId;
  label: string;
  family: string;
}

export interface HourglassAsset {
  id: string;
  label: string;
  src: string;
  state: HourglassState;
  style: HourglassStyle;
}

export type HourglassStyle = "solid" | "outline";
export type HourglassState = "almost-filled" | "low" | "empty";
export type CountdownStageId = "24H" | "12H" | "6H" | "3H" | "1H" | "30M" | "NOW";
export type StageOverrides = Partial<Record<CountdownStageId, HourglassState>>;

export interface EditorSettings {
  text: string;
  fontId: FontId;
  hourglassId: string;
  automateSequenceIcons: boolean;
  hourglassStyle: HourglassStyle;
  stageOverrides: StageOverrides;
  hourglassSize: number;
  hourglassCenterY: number;
  hourglassOpacity: number;
  textSize: number;
  textCenterY: number;
  textOpacity: number;
  textStrokeWidth: number;
  textStrokeOpacity: number;
  darken: number;
}

export interface LoadedSource {
  fileName: string;
  image: HTMLImageElement;
  url: string;
  width: number;
  height: number;
}

export interface CountdownStage {
  id: CountdownStageId;
  label: string;
  fileToken: string;
  defaultHourglassState: HourglassState;
}

export interface SequenceFrame {
  label: string;
  filename: string;
  blob: Blob;
  url: string;
}

export type AssetStatus = "loading" | "ready" | "missing";

export interface SavedPreset {
  id: string;
  name: string;
  settings: EditorSettings;
}
