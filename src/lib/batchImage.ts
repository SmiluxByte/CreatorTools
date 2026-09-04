export type BatchFitMode = "contain" | "cover" | "stretch";

export const BATCH_PREVIEW_MAX_EDGE = 320;

export interface ImagePlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StrokeOffset {
  x: number;
  y: number;
}

export interface BatchRenderOptions {
  width: number;
  height: number;
  fit: BatchFitMode;
  operation: "resize" | "stroke";
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getImagePlacement(
  sourceWidth: number,
  sourceHeight: number,
  destinationWidth: number,
  destinationHeight: number,
  fit: BatchFitMode,
): ImagePlacement {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    !Number.isFinite(destinationWidth) ||
    !Number.isFinite(destinationHeight) ||
    destinationWidth <= 0 ||
    destinationHeight <= 0
  ) {
    throw new Error("Image dimensions must be positive.");
  }

  if (fit === "stretch") {
    return { x: 0, y: 0, width: destinationWidth, height: destinationHeight };
  }

  const scale =
    fit === "cover"
      ? Math.max(destinationWidth / sourceWidth, destinationHeight / sourceHeight)
      : Math.min(destinationWidth / sourceWidth, destinationHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    x: (destinationWidth - width) / 2,
    y: (destinationHeight - height) / 2,
    width,
    height,
  };
}

export function sanitizeFileStem(fileName: string): string {
  const withoutExtension = fileName.trim().replace(/\.[^/.]+$/, "");
  const cleaned = withoutExtension
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
  return cleaned || "image";
}

export function getBatchFilename(
  fileName: string,
  operation: "resize" | "stroke",
  width?: number,
  height?: number,
  resizeBeforeStroke = false,
): string {
  const stem = sanitizeFileStem(fileName);
  if (operation === "resize" || resizeBeforeStroke) {
    return `${stem}-${Math.round(width ?? 0)}x${Math.round(height ?? 0)}${
      operation === "stroke" ? "-stroke" : ""
    }.png`;
  }
  return `${stem}-stroke.png`;
}

export function getStrokeOffsets(width: number): StrokeOffset[] {
  const radius = Math.ceil(clamp(width, 0, 64));
  if (radius === 0) {
    return [{ x: 0, y: 0 }];
  }

  const offsets: StrokeOffset[] = [];
  const radiusSquared = (radius + 0.35) ** 2;
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      if (x * x + y * y <= radiusSquared) {
        offsets.push({ x, y });
      }
    }
  }
  return offsets;
}

export function getPreviewRenderOptions(
  options: BatchRenderOptions,
  maxEdge = BATCH_PREVIEW_MAX_EDGE,
): BatchRenderOptions {
  const previewEdge = Number.isFinite(maxEdge) && maxEdge > 0 ? Math.round(maxEdge) : BATCH_PREVIEW_MAX_EDGE;
  const largestEdge = Math.max(options.width, options.height);
  const scale = largestEdge > previewEdge ? previewEdge / largestEdge : 1;

  return {
    ...options,
    width: Math.max(1, Math.round(options.width * scale)),
    height: Math.max(1, Math.round(options.height * scale)),
    strokeWidth:
      options.operation === "stroke"
        ? Math.min(20, Math.max(0, options.strokeWidth * scale))
        : options.strokeWidth,
  };
}

