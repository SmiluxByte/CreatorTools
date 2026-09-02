import { expect, it } from "vitest";
import { COUNTDOWN_STAGES } from "../config/countdown";
import {
  calculateFittedFontSize,
  COMPOSITION_ORDER,
  getCenteredOverlayRect,
  getDarkenAlpha,
  getOpacityAlpha,
  getTextStrokeWidth,
} from "./renderIcon";

it("keeps the composition order safe for bright overlays", () => {
  expect(COMPOSITION_ORDER).toEqual(["source", "darken", "hourglass", "text"]);
});

it("clamps the darkening slider to an alpha value", () => {
  expect(getDarkenAlpha(-10)).toBe(0);
  expect(getDarkenAlpha(50)).toBe(0.5);
  expect(getDarkenAlpha(140)).toBe(1);
});

it("clamps overlay opacity independently from image darkening", () => {
  expect(getOpacityAlpha(-20)).toBe(0);
  expect(getOpacityAlpha(65)).toBe(0.65);
  expect(getOpacityAlpha(120)).toBe(1);
});

it("keeps the text outline width in a usable pixel range", () => {
  expect(getTextStrokeWidth(-4)).toBe(0);
  expect(getTextStrokeWidth(6)).toBe(6);
  expect(getTextStrokeWidth(40)).toBe(20);
});

it("centers and bounds the hourglass rectangle", () => {
  expect(getCenteredOverlayRect(128, 128, 50, 36)).toMatchObject({
    x: 128,
    width: 256,
    height: 256,
  });
  expect(getCenteredOverlayRect(128, 128, 50, 36).y).toBeCloseTo(56.32);
});

it("reduces a text size until it fits", () => {
  const fitted = calculateFittedFontSize(100, 200, (size) => size * 3);
  expect(fitted).toBe(66);
});

it("keeps the countdown stages editable and ordered", () => {
  expect(COUNTDOWN_STAGES.map((stage) => stage.label)).toEqual([
    "24H",
    "12H",
    "6H",
    "3H",
    "1H",
    "30M",
    "NOW!",
  ]);
});
