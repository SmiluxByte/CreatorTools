import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

interface ElasticSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  valueText: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function ElasticSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  valueText,
  disabled = false,
  onChange,
}: ElasticSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const range = max - min;
  const progress = range === 0 ? 0 : clamp(((value - min) / range) * 100, 0, 100);
  const isActive = !disabled && (isHovered || isDragging);

  const updateFromPointer = (clientX: number) => {
    const slider = sliderRef.current;
    if (!slider) {
      return;
    }

    const { left, width } = slider.getBoundingClientRect();
    if (width <= 0) {
      return;
    }

    const ratio = clamp((clientX - left) / width, 0, 1);
    const rawValue = min + ratio * range;
    const steppedValue = step > 0
      ? min + Math.round((rawValue - min) / step) * step
      : rawValue;
    const nextValue = clamp(steppedValue, min, max);
    onChange(Number(nextValue.toFixed(4)));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }

    event.preventDefault();
    inputRef.current?.focus();
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromPointer(event.clientX);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || event.buttons === 0) {
      return;
    }

    updateFromPointer(event.clientX);
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  };

  return (
    <div
      ref={sliderRef}
      className={`elastic-slider${isActive ? " is-active" : ""}${isDragging ? " is-dragging" : ""}`}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onLostPointerCapture={() => {
        setIsDragging(false);
      }}
    >
      <div className="elastic-slider__track-shell" aria-hidden="true">
        <div className="elastic-slider__track">
          <div className="elastic-slider__range" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <input
        ref={inputRef}
        id={id}
        className="elastic-slider__input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={valueText}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
