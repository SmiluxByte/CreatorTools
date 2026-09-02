import { COUNTDOWN_STAGES } from "../config/countdown";
import { HOURGLASS_STATE_OPTIONS } from "../lib/sequence";
import type {
  CountdownStageId,
  HourglassState,
  HourglassStyle,
  StageOverrides,
} from "../types";

interface SequenceAutomationControlsProps {
  enabled: boolean;
  style: HourglassStyle;
  stageOverrides: StageOverrides;
  disabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onStyleChange: (style: HourglassStyle) => void;
  onStageOverride: (stageId: CountdownStageId, state: HourglassState | "") => void;
}

export function SequenceAutomationControls({
  enabled,
  style,
  stageOverrides,
  disabled,
  onEnabledChange,
  onStyleChange,
  onStageOverride,
}: SequenceAutomationControlsProps) {
  return (
    <div className="sequence-automation">
      <label className="automation-toggle">
        <span>
          <strong>Automatic sequence icons</strong>
          <small>Switches the hourglass as the countdown gets closer.</small>
        </span>
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
        <span className="automation-toggle__track" aria-hidden="true" />
      </label>

      {enabled && (
        <div className="automation-options">
          <div className="style-row">
            <span className="field-label">Sequence style</span>
            <div className="segmented-control" role="group" aria-label="Hourglass style">
              {(["solid", "outline"] as HourglassStyle[]).map((option) => (
                <button
                  type="button"
                  key={option}
                  className={style === option ? "is-active" : ""}
                  aria-pressed={style === option}
                  disabled={disabled}
                  onClick={() => onStyleChange(option)}
                >
                  {option === "solid" ? "Solid" : "Outline"}
                </button>
              ))}
            </div>
          </div>
          <div className="sequence-map" aria-label="Automatic hourglass sequence">
            <div>
              <strong>24H · 12H</strong>
              <span>Almost Filled</span>
            </div>
            <div>
              <strong>6H · 3H</strong>
              <span>Low</span>
            </div>
            <div>
              <strong>1H · 30M · NOW!</strong>
              <span>Empty</span>
            </div>
          </div>
          <details className="stage-overrides">
            <summary>
              Customize stages <span>Optional</span>
            </summary>
            <div className="stage-overrides__list">
              {COUNTDOWN_STAGES.map((stage) => (
                <label key={stage.id}>
                  <span>{stage.label}</span>
                  <select
                    value={stageOverrides[stage.id] ?? ""}
                    disabled={disabled}
                    onChange={(event) =>
                      onStageOverride(stage.id, event.target.value as HourglassState | "")
                    }
                  >
                    <option value="">Automatic</option>
                    {HOURGLASS_STATE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
