interface ControlRangeProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  hint?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function ControlRange({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "%",
  hint,
  disabled = false,
  onChange,
}: ControlRangeProps) {
  return (
    <div className="control-range">
      <div className="control-range__heading">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>
          {value}
          {suffix}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={value + suffix}
      />
      {hint && <p className="control-hint">{hint}</p>}
    </div>
  );
}
