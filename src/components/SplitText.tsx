import { useEffect, useRef, useState, type CSSProperties } from "react";

interface SplitTextValues {
  opacity?: number;
  x?: number;
  y?: number;
}

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitType?: "chars" | "words";
  from?: SplitTextValues;
  to?: SplitTextValues;
  threshold?: number;
  rootMargin?: string;
  textAlign?: CSSProperties["textAlign"];
  onLetterAnimationComplete?: () => void;
}

function getEase(ease: string | undefined): string {
  if (ease === "power3.out") {
    return "cubic-bezier(0.22, 1, 0.36, 1)";
  }
  return ease ?? "cubic-bezier(0.22, 1, 0.36, 1)";
}

export function SplitText({
  text,
  className,
  delay = 0,
  duration = 0.6,
  ease = "power3.out",
  splitType = "chars",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = "-100px",
  textAlign = "left",
  onLetterAnimationComplete,
}: SplitTextProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const completedRef = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const parts = splitType === "words" ? text.split(/(\s+)/) : Array.from(text);

  useEffect(() => {
    const element = textRef.current;
    if (!element) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  useEffect(() => {
    if (!isVisible || completedRef.current) {
      return;
    }

    completedRef.current = true;
    const timer = window.setTimeout(
      () => onLetterAnimationComplete?.(),
      delay + Math.max(parts.length - 1, 0) * 28 + duration * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [delay, duration, isVisible, onLetterAnimationComplete, parts.length]);

  const style = {
    "--split-duration": `${duration}s`,
    "--split-delay": `${delay}ms`,
    "--split-ease": getEase(ease),
    "--split-from-opacity": from.opacity ?? 0,
    "--split-from-x": `${from.x ?? 0}px`,
    "--split-from-y": `${from.y ?? 0}px`,
    "--split-to-opacity": to.opacity ?? 1,
    "--split-to-x": `${to.x ?? 0}px`,
    "--split-to-y": `${to.y ?? 0}px`,
    textAlign,
  } as CSSProperties;

  return (
    <span
      ref={textRef}
      className={`split-text${isVisible ? " is-visible" : ""}${className ? ` ${className}` : ""}`}
      style={style}
      aria-label={text}
    >
      {parts.map((part, index) => {
        if (/^\s+$/.test(part)) {
          return (
            <span className="split-text__space" key={`${part}-${index}`} aria-hidden="true">
              {part}
            </span>
          );
        }
        return (
          <span
            className="split-text__char"
            key={`${part}-${index}`}
            aria-hidden="true"
            style={{ "--split-index": index } as CSSProperties}
          >
            {part}
          </span>
        );
      })}
    </span>
  );
}

export default SplitText;
