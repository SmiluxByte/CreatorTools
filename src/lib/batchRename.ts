export interface RenamePlanOptions {
  template: string;
  startNumber: number;
  padding: number;
}

export interface RenamePlanItem {
  originalName: string;
  newName: string;
}

function cleanFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "") || "file";
}

function getFileParts(fileName: string): { stem: string; extension: string } {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) {
    return { stem: fileName, extension: "" };
  }

  return {
    stem: fileName.slice(0, dotIndex),
    extension: fileName.slice(dotIndex),
  };
}

export function getRenamedFilename(
  fileName: string,
  options: RenamePlanOptions,
  index: number,
): string {
  const { stem, extension } = getFileParts(fileName);
  const template = options.template.trim() || "{name}-{n}";
  const number = String(
    Math.max(0, Math.round(options.startNumber)) + index,
  ).padStart(Math.max(1, Math.round(options.padding)), "0");
  const rawName = template.replace(/\{(name|n|ext)\}/gi, (_match, token: string) => {
    if (token.toLowerCase() === "name") {
      return stem;
    }
    if (token.toLowerCase() === "ext") {
      return extension.replace(/^\./, "");
    }
    return number;
  });

  return cleanFilenamePart(rawName) + extension;
}

function addCollisionSuffix(fileName: string, count: number): string {
  const { stem, extension } = getFileParts(fileName);
  return `${stem}-${count}${extension}`;
}

export function buildRenamePlan(
  fileNames: string[],
  options: RenamePlanOptions,
): RenamePlanItem[] {
  const usedNames = new Set<string>();

  return fileNames.map((originalName, index) => {
    const requestedName = getRenamedFilename(originalName, options, index);
    let newName = requestedName;
    let collisionCount = 2;

    while (usedNames.has(newName.toLowerCase())) {
      newName = addCollisionSuffix(requestedName, collisionCount);
      collisionCount += 1;
    }

    usedNames.add(newName.toLowerCase());
    return { originalName, newName };
  });
}
