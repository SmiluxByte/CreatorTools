import { useCallback, useEffect, useRef, useState } from "react";
import { ElasticSlider } from "./ElasticSlider";
import { createFilesZip, downloadBlob } from "../lib/export";
import {
  convertImageToBlob,
  getConvertFilename,
  type ConvertFormat,
} from "../lib/batchConvert";
import {
  BatchImageInputError,
  loadBatchImage,
  type BatchImageSource,
} from "../lib/batchFiles";

interface ConvertItem extends BatchImageSource {
  id: string;
}

interface ConvertOutput {
  filename: string;
  blob: Blob;
  url: string;
}

function createItemId(file: File, index: number): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${file.name}-${file.lastModified}-${index}-${Math.random()}`;
}

function revokeOutputs(outputs: Record<string, ConvertOutput>): void {
  for (const output of Object.values(outputs)) {
    URL.revokeObjectURL(output.url);
  }
}

export function BatchConvertTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<ConvertItem[]>([]);
  const outputsRef = useRef<Record<string, ConvertOutput>>({});
  const loadTokenRef = useRef(0);
  const [items, setItems] = useState<ConvertItem[]>([]);
  const [outputs, setOutputs] = useState<Record<string, ConvertOutput>>({});
  const [format, setFormat] = useState<ConvertFormat>("png");
  const [quality, setQuality] = useState(88);
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [savedOutputId, setSavedOutputId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  itemsRef.current = items;

  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        URL.revokeObjectURL(item.url);
      }
      revokeOutputs(outputsRef.current);
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (items.length === 0) {
      revokeOutputs(outputsRef.current);
      outputsRef.current = {};
      setOutputs({});
      setIsRendering(false);
      return;
    }

    setIsRendering(true);
    setError(null);
    const timer = window.setTimeout(() => {
      const render = async () => {
        const nextOutputs: Record<string, ConvertOutput> = {};
        const usedNames = new Set<string>();

        try {
          for (const [index, item] of items.entries()) {
            const blob = await convertImageToBlob(item.image, {
              format,
              quality,
              backgroundColor,
            });
            if (cancelled) {
              revokeOutputs(nextOutputs);
              return;
            }

            const requestedName = getConvertFilename(item.fileName, format);
            let filename = requestedName;
            let suffix = 2;
            while (usedNames.has(filename.toLowerCase())) {
              const dotIndex = requestedName.lastIndexOf(".");
              const stem = dotIndex > 0 ? requestedName.slice(0, dotIndex) : requestedName;
              const extension = dotIndex > 0 ? requestedName.slice(dotIndex) : `.${format}`;
              filename = `${stem}-${suffix}${extension}`;
              suffix += 1;
            }
            usedNames.add(filename.toLowerCase());
            nextOutputs[item.id] = {
              blob,
              filename: filename || `image-${index + 1}.${format}`,
              url: URL.createObjectURL(blob),
            };
          }

          if (cancelled) {
            revokeOutputs(nextOutputs);
            return;
          }

          revokeOutputs(outputsRef.current);
          outputsRef.current = nextOutputs;
          setOutputs(nextOutputs);
        } catch (renderError) {
          revokeOutputs(nextOutputs);
          if (!cancelled) {
            setError(renderError instanceof Error ? renderError.message : "The images could not be converted.");
          }
        } finally {
          if (!cancelled) {
            setIsRendering(false);
          }
        }
      };

      void render();
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [backgroundColor, format, items, quality]);

  const addFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) {
      return;
    }

    const loadToken = loadTokenRef.current + 1;
    loadTokenRef.current = loadToken;
    setError(null);
    setMessage(null);
    setIsLoadingFiles(true);
    const loadedItems: ConvertItem[] = [];
    const failures: string[] = [];

    try {
      for (const [index, file] of files.entries()) {
        try {
          const loaded = await loadBatchImage(file);
          if (loadToken !== loadTokenRef.current) {
            URL.revokeObjectURL(loaded.url);
            return;
          }
          loadedItems.push({ ...loaded, id: createItemId(file, index) });
        } catch (loadError) {
          failures.push(
            loadError instanceof BatchImageInputError
              ? loadError.message
              : `${file.name} could not be loaded.`,
          );
        }
      }

      if (loadedItems.length > 0) {
        setItems((current) => [...current, ...loadedItems]);
        setMessage(`${loadedItems.length} image${loadedItems.length === 1 ? "" : "s"} added.`);
      }
      if (failures.length > 0) {
        setError(failures.slice(0, 3).join(" ") + (failures.length > 3 ? " More files were skipped." : ""));
      }
    } finally {
      if (loadToken === loadTokenRef.current) {
        setIsLoadingFiles(false);
      }
    }
  }, []);

  const clearAll = useCallback(() => {
    loadTokenRef.current += 1;
    for (const item of itemsRef.current) {
      URL.revokeObjectURL(item.url);
    }
    revokeOutputs(outputsRef.current);
    outputsRef.current = {};
    setItems([]);
    setOutputs({});
    setMessage(null);
    setError(null);
  }, []);

  const removeItem = useCallback((itemId: string) => {
    const item = itemsRef.current.find((candidate) => candidate.id === itemId);
    if (item) {
      URL.revokeObjectURL(item.url);
    }
    setItems((current) => current.filter((candidate) => candidate.id !== itemId));
  }, []);

  function handleDownloadItem(itemId: string, output: ConvertOutput): void {
    downloadBlob(output.blob, output.filename);
    setSavedOutputId(itemId);
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => setSavedOutputId(null), 1400);
  }

  const handleDownloadAll = useCallback(async () => {
    const files = Object.values(outputsRef.current);
    if (files.length === 0 || isExporting || isRendering) {
      return;
    }

    setIsExporting(true);
    setError(null);
    try {
      const zip = await createFilesZip(files);
      downloadBlob(zip, `creator-tools-converted-${format}.zip`);
      setMessage(`Saved ${files.length} converted file${files.length === 1 ? "" : "s"} as ZIP.`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "The ZIP could not be created.");
    } finally {
      setIsExporting(false);
    }
  }, [format, isExporting, isRendering]);

  const hasCompleteOutput = items.length > 0 && items.every((item) => outputs[item.id]);

  return (
    <section className="utility-tool" aria-labelledby="batch-convert-heading">
      <div className="utility-workbench">
        <aside className="utility-settings panel" aria-labelledby="batch-convert-settings-heading">
          <div className="panel-topline panel-topline--stacked">
            <div className="section-label">Files</div>
            <h2 id="batch-convert-settings-heading">Convert</h2>
            <p className="panel-copy">Everything stays in this browser.</p>
          </div>

          <div
            className={`utility-dropzone${isDragging ? " is-dragging" : ""}${isLoadingFiles ? " is-loading" : ""}`}
            aria-busy={isLoadingFiles}
            onDragEnter={(event) => {
              event.preventDefault();
              if (!isLoadingFiles) setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!isLoadingFiles) {
                event.dataTransfer.dropEffect = "copy";
                setIsDragging(true);
              }
            }}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target) setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              if (!isLoadingFiles) void addFiles(event.dataTransfer.files);
            }}
          >
            <strong>{isLoadingFiles ? "Reading images…" : "Drop images here"}</strong>
            <span>{isLoadingFiles ? "Loading locally…" : "PNG, JPG or WebP · multiple files"}</span>
            <button
              type="button"
              className="button button--soft button--small"
              onClick={() => inputRef.current?.click()}
              disabled={isLoadingFiles}
            >
              Choose files
            </button>
            <input
              ref={inputRef}
              className="visually-hidden"
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
              tabIndex={-1}
              aria-hidden="true"
              disabled={isLoadingFiles}
              onChange={(event) => {
                if (event.target.files) void addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>

          <div className="utility-file-summary">
            <span>{items.length} selected</span>
            {items.length > 0 && (
              <button type="button" className="text-button" onClick={clearAll}>Clear all</button>
            )}
          </div>

          <section className="utility-options" aria-labelledby="convert-options-heading">
            <div className="section-label" id="convert-options-heading">Output format</div>
            <div className="utility-format-buttons" role="group" aria-label="Output format">
              {(["png", "jpg", "webp"] as ConvertFormat[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={format === option ? "is-active" : ""}
                  onClick={() => setFormat(option)}
                  aria-pressed={format === option}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>

            {format !== "png" && (
              <div className="utility-slider-field">
                <div className="utility-field-heading">
                  <label htmlFor="convert-quality">Quality</label>
                  <output>{quality}%</output>
                </div>
                <ElasticSlider
                  id="convert-quality"
                  label="Quality"
                  value={quality}
                  min={10}
                  max={100}
                  step={1}
                  valueText={`${quality}%`}
                  onChange={setQuality}
                />
              </div>
            )}

            {format === "jpg" && (
              <label className="utility-color-field" htmlFor="convert-background">
                <span>Transparent background</span>
                <span>
                  <input
                    id="convert-background"
                    type="color"
                    value={backgroundColor}
                    onChange={(event) => setBackgroundColor(event.target.value.toUpperCase())}
                  />
                  <code>{backgroundColor}</code>
                </span>
              </label>
            )}
          </section>

          <p className="utility-note">
            PNG keeps transparency. JPG fills transparent pixels with your chosen color.
          </p>
        </aside>

        <section className="utility-results panel" aria-labelledby="batch-convert-results-heading">
          <div className="panel-topline">
            <div>
              <div className="section-label">Preview</div>
              <h2 id="batch-convert-results-heading">{items.length > 0 ? `${items.length} files` : "Output"}</h2>
            </div>
            <span className="utility-result-state">
              {isRendering ? "Converting…" : items.length > 0 ? `Ready as ${format.toUpperCase()}` : "Waiting for files"}
            </span>
          </div>

          {error && <div className="utility-message utility-message--error" role="alert">{error}</div>}
          {message && !error && <div className="utility-message" role="status">{message}</div>}

          {items.length === 0 ? (
            <div className="utility-empty">
              <strong>Nothing to convert yet</strong>
              <p>Drop a few images here and choose the format you need.</p>
            </div>
          ) : (
            <div className="utility-file-list">
              {items.map((item) => {
                const output = outputs[item.id];
                return (
                  <article className="utility-file-card" key={item.id}>
                    <div className="utility-file-card__preview">
                      <img src={output?.url ?? item.url} alt="" />
                    </div>
                    <div className="utility-file-card__details">
                      <strong title={item.fileName}>{item.fileName}</strong>
                      <span>{output?.filename ?? `${item.width} × ${item.height}`}</span>
                    </div>
                    <div className="utility-file-card__actions">
                      <button
                        type="button"
                        className={`text-button${savedOutputId === item.id ? " is-saved" : ""}`}
                        onClick={() => output && handleDownloadItem(item.id, output)}
                        disabled={!output || isRendering}
                      >
                        {savedOutputId === item.id ? "Saved" : "Save"}
                      </button>
                      <button type="button" className="text-button text-button--quiet" onClick={() => removeItem(item.id)}>
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="utility-results__footer">
            <span>Converted locally · original dimensions preserved</span>
            <button
              type="button"
              className="button button--mint"
              onClick={() => void handleDownloadAll()}
              disabled={!hasCompleteOutput || isRendering || isExporting}
            >
              {isExporting ? "Building ZIP…" : "Download ZIP"}
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
