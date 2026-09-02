import type { HourglassAsset } from "../types";

const HOURGLASS_ASSET_BASE = `${import.meta.env.BASE_URL}assets/hourglasses/`;

export const HOURGLASS_ASSETS: HourglassAsset[] = [
  {
    id: "hourglass-low",
    label: "Low",
    src: `${HOURGLASS_ASSET_BASE}hourglass-low.png`,
    state: "low",
    style: "solid",
  },
  {
    id: "hourglass-low-outline",
    label: "Low Outline",
    src: `${HOURGLASS_ASSET_BASE}hourglass-low-outline.png`,
    state: "low",
    style: "outline",
  },
  {
    id: "hourglass-empty",
    label: "Empty",
    src: `${HOURGLASS_ASSET_BASE}hourglass-empty.png`,
    state: "empty",
    style: "solid",
  },
  {
    id: "hourglass-empty-outline",
    label: "Empty Outline",
    src: `${HOURGLASS_ASSET_BASE}hourglass-empty-outline.png`,
    state: "empty",
    style: "outline",
  },
  {
    id: "hourglass-almost-filled",
    label: "Almost Filled",
    src: `${HOURGLASS_ASSET_BASE}hourglass-almost-filled.png`,
    state: "almost-filled",
    style: "solid",
  },
  {
    id: "hourglass-almost-filled-outline",
    label: "Almost Outline",
    src: `${HOURGLASS_ASSET_BASE}hourglass-almost-filled-outline.png`,
    state: "almost-filled",
    style: "outline",
  },
];
