const COLOR_ATTRIBUTE_PATTERN = /\b(?:fill|stroke|stop-color|color)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const COLOR_STYLE_PATTERN = /\b(?:fill|stroke|stop-color|color)\s*:\s*([^;\}"']+)/gi;

function isEditableColor(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized || ["none", "currentcolor", "inherit", "transparent"].includes(normalized)) {
    return false;
  }
  return !normalized.startsWith("url(") && !normalized.startsWith("var(");
}

export function getSvgColorValues(svgMarkup: string): string[] {
  const colors: string[] = [];
  const seen = new Set<string>();
  const addColor = (value: string) => {
    const color = value.trim();
    const key = color.toLowerCase();
    if (!isEditableColor(color) || seen.has(key)) {
      return;
    }
    seen.add(key);
    colors.push(color);
  };

  for (const match of svgMarkup.matchAll(COLOR_ATTRIBUTE_PATTERN)) {
    addColor(match[1] ?? match[2] ?? "");
  }
  for (const match of svgMarkup.matchAll(COLOR_STYLE_PATTERN)) {
    addColor(match[1] ?? "");
  }

  return colors;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function replaceSvgColor(
  svgMarkup: string,
  sourceColor: string,
  replacementColor: string,
): string {
  if (!sourceColor || sourceColor.toLowerCase() === replacementColor.toLowerCase()) {
    return svgMarkup;
  }
  return svgMarkup.replace(new RegExp(escapeRegExp(sourceColor), "gi"), replacementColor);
}

export function applySvgColorReplacements(
  svgMarkup: string,
  replacements: Record<string, string>,
): string {
  const activeReplacements = Object.entries(replacements).filter(
    ([source, target]) => source && target && source.toLowerCase() !== target.toLowerCase(),
  );
  let editedMarkup = svgMarkup;

  activeReplacements.forEach(([source], index) => {
    editedMarkup = replaceSvgColor(
      editedMarkup,
      source,
      `__CREATOR_TOOLS_COLOR_${index}__`,
    );
  });
  activeReplacements.forEach(([source, target], index) => {
    editedMarkup = replaceSvgColor(
      editedMarkup,
      `__CREATOR_TOOLS_COLOR_${index}__`,
      target,
    );
  });

  return editedMarkup;
}

function parseColorChannel(value: string): number {
  const channel = value.trim();
  if (channel.endsWith("%")) {
    return Math.round((Number.parseFloat(channel) / 100) * 255);
  }
  return Math.round(Number.parseFloat(channel));
}

const NAMED_COLORS: Record<string, string> = {
  black: "#000000",
  blue: "#0000ff",
  cyan: "#00ffff",
  gray: "#808080",
  grey: "#808080",
  green: "#008000",
  magenta: "#ff00ff",
  orange: "#ffa500",
  purple: "#800080",
  red: "#ff0000",
  white: "#ffffff",
  yellow: "#ffff00",
};

export function svgColorToHex(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  const hexMatch = normalized.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      return `#${hex
        .slice(0, 3)
        .split("")
        .map((channel) => channel + channel)
        .join("")}`;
    }
    return `#${hex.slice(0, 6).padEnd(6, "0")}`;
  }

  const rgbMatch = normalized.match(/^rgba?\(([^)]+)\)$/);
  if (rgbMatch) {
    const channels = rgbMatch[1].split(",").slice(0, 3).map(parseColorChannel);
    if (channels.length === 3 && channels.every((channel) => Number.isFinite(channel))) {
      return `#${channels
        .map((channel) => clampColorChannel(channel).toString(16).padStart(2, "0"))
        .join("")}`;
    }
  }

  return NAMED_COLORS[normalized] ?? null;
}

function clampColorChannel(value: number): number {
  return Math.min(255, Math.max(0, value));
}

export function sanitizeSvgMarkup(svgMarkup: string): string {
  const document = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  if (document.querySelector("parsererror") || document.documentElement.nodeName.toLowerCase() !== "svg") {
    throw new Error("That file is not a valid SVG.");
  }

  document.querySelectorAll("script").forEach((element) => element.remove());
  document.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name.toLowerCase().startsWith("on")) {
        element.removeAttribute(attribute.name);
      }
    }
  });

  return new XMLSerializer().serializeToString(document.documentElement);
}

export function setSvgStrokeWidth(svgMarkup: string, width: number): string {
  const document = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  if (document.querySelector("parsererror") || document.documentElement.nodeName.toLowerCase() !== "svg") {
    return svgMarkup;
  }

  const elements = [document.documentElement, ...Array.from(document.querySelectorAll("*"))];
  for (const element of elements) {
    const style = element.getAttribute("style");
    if (style && /(?:^|;)\s*stroke-width\s*:/i.test(style)) {
      element.setAttribute(
        "style",
        style.replace(/(stroke-width\s*:)\s*[^;]+/i, `$1 ${width}`),
      );
      continue;
    }

    const hasStroke = element.hasAttribute("stroke") || Boolean(style && /(?:^|;)\s*stroke\s*:/i.test(style));
    if (element.hasAttribute("stroke-width") || hasStroke) {
      element.setAttribute("stroke-width", String(width));
    }
  }

  return new XMLSerializer().serializeToString(document.documentElement);
}
