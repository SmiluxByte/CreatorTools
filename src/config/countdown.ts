import type { CountdownStage } from "../types";

export const COUNTDOWN_STAGES: CountdownStage[] = [
  { id: "24H", label: "24H", fileToken: "24H", defaultHourglassState: "almost-filled" },
  { id: "12H", label: "12H", fileToken: "12H", defaultHourglassState: "almost-filled" },
  { id: "6H", label: "6H", fileToken: "6H", defaultHourglassState: "low" },
  { id: "3H", label: "3H", fileToken: "3H", defaultHourglassState: "low" },
  { id: "1H", label: "1H", fileToken: "1H", defaultHourglassState: "empty" },
  { id: "30M", label: "30M", fileToken: "30M", defaultHourglassState: "empty" },
  { id: "NOW", label: "NOW!", fileToken: "NOW", defaultHourglassState: "empty" },
];