function parseColor(value: string): [number, number, number] {
  const hex = value.trim().replace(/^#/, "");
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((character) => character + character)
          .join("")
      : hex;
  if (/^[0-9a-f]{6}$/i.test(normalized)) {
    return [
      Number.parseInt(normalized.slice(0, 2), 16),
      Number.parseInt(normalized.slice(2, 4), 16),
      Number.parseInt(normalized.slice(4, 6), 16),
    ];
  }
  return [255, 255, 255];
}

function drawImageWithFit(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  destinationWidth: number,
  destinationHeight: number,
  fit: BatchFitMode,
): void {
  const placement = getImagePlacement(
    sourceWidth,
    sourceHeight,
    destinationWidth,
    destinationHeight,
    fit,
  );
  context.drawImage(image, placement.x, placement.y, placement.width, placement.height);
}

function drawAlphaStroke(
  context: CanvasRenderingContext2D,
  baseCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  strokeWidth: number,
  color: [number, number, number],
  opacity: number,
): void {
  const baseContext = baseCanvas.getContext("2d");
  if (!baseContext) {
    throw new Error("This browser could not create a 2D canvas.");
  }

  const baseData = baseContext.getImageData(0, 0, width, height).data;
  const distance = new Float32Array(width * height);
  const infinity = width + height + 1;
  const diagonal = Math.SQRT2;

  for (let index = 0; index < distance.length; index += 1) {
    distance[index] = baseData[index * 4 + 3] > 0 ? 0 : infinity;
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      let nearest = distance[index];
      if (x > 0) nearest = Math.min(nearest, distance[index - 1] + 1);
      if (y > 0) nearest = Math.min(nearest, distance[index - width] + 1);
      if (x > 0 && y > 0) nearest = Math.min(nearest, distance[index - width - 1] + diagonal);
      if (x < width - 1 && y > 0) nearest = Math.min(nearest, distance[index - width + 1] + diagonal);
      distance[index] = nearest;
    }
  }

  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const index = y * width + x;
      let nearest = distance[index];
      if (x < width - 1) nearest = Math.min(nearest, distance[index + 1] + 1);
      if (y < height - 1) nearest = Math.min(nearest, distance[index + width] + 1);
      if (x < width - 1 && y < height - 1) nearest = Math.min(nearest, distance[index + width + 1] + diagonal);
      if (x > 0 && y < height - 1) nearest = Math.min(nearest, distance[index + width - 1] + diagonal);
      distance[index] = nearest;
    }
  }

  const strokeData = context.createImageData(width, height);
  const [red, green, blue] = color;
  const alphaScale = clamp(opacity, 0, 100) / 100;
  for (let index = 0; index < distance.length; index += 1) {
    const edgeAlpha = clamp(strokeWidth + 0.75 - distance[index], 0, 1) * alphaScale;
    if (edgeAlpha === 0) continue;

    const dataIndex = index * 4;
    strokeData.data[dataIndex] = red;
    strokeData.data[dataIndex + 1] = green;
    strokeData.data[dataIndex + 2] = blue;
    strokeData.data[dataIndex + 3] = Math.round(edgeAlpha * 255);
  }
  context.putImageData(strokeData, 0, 0);
}

export function renderBatchImage(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  options: BatchRenderOptions,
): void {
  const width = Math.max(1, Math.round(options.width));
  const height = Math.max(1, Math.round(options.height));
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("This browser could not create a 2D canvas.");
  }

  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = width;
  baseCanvas.height = height;
  const baseContext = baseCanvas.getContext("2d");
  if (!baseContext) {
    throw new Error("This browser could not create a 2D canvas.");
  }
  baseContext.imageSmoothingEnabled = true;
  baseContext.imageSmoothingQuality = "high";
  drawImageWithFit(
    baseContext,
    image,
    image.naturalWidth,
    image.naturalHeight,
    width,
    height,
    options.fit,
  );

  const strokeWidth = clamp(options.strokeWidth, 0, 64);
  if (options.operation !== "stroke" || strokeWidth === 0) {
    context.drawImage(baseCanvas, 0, 0);
    return;
  }

  const strokeCanvas = document.createElement("canvas");
  strokeCanvas.width = width;
  strokeCanvas.height = height;
  const strokeContext = strokeCanvas.getContext("2d");
  if (!strokeContext) {
    throw new Error("This browser could not create a 2D canvas.");
  }

  drawAlphaStroke(
    strokeContext,
    baseCanvas,
    width,
    height,
    strokeWidth,
    parseColor(options.strokeColor),
    options.strokeOpacity,
  );

  context.drawImage(strokeCanvas, 0, 0);
  context.drawImage(baseCanvas, 0, 0);
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("The browser could not create a PNG."));
      }
    }, "image/png");
  });
}

export async function renderBatchImagePreviewToPng(
  image: HTMLImageElement,
  options: BatchRenderOptions,
  maxEdge = BATCH_PREVIEW_MAX_EDGE,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  renderBatchImage(canvas, image, getPreviewRenderOptions(options, maxEdge));
  return canvasToPng(canvas);
}

export async function renderBatchImageToPng(
  image: HTMLImageElement,
  options: BatchRenderOptions,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  renderBatchImage(canvas, image, options);
  return canvasToPng(canvas);
}
