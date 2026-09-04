import { useCallback, useEffect, useRef, useState } from "react";
import { ElasticSlider } from "./ElasticSlider";
import { createFilesZip, downloadBlob } from "../lib/export";
import {
  getBatchFilename,
  renderBatchImagePreviewToPng,
  renderBatchImageToPng,
  type BatchRenderOptions,
  type BatchFitMode,
} from "../lib/batchImage";
import {
  BatchImageInputError,
  loadBatchImage,
  type BatchImageSource,
} from "../lib/batchFiles";

type BatchMode = "resize" | "stroke";

interface BatchImageToolProps {
  mode: BatchMode;
}

interface BatchItem extends BatchImageSource {
  id: string;
}

interface BatchOutput {
  filename: string;
  blob: Blob;
  url: string;
}

const SIZE_PRESETS = [64, 128, 150, 256, 420, 512, 1024];

function createItemId(file: File, index: number): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${file.name}-${file.lastModified}-${index}-${Math.random()}`;
}

function revokeOutputs(outputs: Record<string, BatchOutput>): void {
  for (const output of Object.values(outputs)) {
    URL.revokeObjectURL(output.url);
  }
}

function revokePreviewUrls(previewUrls: Record<string, string>): void {
  for (const url of Object.values(previewUrls)) {
    URL.revokeObjectURL(url);
  }
}

function getToolCopy(mode: BatchMode): {
  title: string;
  description: string;
  emptyTitle: string;
  emptyCopy: string;
} {
  if (mode === "resize") {
    return {
      title: "Batch resize",
      description: "Turn a folder of images into exact, ready-to-use sizes.",
      emptyTitle: "No images selected",
      emptyCopy: "Drop the images you want to resize here.",
    };
  }
  return {
    title: "Batch stroke",
    description: "Give multiple transparent PNGs the same clean outline.",
    emptyTitle: "No images selected",
    emptyCopy: "Drop transparent PNGs here to outline them together.",
  };
}

export function BatchImageTool({ mode }: BatchImageToolProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<BatchItem[]>([]);
  const outputsRef = useRef<Record<string, BatchOutput>>({});
  const previewUrlsRef = useRef<Record<string, string>>({});
  const loadTokenRef = useRef(0);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [outputs, setOutputs] = useState<Record<string, BatchOutput>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [targetWidth, setTargetWidth] = useState(256);
  const [targetHeight, setTargetHeight] = useState(256);
  const [fit, setFit] = useState<BatchFitMode>("contain");
  const [resizeBeforeStroke, setResizeBeforeStroke] = useState(false);
  const [strokeColor, setStrokeColor] = useState("#FFFFFF");
  const [strokeWidth, setStrokeWidth] = useState(8);
  const [strokeOpacity, setStrokeOpacity] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [savedOutputId, setSavedOutputId] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const copy = getToolCopy(mode);

  itemsRef.current = items;

  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        URL.revokeObjectURL(item.url);
      }
      revokeOutputs(outputsRef.current);
      revokePreviewUrls(previewUrlsRef.current);
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const getOptions = useCallback(
    (item: BatchItem): BatchRenderOptions => ({
      width: mode === "resize" || resizeBeforeStroke ? targetWidth : item.width,
      height: mode === "resize" || resizeBeforeStroke ? targetHeight : item.height,
      fit: mode === "resize" || resizeBeforeStroke ? fit : "stretch",
      operation: mode,
      strokeColor,
      strokeWidth,
      strokeOpacity,
    }),
    [fit, mode, resizeBeforeStroke, strokeColor, strokeOpacity, strokeWidth, targetHeight, targetWidth],
  );

  useEffect(() => {
    let cancelled = false;
    if (items.length === 0) {
      revokePreviewUrls(previewUrlsRef.current);
      previewUrlsRef.current = {};
      setPreviewUrls({});
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const renderPreview = async () => {
        const nextPreviewUrls: Record<string, string> = {};
        try {
          for (const item of items) {
            const blob = await renderBatchImagePreviewToPng(item.image, getOptions(item));
            if (cancelled) {
              revokePreviewUrls(nextPreviewUrls);
              return;
            }
            nextPreviewUrls[item.id] = URL.createObjectURL(blob);
          }

          if (cancelled) {
            revokePreviewUrls(nextPreviewUrls);
            return;
          }

          const previousPreviewUrls = previewUrlsRef.current;
          previewUrlsRef.current = nextPreviewUrls;
          setPreviewUrls(nextPreviewUrls);
          revokePreviewUrls(previousPreviewUrls);
        } catch (renderError) {
          revokePreviewUrls(nextPreviewUrls);
          if (!cancelled) {
            setError(renderError instanceof Error ? renderError.message : "The preview could not be rendered.");
          }
        }
      };

      void renderPreview();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [getOptions, items]);

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
    const render = async () => {
      const nextOutputs: Record<string, BatchOutput> = {};
      try {
        for (const item of items) {
          const blob = await renderBatchImageToPng(item.image, getOptions(item));
          if (cancelled) {
            revokeOutputs(nextOutputs);
            return;
          }
          nextOutputs[item.id] = {
            blob,
            filename: getBatchFilename(
              item.fileName,
              mode,
              targetWidth,
              targetHeight,
              mode === "stroke" && resizeBeforeStroke,
            ),
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
        setError(null);
      } catch (renderError) {
        revokeOutputs(nextOutputs);
        if (!cancelled) {
          setError(renderError instanceof Error ? renderError.message : "The preview could not be rendered.");
        }
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    };
    const renderTimer = window.setTimeout(() => {
      void render();
    }, mode === "stroke" ? 320 : 140);

    return () => {
      cancelled = true;
      window.clearTimeout(renderTimer);
    };
  }, [getOptions, items, mode, resizeBeforeStroke, targetHeight, targetWidth]);

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
    const loadedItems: BatchItem[] = [];
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
    setItems([]);
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

  function handleDownloadItem(itemId: string, output: BatchOutput): void {
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
      downloadBlob(zip, `creator-tools-${mode}.zip`);
      setMessage(`Saved ${files.length} PNG${files.length === 1 ? "" : "s"} as ZIP.`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "The ZIP could not be created.");
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, isRendering, mode]);

  const handlePreset = (size: number) => {
    setTargetWidth(size);
    setTargetHeight(size);
  };

  return (
    <section className="batch-tool" aria-labelledby="batch-tool-heading">
      <div className="batch-tool__heading">
        <div>
          <div className="section-label">Creator Tools</div>
          <h2 id="batch-tool-heading">{copy.title}</h2>
          <p>{copy.description}</p>
        </div>
        <span className="batch-tool__local">Local only</span>
      </div>

      <div className="batch-workbench">
        <aside className="batch-settings panel" aria-labelledby="batch-settings-heading">
          <div className="panel-topline panel-topline--stacked">
            <div className="section-label">Files</div>
            <h3 id="batch-settings-heading">Input</h3>
            <p className="panel-copy">Images are processed in this browser.</p>
          </div>

          <div
            className={
              "batch-dropzone" +
              (isDragging ? " is-dragging" : "") +
              (isLoadingFiles ? " is-loading" : "")
            }
            aria-busy={isLoadingFiles}
            onDragEnter={(event) => {
              event.preventDefault();
              if (!isLoadingFiles) {
                setIsDragging(true);
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!isLoadingFiles) {
                event.dataTransfer.dropEffect = "copy";
                setIsDragging(true);
              }
            }}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target) {
                setIsDragging(false);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              if (!isLoadingFiles) {
                void addFiles(event.dataTransfer.files);
              }
            }}
          >
            <strong>{isLoadingFiles ? "Reading images…" : "Drop images here"}</strong>
            <span>{isLoadingFiles ? "Processing locally…" : "PNG, JPG or WebP · multiple files"}</span>
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
                if (event.target.files) {
                  void addFiles(event.target.files);
                }
                event.target.value = "";
              }}
            />
          </div>

          <div className="batch-file-summary">
            <span>{items.length} selected</span>
            {items.length > 0 && (
              <button type="button" className="text-button" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>

          {mode === "resize" && (
            <section className="batch-options" aria-labelledby="resize-options-heading">
              <div className="section-label" id="resize-options-heading">
                Output size
              </div>
              <div className="batch-presets">
                {SIZE_PRESETS.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={
                      "batch-preset" +
                      (targetWidth === size && targetHeight === size ? " is-active" : "")
                    }
                    onClick={() => handlePreset(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <div className="batch-size-fields">
                <label>
                  <span>Width</span>
                  <input
                    type="number"
                    min="1"
                    max="4096"
                    value={targetWidth}
                    onChange={(event) => setTargetWidth(Number(event.target.value) || 1)}
                  />
                </label>
                <span className="batch-size-x" aria-hidden="true">
                  ×
                </span>
                <label>
                  <span>Height</span>
                  <input
                    type="number"
                    min="1"
                    max="4096"
                    value={targetHeight}
                    onChange={(event) => setTargetHeight(Number(event.target.value) || 1)}
                  />
                </label>
              </div>
              <label className="batch-select-label" htmlFor="resize-fit">
                Fit
              </label>
              <select
                id="resize-fit"
                value={fit}
                onChange={(event) => setFit(event.target.value as BatchFitMode)}
              >
                <option value="contain">Contain · transparent padding</option>
                <option value="cover">Cover · crop to fill</option>
                <option value="stretch">Stretch · fill exactly</option>
              </select>
            </section>
          )}

          {mode === "stroke" && (
            <section className="batch-options" aria-labelledby="stroke-options-heading">
              <div className="section-label" id="stroke-options-heading">
                Outline
              </div>
              <div className="batch-color-field">
                <label htmlFor="stroke-color">Color</label>
                <div>
                  <input
                    id="stroke-color"
                    type="color"
                    value={strokeColor}
                    onChange={(event) => setStrokeColor(event.target.value.toUpperCase())}
                  />
                  <code>{strokeColor}</code>
                </div>
              </div>
              <div className="batch-slider-field">
                <label className="batch-select-label" htmlFor="stroke-width">
                  Size <output>{strokeWidth}px</output>
                </label>
                <ElasticSlider
                  id="stroke-width"
                  label="Size"
                  value={strokeWidth}
                  min={0}
                  max={64}
                  step={1}
                  valueText={`${strokeWidth}px`}
                  onChange={setStrokeWidth}
                />
              </div>
              <div className="batch-slider-field">
                <label className="batch-select-label" htmlFor="stroke-opacity">
                  Opacity <output>{strokeOpacity}%</output>
                </label>
                <ElasticSlider
                  id="stroke-opacity"
                  label="Opacity"
                  value={strokeOpacity}
                  min={0}
                  max={100}
                  step={1}
                  valueText={`${strokeOpacity}%`}
                  onChange={setStrokeOpacity}
                />
              </div>
              <label className="batch-check">
                <input
                  type="checkbox"
                  checked={resizeBeforeStroke}
                  onChange={(event) => setResizeBeforeStroke(event.target.checked)}
                />
                <span>
                  <strong>Resize before stroke</strong>
                  <small>Useful for turning large icons into 256×256 exports.</small>
                </span>
              </label>
              {resizeBeforeStroke && (
                <>
                  <div className="batch-presets">
                    {SIZE_PRESETS.map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={
                          "batch-preset" +
                          (targetWidth === size && targetHeight === size ? " is-active" : "")
                        }
                        onClick={() => handlePreset(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  <div className="batch-size-fields">
                    <label>
                      <span>Width</span>
                      <input
                        type="number"
                        min="1"
                        max="4096"
                        value={targetWidth}
                        onChange={(event) => setTargetWidth(Number(event.target.value) || 1)}
                      />
                    </label>
                    <span className="batch-size-x" aria-hidden="true">
                      ×
                    </span>
                    <label>
                      <span>Height</span>
                      <input
                        type="number"
                        min="1"
                        max="4096"
                        value={targetHeight}
                        onChange={(event) => setTargetHeight(Number(event.target.value) || 1)}
                      />
                    </label>
                  </div>
                  <label className="batch-select-label" htmlFor="stroke-fit">
                    Fit
                  </label>
                  <select
                    id="stroke-fit"
                    value={fit}
                    onChange={(event) => setFit(event.target.value as BatchFitMode)}
                  >
                    <option value="contain">Contain · transparent padding</option>
                    <option value="cover">Cover · crop to fill</option>
                    <option value="stretch">Stretch · fill exactly</option>
                  </select>
                </>
              )}
            </section>
          )}
        </aside>

        <section className="batch-results panel" aria-labelledby="batch-results-heading">
          <div className="panel-topline">
            <div>
              <div className="section-label">Preview</div>
              <h3 id="batch-results-heading">{items.length > 0 ? `${items.length} images` : "Output"}</h3>
            </div>
            <span className="batch-result-state">
              {isRendering ? "Rendering…" : items.length > 0 ? "Ready to review" : "Waiting for files"}
            </span>
          </div>

          {error && (
            <div className="batch-message batch-message--error" role="alert">
              {error}
            </div>
          )}
          {message && !error && (
            <div className="batch-message" key={message} role="status">
              {message}
            </div>
          )}

          {items.length === 0 ? (
            <div className="batch-empty">
              <strong>{copy.emptyTitle}</strong>
              <p>{copy.emptyCopy}</p>
            </div>
          ) : (
            <div className="batch-grid">
              {items.map((item, index) => {
                const output = outputs[item.id];
                const imageUrl = previewUrls[item.id] ?? output?.url ?? item.url;
                return (
                  <article
                    className="batch-card batch-card--enter"
                    key={item.id}
                    style={{ animationDelay: `${Math.min(index, 7) * 45}ms` }}
                  >
                    <div className="batch-card__image">
                      <img
                        src={imageUrl}
                        alt=""
                      />
                    </div>
                    <div className="batch-card__footer">
                      <div>
                        <strong title={item.fileName}>{item.fileName}</strong>
                        <small>
                          {output ? output.filename : `${item.width} × ${item.height}`}
                        </small>
                      </div>
                      <div className="batch-card__actions">
                        <button
                          type="button"
                          className={`text-button${savedOutputId === item.id ? " is-saved" : ""}`}
                          onClick={() => output && handleDownloadItem(item.id, output)}
                          disabled={!output || isRendering}
                        >
                          {savedOutputId === item.id ? "Saved" : "Save"}
                        </button>
                        <button
                          type="button"
                          className="text-button text-button--quiet"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.fileName}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="batch-results__footer">
            <span>Fast preview while adjusting · final PNG keeps exact size</span>
            <button
              type="button"
              className="button button--mint"
              onClick={() => void handleDownloadAll()}
              disabled={items.length === 0 || isRendering || isExporting || Object.keys(outputs).length !== items.length}
            >
              {isExporting ? "Building ZIP…" : "Download ZIP"}
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
