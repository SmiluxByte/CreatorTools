export const MAX_BATCH_FILE_BYTES = 25 * 1024 * 1024;

export class BatchImageInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BatchImageInputError";
  }
}

export function isSupportedBatchImage(file: File): boolean {
  return (
    ["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    /\.(png|jpe?g|webp)$/i.test(file.name)
  );
}

export interface BatchImageSource {
  fileName: string;
  image: HTMLImageElement;
  url: string;
  width: number;
  height: number;
}

export async function loadBatchImage(file: File): Promise<BatchImageSource> {
  if (!isSupportedBatchImage(file)) {
    throw new BatchImageInputError(`${file.name} is not a PNG, JPG or WebP image.`);
  }
  if (file.size > MAX_BATCH_FILE_BYTES) {
    throw new BatchImageInputError(`${file.name} is larger than 25 MB.`);
  }

  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new BatchImageInputError(`${file.name} could not be read.`));
      image.src = url;
    });
  } catch (error) {
    URL.revokeObjectURL(url);
    if (error instanceof BatchImageInputError) {
      throw error;
    }
    throw new BatchImageInputError(`${file.name} could not be read.`);
  }

  return {
    fileName: file.name,
    image,
    url,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}
