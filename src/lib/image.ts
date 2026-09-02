import type { LoadedSource } from "../types";

export const MAX_SOURCE_FILE_BYTES = 25 * 1024 * 1024;

export class ImageInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageInputError";
  }
}

export function isSupportedImage(file: File): boolean {
  const typeIsSupported = file.type === "image/png" || file.type === "image/jpeg";
  const nameIsSupported = /\.(png|jpe?g)$/i.test(file.name);
  return typeIsSupported || nameIsSupported;
}

export function validateImageFile(file: File): void {
  if (!isSupportedImage(file)) {
    throw new ImageInputError("Please choose a PNG or JPG image.");
  }

  if (file.size > MAX_SOURCE_FILE_BYTES) {
    throw new ImageInputError("That image is larger than 25 MB. Resize it and try again.");
  }
}

export interface CoverCrop {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
}

export function getCoverCrop(
  sourceWidth: number,
  sourceHeight: number,
  destinationWidth = 512,
  destinationHeight = 512,
): CoverCrop {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    throw new Error("Source dimensions must be positive.");
  }

  const sourceRatio = sourceWidth / sourceHeight;
  const destinationRatio = destinationWidth / destinationHeight;

  if (sourceRatio > destinationRatio) {
    const sourceCropWidth = sourceHeight * destinationRatio;
    return {
      sourceX: (sourceWidth - sourceCropWidth) / 2,
      sourceY: 0,
      sourceWidth: sourceCropWidth,
      sourceHeight,
    };
  }

  const sourceCropHeight = sourceWidth / destinationRatio;
  return {
    sourceX: 0,
    sourceY: (sourceHeight - sourceCropHeight) / 2,
    sourceWidth,
    sourceHeight: sourceCropHeight,
  };
}

export async function loadImageFile(file: File): Promise<LoadedSource> {
  validateImageFile(file);

  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new ImageInputError("That image could not be read."));
      image.src = url;
    });
  } catch (error) {
    URL.revokeObjectURL(url);
    if (error instanceof ImageInputError) {
      throw error;
    }
    throw new ImageInputError("That image could not be read.");
  }

  return {
    fileName: file.name,
    image,
    url,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}
