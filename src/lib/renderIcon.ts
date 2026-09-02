import { getFontFamily } from "../config/fonts";
import { CANVAS_SIZE } from "../types";
import type { EditorSettings } from "../types";
import { getCoverCrop } from "./image";

export const COMPOSITION_ORDER = ["source", "darken", "hourglass", "text"] as const;

export interface OverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderIconInput {
  sourceImage: HTMLImageElement;
  hourglassImage?: HTMLImageElement;
  settings: EditorSettings;
  textOverride?: string;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getDarkenAlpha(darken: number): number {
  return clamp(darken, 0, 100) / 100;
}

export function getOpacityAlpha(opacity: number): number {
  return clamp(opacity, 0, 100) / 100;
}

export function getTextStrokeWidth(width: number): number {
  return clamp(width, 0, 20);
}

export function getCenteredOverlayRect(
  imageWidth: number,
  imageHeight: number,
  sizePercent: number,
  centerYPercent: number,
): OverlayRect {
  const maximumDimension = CANVAS_SIZE * (clamp(sizePercent, 0, 100) / 100);
  const scale = Math.min(maximumDimension / imageWidth, maximumDimension / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  const centerY = CANVAS_SIZE * (clamp(centerYPercent, 0, 100) / 100);

  return {
    x: (CANVAS_SIZE - width) / 2,
    y: clamp(centerY - height / 2, 0, CANVAS_SIZE - height),
    width,
    height,
  };
}

export function calculateFittedFontSize(
  requestedSize: number,
  maxWidth: number,
  measureText: (fontSize: number) => number,
): number {
  let size = Math.max(1, requestedSize);
  while (size > 12 && measureText(size) > maxWidth) {
    size -= 1;
  }
  return size;
}

function drawText(
  context: CanvasRenderingContext2D,
  settings: EditorSettings,
  text: string,
): void {
  if (!text) {
    return;
  }

  const fontFamily = getFontFamily(settings.fontId);
  const isNow = text.trim().toUpperCase() === "NOW!";
  const requestedSize =
    CANVAS_SIZE * (clamp(settings.textSize, 1, 100) / 100) * (isNow ? 1.08 : 1);
  const fontWeight = 900;
  const fontForSize = (size: number) => fontWeight + " " + size + "px " + fontFamily;
  const fittedSize = calculateFittedFontSize(requestedSize, CANVAS_SIZE - 42, (size) => {
    context.font = fontForSize(size);
    return context.measureText(text).width;
  });

  context.font = fontForSize(fittedSize);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.lineWidth = getTextStrokeWidth(settings.textStrokeWidth);
  context.strokeStyle = "rgba(8, 10, 18, 0.94)";
  context.globalAlpha = getOpacityAlpha(settings.textStrokeOpacity);
  context.shadowColor = "rgba(0, 0, 0, 0.42)";
  context.shadowBlur = 6;
  context.shadowOffsetY = 3;

  const minimumY = fittedSize / 2 + context.lineWidth;
  const maximumY = CANVAS_SIZE - minimumY;
  const textY = clamp(
    CANVAS_SIZE * (clamp(settings.textCenterY, 0, 100) / 100),
    minimumY,
    maximumY,
  );

  context.strokeText(text, CANVAS_SIZE / 2, textY);
  context.shadowColor = "transparent";
  context.fillStyle = "#FFFFFF";
  context.globalAlpha = getOpacityAlpha(settings.textOpacity);
  context.fillText(text, CANVAS_SIZE / 2, textY);
}

export function renderIcon(
  context: CanvasRenderingContext2D,
  { sourceImage, hourglassImage, settings, textOverride }: RenderIconInput,
): void {
  context.save();
  context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  context.fillStyle = "#0B1020";
  context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const crop = getCoverCrop(sourceImage.naturalWidth, sourceImage.naturalHeight);
  context.drawImage(
    sourceImage,
    crop.sourceX,
    crop.sourceY,
    crop.sourceWidth,
    crop.sourceHeight,
    0,
    0,
    CANVAS_SIZE,
    CANVAS_SIZE,
  );

  const darkenAlpha = getDarkenAlpha(settings.darken);
  if (darkenAlpha > 0) {
    context.fillStyle = "rgba(0, 0, 0, " + darkenAlpha + ")";
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  if (hourglassImage && hourglassImage.naturalWidth > 0 && hourglassImage.naturalHeight > 0) {
    const overlay = getCenteredOverlayRect(
      hourglassImage.naturalWidth,
      hourglassImage.naturalHeight,
      settings.hourglassSize,
      settings.hourglassCenterY,
    );
    context.save();
    context.globalAlpha = getOpacityAlpha(settings.hourglassOpacity);
    context.drawImage(hourglassImage, overlay.x, overlay.y, overlay.width, overlay.height);
    context.restore();
  }

  drawText(context, settings, textOverride ?? settings.text);
  context.restore();
}

export function renderToCanvas(
  canvas: HTMLCanvasElement,
  input: RenderIconInput,
): CanvasRenderingContext2D {
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("This browser could not create a 2D canvas.");
  }

  renderIcon(context, input);
  return context;
}
