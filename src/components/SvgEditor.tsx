import { useEffect, useMemo, useRef, useState } from "react";
import { ElasticSlider } from "./ElasticSlider";
import { downloadBlob } from "../lib/export";
import { sanitizeFileStem } from "../lib/batchImage";
import {
  applySvgColorReplacements,
  getSvgColorValues,
  sanitizeSvgMarkup,
  setSvgStrokeWidth,
  svgColorToHex,
} from "../lib/svgEditor";

const MAX_SVG_FILE_BYTES = 10 * 1024 * 1024;

function createColorMap(colors: string[]): Record<string, string> {
  return Object.fromEntries(colors.map((color) => [color, color]));
}

export function SvgEditor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [sourceMarkup, setSourceMarkup] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  const [strokeWidth, setStrokeWidth] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const editedMarkup = useMemo(() => {
    if (!sourceMarkup) return "";
    let nextMarkup = applySvgColorReplacements(sourceMarkup, replacements);
    if (strokeWidth !== null) {
      nextMarkup = setSvgStrokeWidth(nextMarkup, strokeWidth);
    }
    return nextMarkup;
  }, [replacements, sourceMarkup, strokeWidth]);

  const hasStroke = /\bstroke\s*=|\bstroke\s*:/i.test(sourceMarkup);

  useEffect(() => {
    if (!editedMarkup) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(new Blob([editedMarkup], { type: "image/svg+xml" }));
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [editedMarkup]);

  async function openFile(file: File): Promise<void> {
    setError(null);
    setMessage(null);
    if (!/\.svg$/i.test(file.name) && file.type !== "image/svg+xml") {
      setError(`${file.name} is not an SVG file.`);
      return;
    }
    if (file.size > MAX_SVG_FILE_BYTES) {
      setError(`${file.name} is larger than 10 MB.`);
      return;
    }

    try {
      const cleanMarkup = sanitizeSvgMarkup(await file.text());
      const nextColors = getSvgColorValues(cleanMarkup);
      setFileName(file.name);
      setSourceMarkup(cleanMarkup);
      setColors(nextColors);
      setReplacements(createColorMap(nextColors));
      setStrokeWidth(null);
      setMessage(`${file.name} loaded.`);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "That SVG could not be opened.");
    }
  }

  function resetEdits(): void {
    setReplacements(createColorMap(colors));
    setStrokeWidth(null);
    setMessage("Edits reset.");
    setError(null);
  }

  async function copySvg(): Promise<void> {
    if (!editedMarkup) return;
    try {
      await navigator.clipboard.writeText(editedMarkup);
      setMessage("SVG copied to the clipboard.");
      setError(null);
    } catch {
      setError("The browser did not allow clipboard access.");
    }
  }

  function downloadSvg(): void {
    if (!editedMarkup) return;
    const stem = sanitizeFileStem(fileName || "edited-icon");
    downloadBlob(new Blob([editedMarkup], { type: "image/svg+xml" }), `${stem}-edited.svg`);
    setMessage("Edited SVG saved.");
    setError(null);
  }

  return (
    <section className="utility-tool" aria-labelledby="svg-editor-heading">
      <div className="svg-workbench">
        <aside className="utility-settings panel" aria-labelledby="svg-editor-settings-heading">
          <div className="panel-topline panel-topline--stacked">
            <div className="section-label">Vector</div>
            <h2 id="svg-editor-settings-heading">Quick edits</h2>
            <p className="panel-copy">Change the useful bits without opening a full editor.</p>
          </div>

          <div
            className={`utility-dropzone${isDragging ? " is-dragging" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target) setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              const file = event.dataTransfer.files[0];
              if (file) void openFile(file);
            }}
          >
            <strong>{fileName || "Drop an SVG here"}</strong>
            <span>{fileName ? `${colors.length} editable color${colors.length === 1 ? "" : "s"} found` : "SVG icons · local only"}</span>
            <button type="button" className="button button--soft button--small" onClick={() => inputRef.current?.click()}>
              {fileName ? "Replace SVG" : "Choose SVG"}
            </button>
            <input
              ref={inputRef}
              className="visually-hidden"
              type="file"
              accept="image/svg+xml,.svg"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void openFile(file);
                event.target.value = "";
              }}
            />
          </div>

          {sourceMarkup && (
            <>
              <section className="svg-options" aria-labelledby="svg-colors-heading">
                <div className="utility-section-heading">
                  <div className="section-label" id="svg-colors-heading">Colors</div>
                  <button type="button" className="text-button" onClick={resetEdits}>Reset</button>
                </div>
                {colors.length > 0 ? (
                  <div className="svg-color-list">
                    {colors.map((sourceColor) => {
                      const targetColor = replacements[sourceColor] ?? sourceColor;
                      return (
                        <label className="svg-color-row" key={sourceColor}>
                          <span className="svg-color-row__source">
                            <span className="svg-color-swatch" style={{ backgroundColor: sourceColor }} aria-hidden="true" />
                            <code title={sourceColor}>{sourceColor}</code>
                          </span>
                          <span className="svg-color-row__target">
                            <input
                              type="color"
                              value={svgColorToHex(targetColor) ?? "#FFFFFF"}
                              aria-label={`Replace ${sourceColor}`}
                              onChange={(event) => setReplacements((current) => ({ ...current, [sourceColor]: event.target.value.toUpperCase() }))}
                            />
                            <span className="svg-color-arrow" aria-hidden="true">→</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="utility-note">No direct fill or stroke colors were found in this SVG.</p>
                )}
              </section>

              {hasStroke && (
                <section className="svg-options" aria-labelledby="svg-stroke-heading">
                  <div className="utility-section-heading">
                    <div className="section-label" id="svg-stroke-heading">Stroke</div>
                    <label className="svg-toggle">
                      <input type="checkbox" checked={strokeWidth !== null} onChange={(event) => setStrokeWidth(event.target.checked ? 4 : null)} />
                      <span>Override width</span>
                    </label>
                  </div>
                  {strokeWidth !== null && (
                    <div className="utility-slider-field">
                      <div className="utility-field-heading">
                        <label htmlFor="svg-stroke-width">Width</label>
                        <output>{strokeWidth}px</output>
                      </div>
                      <ElasticSlider
                        id="svg-stroke-width"
                        label="Stroke width"
                        value={strokeWidth}
                        min={0}
                        max={32}
                        step={0.5}
                        valueText={`${strokeWidth}px`}
                        onChange={setStrokeWidth}
                      />
                    </div>
                  )}
                </section>
              )}

              <div className="svg-actions">
                <button type="button" className="button button--soft" onClick={() => void copySvg()}>Copy SVG</button>
                <button type="button" className="button button--mint" onClick={downloadSvg}>Download SVG</button>
              </div>
            </>
          )}
        </aside>

        <section className="svg-preview panel" aria-labelledby="svg-editor-heading">
          <div className="panel-topline">
            <div>
              <div className="section-label">Preview</div>
              <h2 id="svg-editor-heading">SVG editor</h2>
            </div>
            <span className="utility-result-state">{fileName ? "Live preview" : "Waiting for SVG"}</span>
          </div>

          {error && <div className="utility-message utility-message--error" role="alert">{error}</div>}
          {message && !error && <div className="utility-message" role="status">{message}</div>}

          <div className={`svg-preview__stage${!previewUrl ? " is-empty" : ""}`}>
            {previewUrl ? <img src={previewUrl} alt={fileName ? `Preview of ${fileName}` : "SVG preview"} /> : <div><strong>Open an SVG to start</strong><p>Colors and stroke width will show here.</p></div>}
          </div>
          <div className="svg-preview__footer">
            <span>{fileName ? "Edited locally · original file is unchanged" : "SVG files never leave this device"}</span>
            {fileName && <span>{colors.length} color{colors.length === 1 ? "" : "s"} detected</span>}
          </div>
        </section>
      </div>
    </section>
  );
}
