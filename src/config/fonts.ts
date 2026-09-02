import type { FontId, FontOption } from "../types";

export const FONT_OPTIONS: FontOption[] = [
  { id: "arial-black", label: "Arial Black", family: "Arial Black, Arial, sans-serif" },
  { id: "fredoka", label: "Fredoka", family: "Fredoka, Arial, sans-serif" },
  { id: "luckiest-guy", label: "Luckiest Guy", family: "Luckiest Guy, Impact, sans-serif" },
  { id: "bangers", label: "Bangers", family: "Bangers, Impact, sans-serif" },
  { id: "baloo-2", label: "Baloo 2", family: "Baloo 2, Arial, sans-serif" },
  { id: "russo-one", label: "Russo One", family: "Russo One, Arial, sans-serif" },
  { id: "press-start-2p", label: "Press Start 2P", family: "Press Start 2P, monospace" },
  { id: "anton", label: "Anton", family: "Anton, Impact, sans-serif" },
  {
    id: "permanent-marker",
    label: "Permanent Marker",
    family: "Permanent Marker, Comic Sans MS, cursive",
  },
];

export function getFontFamily(fontId: FontId): string {
  return FONT_OPTIONS.find((font) => font.id === fontId)?.family ?? FONT_OPTIONS[0].family;
}
