import JSZip from "jszip";
import {
  buildLlmBundle,
  buildTreeText,
  getSafeFileStem,
  getSafePath,
  type RbxProject,
} from "./rbxFile";

export async function createRbxSourceZip(project: RbxProject): Promise<Blob> {
  const zip = new JSZip();
  const stem = getSafeFileStem(project.fileName);
  const root = zip.folder(stem);

  if (!root) {
    throw new Error("The source ZIP could not be created.");
  }

  const usedPaths = new Map<string, number>();
  for (const script of project.scripts) {
    const basePath = `scripts/${getSafePath(script.path)}.lua`;
    const previousCount = usedPaths.get(basePath) ?? 0;
    usedPaths.set(basePath, previousCount + 1);
    const uniquePath = previousCount === 0
      ? basePath
      : basePath.replace(/\.lua$/, `-${previousCount + 1}.lua`);
    root.file(uniquePath, getExportSource(script));
  }

  root.file("tree.txt", buildTreeText(project));
  root.file("llm-context.txt", buildLlmBundle(project));
  root.file(
    "manifest.json",
    JSON.stringify(
      {
        sourceFile: project.fileName,
        format: project.format,
        scripts: project.scripts.map((script) => ({
          path: script.path,
          className: script.className,
          lineCount: script.lineCount,
          sourceAvailable: script.sourceAvailable,
        })),
      },
      null,
      2,
    ),
  );

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

function getExportSource(script: RbxProject["scripts"][number]): string {
  if (!script.sourceAvailable) {
    return "-- Source is unavailable in this saved file.\n";
  }
  return script.source.endsWith("\n") ? script.source : script.source + "\n";
}
