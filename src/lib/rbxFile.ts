export const MAX_RBX_XML_BYTES = 150 * 1024 * 1024;

export const SUPPORTED_RBX_XML_EXTENSIONS = [".rbxlx", ".rbxmx"] as const;

export type RbxScriptClass = "Script" | "LocalScript" | "ModuleScript";

export interface RbxTreeNode {
  name: string;
  className: string;
  path: string;
  scriptId?: string;
  children: RbxTreeNode[];
}

export interface RbxScript {
  id: string;
  name: string;
  className: RbxScriptClass;
  path: string;
  source: string;
  sourceAvailable: boolean;
  lineCount: number;
  runContext?: string;
}

export interface RbxProject {
  fileName: string;
  format: ".rbxlx" | ".rbxmx";
  roots: RbxTreeNode[];
  scripts: RbxScript[];
  instanceCount: number;
  containerCount: number;
}

export class RbxFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RbxFileError";
  }
}

export function isSupportedRbxXmlFile(file: File): boolean {
  return SUPPORTED_RBX_XML_EXTENSIONS.some((extension) =>
    file.name.toLowerCase().endsWith(extension),
  );
}

export function getLineCount(source: string): number {
  if (!source) {
    return 0;
  }
  return source.split(/\r\n|\r|\n/).length;
}

function getDirectChild(parent: Element, tagName: string): Element | undefined {
  return Array.from(parent.children).find((child) => child.tagName === tagName);
}

function getProperty(properties: Element | undefined, name: string): Element | undefined {
  if (!properties) {
    return undefined;
  }
  return Array.from(properties.children).find((property) => property.getAttribute("name") === name);
}

function getItemName(item: Element, fallback: string): string {
  const properties = getDirectChild(item, "Properties");
  const nameProperty = getProperty(properties, "Name");
  const name = nameProperty?.textContent?.trim();
  return name || fallback;
}

function getItemProperties(item: Element, fallback: string): {
  name: string;
  source: string;
  sourceAvailable: boolean;
  runContext?: string;
} {
  const properties = getDirectChild(item, "Properties");
  const name = getItemName(item, fallback);
  const sourceProperty = getProperty(properties, "Source");
  const sourceAvailable = sourceProperty?.getAttribute("null") !== "true";
  const source = sourceProperty?.textContent ?? "";
  const runContext = getProperty(properties, "RunContext")?.textContent?.trim() || undefined;

  return { name, source, sourceAvailable, runContext };
}

function isScriptClass(className: string): className is RbxScriptClass {
  return className === "Script" || className === "LocalScript" || className === "ModuleScript";
}

function getChildItems(item: Element): Element[] {
  return Array.from(item.children).filter((child) => child.tagName === "Item");
}

export function parseRbxXml(xmlText: string, fileName: string): RbxProject {
  if (typeof DOMParser === "undefined") {
    throw new RbxFileError("This browser cannot read Roblox XML files.");
  }

  const document = new DOMParser().parseFromString(xmlText, "application/xml");
  if (document.querySelector("parsererror")) {
    throw new RbxFileError("That Roblox file is not valid XML or is only partially saved.");
  }

  const root = document.documentElement;
  if (!root || root.tagName !== "roblox") {
    throw new RbxFileError("This is not an .rbxlx or .rbxmx Roblox XML file.");
  }

  const scripts: RbxScript[] = [];
  let instanceCount = 0;
  let containerCount = 0;

  function readItem(item: Element, parentPath: string[], siblingIndex: number): RbxTreeNode {
    instanceCount += 1;
    const className = item.getAttribute("class") || "Instance";
    const fallbackName = `${className} ${siblingIndex + 1}`;
    const properties = getItemProperties(item, fallbackName);
    const pathParts = [...parentPath, properties.name];
    const path = pathParts.join("/");
    const children = getChildItems(item).map((child, index) => readItem(child, pathParts, index));

    if (children.length > 0) {
      containerCount += 1;
    }

    let scriptId: string | undefined;
    if (isScriptClass(className)) {
      scriptId = `script-${scripts.length + 1}`;
      scripts.push({
        id: scriptId,
        name: properties.name || fallbackName,
        className,
        path,
        source: properties.source,
        sourceAvailable: properties.sourceAvailable,
        lineCount: getLineCount(properties.source),
        runContext: properties.runContext,
      });
    }

    return {
      name: properties.name,
      className,
      path,
      scriptId,
      children,
    };
  }

  const roots = Array.from(root.children)
    .filter((child) => child.tagName === "Item")
    .map((item, index) => readItem(item, [], index));

  return {
    fileName,
    format: fileName.toLowerCase().endsWith(".rbxmx") ? ".rbxmx" : ".rbxlx",
    roots,
    scripts,
    instanceCount,
    containerCount,
  };
}

export function getSafeFileStem(fileName: string): string {
  const stem = fileName.trim().replace(/\.(rbxlx|rbxmx)$/i, "");
  return (
    stem
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "roblox-project"
  );
}

export function getSafePath(path: string): string {
  return path
    .split("/")
    .map((part) => part.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim() || "Unnamed")
    .join("/");
}

function getSourceForExport(script: RbxScript): string {
  if (!script.sourceAvailable) {
    return "-- Source is unavailable in this saved file.\n";
  }
  if (!script.source) {
    return "-- Empty source\n";
  }
  return script.source.endsWith("\n") ? script.source : script.source + "\n";
}

export function buildLlmBundle(project: RbxProject): string {
  const header = [
    "# Roblox source export",
    `# Original file: ${project.fileName}`,
    `# Scripts: ${project.scripts.length} | Instances: ${project.instanceCount}`,
    "# Read locally from XML. No code was executed and no file was uploaded.",
    "",
  ];

  const sections = project.scripts.map((script) => {
    return [
      `--- FILE: ${script.path}`,
      `--- CLASS: ${script.className}`,
      script.runContext ? `--- RUN CONTEXT: ${script.runContext}` : "--- RUN CONTEXT: not specified",
      "",
      getSourceForExport(script).trimEnd(),
      "--- END FILE",
      "",
    ].join("\n");
  });

  if (sections.length === 0) {
    sections.push("--- No Script, LocalScript, or ModuleScript instances were found.\n");
  }

  return [...header, ...sections].join("\n");
}

function appendTreeLines(nodes: RbxTreeNode[], lines: string[], depth: number): void {
  for (const node of nodes) {
    const marker = node.scriptId ? "*" : node.children.length > 0 ? "+" : "-";
    lines.push(`${"  ".repeat(depth)}${marker} ${node.name} [${node.className}]`);
    appendTreeLines(node.children, lines, depth + 1);
  }
}

export function buildTreeText(project: RbxProject): string {
  const lines = [
    `Roblox hierarchy: ${project.fileName}`,
    `Scripts: ${project.scripts.length}`,
    `Instances: ${project.instanceCount}`,
    "",
  ];
  appendTreeLines(project.roots, lines, 0);
  return lines.join("\n") + "\n";
}
