import { sanitizeFileStem } from "./batchImage";

export type ConvertFormat = "png" | "jpg" | "webp";

export interface BatchConvertOptions {
  format: ConvertFormat;
  quality: number;
  backgroundColor: string;
}

export function getConvertMime(format: ConvertFormat): string {
  if (format === "jpg") {
    return "image/jpeg";
  }
  return `image/${format}`;
}

export function getConvertFilename(fileName: string, format: ConvertFormat): string {
  return `${sanitizeFileStem(fileName)}.${format}`;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function convertImageToBlob(
  image: HTMLImageElement,
  options: BatchConvertOptions,
): Promise<Blob> {
  const width = Math.max(1, image.naturalWidth);
  const height = Math.max(1, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return Promise.reject(new Error("This browser could not create a 2D canvas."));
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  if (options.format === "jpg") {
    context.fillStyle = options.backgroundColor;
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(image, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("The browser could not create the converted image."));
        }
      },
      getConvertMime(options.format),
      options.format === "png" ? undefined : clamp(options.quality, 1, 100) / 100,
    );
  });
}
