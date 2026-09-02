import { useEffect, useState } from "react";
import type { SavedPreset } from "../types";

interface PresetControlsProps {
  presets: SavedPreset[];
  activePresetId: string;
  disabled: boolean;
  onLoad: (presetId: string) => void;
  onSave: (name: string, replaceId?: string) => void;
  onDelete: (presetId: string) => void;
}

export function PresetControls({
  presets,
  activePresetId,
  disabled,
  onLoad,
  onSave,
  onDelete,
}: PresetControlsProps) {
  const [isNaming, setIsNaming] = useState(false);
  const [name, setName] = useState("");
  const activePreset = presets.find((preset) => preset.id === activePresetId);

  useEffect(() => {
    if (activePreset) {
      setName(activePreset.name);
    }
  }, [activePreset]);

  const submitPreset = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }
    const matchingPreset = presets.find(
      (preset) => preset.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    onSave(trimmedName, matchingPreset?.id);
    setIsNaming(false);
  };

  return (
    <section className="control-section preset-section" aria-labelledby="preset-heading">
      <div className="section-label" id="preset-heading">
        Presets
      </div>
      <div className="preset-row">
        <select
          aria-label="Saved preset"
          value={activePresetId}
          disabled={disabled}
          onChange={(event) => onLoad(event.target.value)}
        >
          <option value="">Current settings</option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="button button--soft button--small"
          disabled={disabled}
          onClick={() => {
            setName(activePreset?.name ?? "");
            setIsNaming((current) => !current);
          }}
        >
          Save preset
        </button>
      </div>
      {isNaming && (
        <form
          className="preset-name-row"
          onSubmit={(event) => {
            event.preventDefault();
            submitPreset();
          }}
        >
          <input
            type="text"
            value={name}
            maxLength={32}
            autoFocus
            placeholder="Preset name"
            aria-label="Preset name"
            disabled={disabled}
            onChange={(event) => setName(event.target.value)}
          />
          <button
            type="submit"
            className="button button--mint button--small"
            disabled={disabled || !name.trim()}
          >
            Save
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => setIsNaming(false)}
          >
            Cancel
          </button>
        </form>
      )}
      <div className="preset-meta">
        <span>Saved in this browser.</span>
        {activePreset && (
          <button
            type="button"
            className="text-button"
            disabled={disabled}
            onClick={() => onDelete(activePreset.id)}
          >
            Delete
          </button>
        )}
      </div>
    </section>
  );
}
