import type { SavedPreset } from "../types";

export const PRESET_STORAGE_KEY = "patchglass-presets-v1";

export interface PresetStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadSavedPresets(storage: PresetStorage): SavedPreset[] {
  const rawValue = storage.getItem(PRESET_STORAGE_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter((value): value is SavedPreset => {
      if (!value || typeof value !== "object") {
        return false;
      }
      const preset = value as Partial<SavedPreset>;
      return (
        typeof preset.id === "string" &&
        typeof preset.name === "string" &&
        Boolean(preset.settings) &&
        typeof preset.settings === "object"
      );
    });
  } catch {
    return [];
  }
}

export function storeSavedPresets(storage: PresetStorage, presets: SavedPreset[]): void {
  storage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
}

export function createPresetId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
