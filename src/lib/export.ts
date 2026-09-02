import JSZip from "jszip";
import type { EditorSettings, SequenceFrame } from "../types";
import { renderToCanvas } from "./renderIcon";

export async function renderIconToPng(
  sourceImage: HTMLImageElement,
  hourglassImage: HTMLImageElement,
  settings: EditorSettings,
  textOverride?: string,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  renderToCanvas(canvas, {
    sourceImage,
    hourglassImage,
    settings,
    textOverride,
  });

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

export function getStageFilename(label: string): string {
  const token = label.toUpperCase().replace(/[^A-Z0-9]+/g, "") || "CUSTOM";
  return "update-icon-" + token + ".png";
}

export async function createSequenceZip(
  frames: Pick<SequenceFrame, "filename" | "blob">[],
): Promise<Blob> {
  if (frames.length === 0) {
    throw new Error("There are no rendered frames to package.");
  }

  const zip = new JSZip();
  for (const frame of frames) {
    zip.file(frame.filename, await frame.blob.arrayBuffer());
  }

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
