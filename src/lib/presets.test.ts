import { expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../config/settings";
import type { SavedPreset } from "../types";
import { loadSavedPresets, PRESET_STORAGE_KEY, storeSavedPresets } from "./presets";

function createStorage(initialValue: string | null = null) {
  let value = initialValue;
  return {
    getItem: () => value,
    setItem: (_key: string, nextValue: string) => {
      value = nextValue;
    },
    read: () => value,
  };
}

it("stores presets as browser-local JSON", () => {
  const storage = createStorage();
  const presets: SavedPreset[] = [
    { id: "main", name: "Main game", settings: DEFAULT_SETTINGS },
  ];

  storeSavedPresets(storage, presets);
  expect(storage.read()).toContain("Main game");
  expect(loadSavedPresets(storage)).toEqual(presets);
  expect(PRESET_STORAGE_KEY).toBe("patchglass-presets-v1");
});

it("ignores malformed local preset data", () => {
  expect(loadSavedPresets(createStorage("not-json"))).toEqual([]);
  expect(loadSavedPresets(createStorage('{"wrong":true}'))).toEqual([]);
});
