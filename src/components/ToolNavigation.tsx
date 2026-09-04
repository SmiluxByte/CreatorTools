import { useEffect, useId, useRef, useState } from "react";

export type ToolId = "icon-maker" | "resize" | "stroke" | "script-extractor";

export interface ToolDefinition {
  id: ToolId;
  label: string;
  description: string;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  { id: "icon-maker", label: "Hourglass", description: "Countdown update icons" },
  { id: "resize", label: "Batch Resize", description: "Exact output sizes" },
  { id: "stroke", label: "Batch Stroke", description: "Outlines for PNGs" },
  { id: "script-extractor", label: "RBX Source Extractor", description: "Scripts for LLMs" },
];

interface ToolNavigationProps {
  activeTool: ToolId | null;
  onChange: (tool: ToolId) => void;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.25" />
      <path d="m12.5 12.5 4 4" />
    </svg>
  );
}

export function ToolNavigation({ activeTool, onChange }: ToolNavigationProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState("");
  const normalizedFilter = filter.trim().toLowerCase();
  const visibleTools = TOOL_DEFINITIONS.filter((tool) => {
    if (!normalizedFilter) {
      return true;
    }
    return `${tool.label} ${tool.description}`.toLowerCase().includes(normalizedFilter);
  });

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <aside className="tool-navigation app-reveal app-reveal--sidebar" aria-label="Creator tools">
      <div className="tool-navigation__top">
        <div className="tool-navigation__switch">
          <span className="tool-navigation__switch-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
              <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
              <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
              <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
            </svg>
          </span>
          <strong>Creator tools</strong>
        </div>
        <div className="tool-navigation__search">
          <label className="visually-hidden" htmlFor={inputId}>
            Filter tools
          </label>
          <SearchIcon />
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter..."
          />
        </div>
      </div>

      <nav className="tool-navigation__list" aria-label="Available tools">
        <div className="tool-navigation__group-label">
          Most used tools
        </div>
        {visibleTools.length > 0 ? (
          visibleTools.map((tool) => {
            const isActive = tool.id === activeTool;
            return (
              <button
                key={tool.id}
                type="button"
                className={"tool-navigation__item" + (isActive ? " is-active" : "")}
                onClick={() => onChange(tool.id)}
                aria-current={isActive ? "page" : undefined}
                title={tool.description}
              >
                <span className="tool-navigation__copy">
                  <strong>{tool.label}</strong>
                </span>
              </button>
            );
          })
        ) : (
          <p className="tool-navigation__empty">No tools match that filter.</p>
        )}
      </nav>

      <div className="tool-navigation__footer">
        <span className="tool-navigation__status-dot" aria-hidden="true" />
        <span>Everything runs locally</span>
      </div>
    </aside>
  );
}
