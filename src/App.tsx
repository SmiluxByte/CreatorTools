import { useCallback, useEffect, useRef, useState } from "react";
import { HOURGLASS_ASSETS } from "./config/assets";
import { COUNTDOWN_STAGES } from "./config/countdown";
import { FONT_OPTIONS } from "./config/fonts";
import { DEFAULT_SETTINGS } from "./config/settings";
import { BatchImageTool } from "./components/BatchImageTool";
import { ControlRange } from "./components/ControlRange";
import { FrameDialog } from "./components/FrameDialog";
import { PresetControls } from "./components/PresetControls";
import { PreviewCanvas } from "./components/PreviewCanvas";
import { RbxScriptExtractor } from "./components/RbxScriptExtractor";
import { SequenceAutomationControls } from "./components/SequenceAutomationControls";
import { SequenceGallery } from "./components/SequenceGallery";
import { UploadPanel } from "./components/UploadPanel";
import {
  TOOL_DEFINITIONS,
  ToolNavigation,
  type ToolId,
} from "./components/ToolNavigation";
import {
  createSequenceZip,
  downloadBlob,
  getStageFilename,
  renderIconToPng,
} from "./lib/export";
import { ImageInputError, loadImageFile } from "./lib/image";
import { createPresetId, loadSavedPresets, storeSavedPresets } from "./lib/presets";
import { renderToCanvas } from "./lib/renderIcon";
import { getStageAsset } from "./lib/sequence";
import type {
  AssetStatus,
  CountdownStageId,
  EditorSettings,
  FontId,
  HourglassState,
  HourglassStyle,
  LoadedSource,
  SavedPreset,
  SequenceFrame,
} from "./types";

const CREATOR_TOOLS_LOGO_DISPLAY = `${import.meta.env.BASE_URL}assets/creator-tools-logo-display.png`;
const CREATOR_TOOLS_ICON = `${import.meta.env.BASE_URL}assets/creator-tools-icon.png`;

type BusyState = "single" | "sequence" | "zip" | null;

function createAssetStatusMap(): Record<string, AssetStatus> {
  return HOURGLASS_ASSETS.reduce<Record<string, AssetStatus>>((statusMap, asset) => {
    statusMap[asset.id] = "loading";
    return statusMap;
  }, {});
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getInitialPresets(): SavedPreset[] {
  try {
    return loadSavedPresets(window.localStorage);
  } catch {
    return [];
  }
}

function getPresetSettings(preset: SavedPreset): EditorSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...preset.settings,
    stageOverrides: preset.settings.stageOverrides ?? {},
  };
}

export default function App() {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const floatingPreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewPanelRef = useRef<HTMLElement>(null);
  const sourceRef = useRef<LoadedSource | null>(null);
  const sequenceUrlsRef = useRef<string[]>([]);
  const uploadTokenRef = useRef(0);
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);
  const [presets, setPresets] = useState<SavedPreset[]>(getInitialPresets);
  const [activePresetId, setActivePresetId] = useState("");
  const [source, setSource] = useState<LoadedSource | null>(null);
  const [assetImages, setAssetImages] = useState<Record<string, HTMLImageElement>>({});
  const [assetStatuses, setAssetStatuses] =
    useState<Record<string, AssetStatus>>(createAssetStatusMap);
  const [sequence, setSequence] = useState<SequenceFrame[]>([]);
  const [sequenceStale, setSequenceStale] = useState(false);
  const [busy, setBusy] = useState<BusyState>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [openFrame, setOpenFrame] = useState<SequenceFrame | null>(null);
  const [showFloatingPreview, setShowFloatingPreview] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const selectedAsset = HOURGLASS_ASSETS.find((asset) => asset.id === settings.hourglassId);
  const selectedAssetImage = selectedAsset ? assetImages[selectedAsset.id] : undefined;
  const selectedAssetStatus = selectedAsset ? assetStatuses[selectedAsset.id] : "missing";
  const activeDefinition = TOOL_DEFINITIONS.find((tool) => tool.id === activeTool);

  useEffect(() => {
    document.title = activeDefinition
      ? `${activeDefinition.label} · Creator Tools`
      : "Creator Tools";
  }, [activeDefinition]);

  useEffect(() => {
    let cancelled = false;

    for (const asset of HOURGLASS_ASSETS) {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        if (cancelled) {
          return;
        }
        setAssetImages((current) => ({ ...current, [asset.id]: image }));
        setAssetStatuses((current) => ({ ...current, [asset.id]: "ready" }));
      };
      image.onerror = () => {
        if (!cancelled) {
          setAssetStatuses((current) => ({ ...current, [asset.id]: "missing" }));
        }
      };
      image.src = asset.src;
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const assetsAreChecked = HOURGLASS_ASSETS.every(
      (asset) => assetStatuses[asset.id] !== "loading",
    );
    if (!assetsAreChecked || assetStatuses[settings.hourglassId] === "ready") {
      return;
    }

    const firstReadyAsset = HOURGLASS_ASSETS.find(
      (asset) => assetStatuses[asset.id] === "ready",
    );
    if (firstReadyAsset) {
      setSettings((current) => ({ ...current, hourglassId: firstReadyAsset.id }));
    }
  }, [assetStatuses, settings.hourglassId]);

  useEffect(() => {
    const canvases = [previewCanvasRef.current, floatingPreviewCanvasRef.current];
    for (const canvas of canvases) {
      if (!canvas) {
        continue;
      }

      if (!source) {
        canvas.width = 512;
        canvas.height = 512;
        canvas.getContext("2d")?.clearRect(0, 0, 512, 512);
        continue;
      }

      renderToCanvas(canvas, {
        sourceImage: source.image,
        hourglassImage: selectedAssetImage,
        settings,
      });
    }
  }, [selectedAssetImage, settings, showFloatingPreview, source]);

  useEffect(() => {
    const panel = previewPanelRef.current;
    if (!panel || typeof IntersectionObserver === "undefined") {
      return;
    }

    const handleViewportChange = () => {
      const bounds = panel.getBoundingClientRect();
      setShowFloatingPreview(bounds.top < -8 || bounds.bottom > window.innerHeight + 8);
    };

    window.addEventListener("scroll", handleViewportChange, { passive: true });
    window.addEventListener("resize", handleViewportChange);
    handleViewportChange();
    return () => {
      window.removeEventListener("scroll", handleViewportChange);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [source]);

  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        URL.revokeObjectURL(sourceRef.current.url);
      }
      for (const url of sequenceUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  const clearSequence = useCallback(() => {
    for (const url of sequenceUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    sequenceUrlsRef.current = [];
    setSequence([]);
    setSequenceStale(false);
    setOpenFrame(null);
  }, []);

  const updateSettings = useCallback((patch: Partial<EditorSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
    setSequenceStale(true);
    setDownloadMessage(null);
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setActivePresetId("");
    setSequenceStale(sequence.length > 0);
    setError(null);
    setDownloadMessage(null);
  }, [sequence.length]);

  const savePresets = useCallback((nextPresets: SavedPreset[]) => {
    storeSavedPresets(window.localStorage, nextPresets);
    setPresets(nextPresets);
  }, []);

  const handleLoadPreset = useCallback(
    (presetId: string) => {
      setActivePresetId(presetId);
      const preset = presets.find((item) => item.id === presetId);
      if (!preset) {
        return;
      }
      setSettings(getPresetSettings(preset));
      setSequenceStale(sequence.length > 0);
      setDownloadMessage(null);
    },
    [presets, sequence.length],
  );

  const handleSavePreset = useCallback(
    (name: string, replaceId?: string) => {
      const preset: SavedPreset = {
        id: replaceId ?? createPresetId(),
        name,
        settings: { ...settings, stageOverrides: { ...settings.stageOverrides } },
      };
      const nextPresets = replaceId
        ? presets.map((item) => (item.id === replaceId ? preset : item))
        : [...presets, preset];

      try {
        savePresets(nextPresets);
        setActivePresetId(preset.id);
        setError(null);
      } catch {
        setError("This browser could not save the preset locally.");
      }
    },
    [presets, savePresets, settings],
  );

  const handleDeletePreset = useCallback(
    (presetId: string) => {
      try {
        savePresets(presets.filter((preset) => preset.id !== presetId));
        setActivePresetId("");
        setError(null);
      } catch {
        setError("This browser could not remove the preset.");
      }
    },
    [presets, savePresets],
  );

  const saveDownload = useCallback((blob: Blob, filename: string) => {
    downloadBlob(blob, filename);
    setDownloadMessage("Saved " + filename);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      const uploadToken = uploadTokenRef.current + 1;
      uploadTokenRef.current = uploadToken;
      setError(null);

      try {
        const loadedSource = await loadImageFile(file);
        if (uploadToken !== uploadTokenRef.current) {
          URL.revokeObjectURL(loadedSource.url);
          return;
        }

        if (sourceRef.current) {
          URL.revokeObjectURL(sourceRef.current.url);
        }
        sourceRef.current = loadedSource;
        setSource(loadedSource);
        setDownloadMessage(null);
        clearSequence();
      } catch (loadError) {
        if (uploadToken === uploadTokenRef.current) {
          setError(
            loadError instanceof ImageInputError
              ? loadError.message
              : getErrorMessage(loadError, "That image could not be loaded."),
          );
        }
      }
    },
    [clearSequence],
  );

  const overlayReady = Boolean(selectedAssetImage);
  const hasSource = Boolean(source);
  const sequenceAssetsReady = COUNTDOWN_STAGES.every((stage) => {
    const asset = getStageAsset(stage, settings);
    return Boolean(asset && assetImages[asset.id]);
  });
  const canGenerate = hasSource && sequenceAssetsReady && busy === null;
  const selectedFont = FONT_OPTIONS.find((font) => font.id === settings.fontId);

  const handleDownload = useCallback(async () => {
    if (!source || !selectedAssetImage || busy !== null) {
      setError("Add a replacement hourglass PNG before exporting.");
      return;
    }

    setBusy("single");
    setError(null);
    try {
      const blob = await renderIconToPng(source.image, selectedAssetImage, settings);
      const filename = getStageFilename(settings.text || "CUSTOM");
      saveDownload(blob, filename);
    } catch (exportError) {
      setError(getErrorMessage(exportError, "The PNG could not be created. Try again."));
    } finally {
      setBusy(null);
    }
  }, [busy, saveDownload, selectedAssetImage, settings, source]);

  const handleGenerateSequence = useCallback(async () => {
    if (!source || !sequenceAssetsReady || busy !== null) {
      setError("One of the hourglass images needed for this sequence is unavailable.");
      return;
    }

    setBusy("sequence");
    setError(null);
    clearSequence();
    const generatedFrames: SequenceFrame[] = [];

    try {
      for (const stage of COUNTDOWN_STAGES) {
        const stageAsset = getStageAsset(stage, settings);
        const stageAssetImage = stageAsset ? assetImages[stageAsset.id] : undefined;
        if (!stageAssetImage) {
          throw new Error("The " + stage.label + " hourglass image is unavailable.");
        }
        const blob = await renderIconToPng(
          source.image,
          stageAssetImage,
          settings,
          stage.label,
        );
        generatedFrames.push({
          label: stage.label,
          filename: getStageFilename(stage.fileToken),
          blob,
          url: URL.createObjectURL(blob),
        });
      }

      sequenceUrlsRef.current = generatedFrames.map((frame) => frame.url);
      setSequence(generatedFrames);
      setSequenceStale(false);
    } catch (generationError) {
      for (const frame of generatedFrames) {
        URL.revokeObjectURL(frame.url);
      }
      setError(getErrorMessage(generationError, "The sequence could not be rendered. Try again."));
    } finally {
      setBusy(null);
    }
  }, [assetImages, busy, clearSequence, sequenceAssetsReady, settings, source]);

  const handleDownloadZip = useCallback(async () => {
    if (sequence.length === 0 || busy !== null) {
      return;
    }

    setBusy("zip");
    setError(null);
    try {
      const zipBlob = await createSequenceZip(sequence);
      saveDownload(zipBlob, "creator-tools-countdown.zip");
    } catch (zipError) {
      setError(getErrorMessage(zipError, "The ZIP could not be created. Try again."));
    } finally {
      setBusy(null);
    }
  }, [busy, saveDownload, sequence]);

  const handleStyleChange = useCallback(
    (hourglassStyle: HourglassStyle) => updateSettings({ hourglassStyle }),
    [updateSettings],
  );

  const handleAssetSelect = useCallback(
    (hourglassId: string) => updateSettings({ hourglassId }),
    [updateSettings],
  );

  const handleStageOverride = useCallback(
    (stageId: CountdownStageId, state: HourglassState | "") => {
      const stageOverrides = { ...settings.stageOverrides };
      if (state) {
        stageOverrides[stageId] = state;
      } else {
        delete stageOverrides[stageId];
      }
      updateSettings({ stageOverrides });
    },
    [settings.stageOverrides, updateSettings],
  );

  const handleToolChange = useCallback((tool: ToolId) => {
    setActiveTool(tool);
    setError(null);
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="app-shell creator-tools-app">
      <header className="app-header app-reveal app-reveal--header">
        <a className="brand brand--logo" href="#tools" aria-label="Creator Tools home">
          <img src={CREATOR_TOOLS_ICON} alt="Creator Tools" />
        </a>
        <div className="header-tools">
          <span className="header-note">
            <span className="header-pill__dot" aria-hidden="true" />
            Local only
          </span>
        </div>
      </header>

      <div className="app-layout">
        <ToolNavigation activeTool={activeTool} onChange={handleToolChange} />

        <main className="main-content app-reveal app-reveal--main">
          {activeTool && activeDefinition ? (
            <section key={activeTool} className="tool-workspace" aria-labelledby="tool-heading">
              <div className="tool-workspace__heading">
                <div className="section-label">Creator Tools / {activeDefinition.label}</div>
                <h1 id="tool-heading">
                  {activeTool === "icon-maker"
                    ? "Hourglass"
                    : activeTool === "resize"
                      ? "Batch resize"
                      : activeTool === "stroke"
                        ? "Batch stroke"
                        : "RBX source extractor"}
                </h1>
                <p>
                  {activeTool === "icon-maker"
                    ? "Make a 512 × 512 Roblox update icon. Upload an image, add an overlay, and export."
                    : activeTool === "resize"
                      ? "Resize several images at once without leaving your browser."
                      : activeTool === "stroke"
                        ? "Apply one clean outline to several transparent images at once."
                        : "Open an .rbxlx, keep its folders, and export the scripts for an LLM."}
                </p>
              </div>

              {error && activeTool === "icon-maker" && (
                    <div className="app-alert" role="alert">
                      <span className="app-alert__icon" aria-hidden="true">
                        !
                      </span>
                      <span>{error}</span>
                      <button
                        type="button"
                        className="app-alert__close"
                        onClick={() => setError(null)}
                        aria-label="Dismiss message"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  <div className="workspace-preview">
                    {activeTool === "icon-maker" ? (
                      <div className="workbench" id="editor">
                        <aside className="controls-panel panel" aria-labelledby="controls-heading">
                          <div className="panel-topline panel-topline--stacked">
                            <div className="section-label">Customize</div>
                            <h2 id="controls-heading">Editor</h2>
                            <p className="panel-copy">Image processing stays on this device.</p>
                          </div>

                          <UploadPanel
                            sourceName={source?.fileName}
                            sourceDimensions={source ? source.width + " × " + source.height : undefined}
                            disabled={busy !== null}
                            onFile={handleFile}
                          />

                          <PresetControls
                            presets={presets}
                            activePresetId={activePresetId}
                            disabled={busy !== null}
                            onLoad={handleLoadPreset}
                            onSave={handleSavePreset}
                            onDelete={handleDeletePreset}
                          />

                          <section className="control-section" aria-labelledby="overlay-heading">
                            <div className="section-label" id="overlay-heading">Overlay</div>
                            <div className="asset-grid">
                              {HOURGLASS_ASSETS.map((asset) => {
                                const status = assetStatuses[asset.id];
                                const isSelected = asset.id === settings.hourglassId && status === "ready";
                                return (
                                  <button
                                    type="button"
                                    className={"asset-card" + (isSelected ? " is-selected" : "")}
                                    key={asset.id}
                                    disabled={busy !== null || status !== "ready"}
                                    onClick={() => handleAssetSelect(asset.id)}
                                    aria-pressed={isSelected}
                                  >
                                    <span className="asset-card__preview">
                                      {status === "ready" ? (
                                        <img src={asset.src} alt="" />
                                      ) : (
                                        <span className="asset-card__slot" aria-hidden="true">
                                          {status === "loading" ? "…" : "＋"}
                                        </span>
                                      )}
                                    </span>
                                    <span className="asset-card__copy">
                                      <strong>{asset.label}</strong>
                                      <small>
                                        {status === "ready"
                                          ? isSelected
                                            ? "Selected"
                                            : "Available"
                                          : status === "loading"
                                            ? "Checking slot"
                                            : "Add PNG to slot"}
                                      </small>
                                    </span>
                                    <span className="asset-card__radio" aria-hidden="true" />
                                  </button>
                                );
                              })}
                            </div>
                          </section>

                          <section className="control-section" aria-labelledby="text-heading">
                            <div className="section-label" id="text-heading">Countdown</div>
                            <label className="field-label" htmlFor="overlay-text">Text</label>
                            <div className="text-input-wrap">
                              <input
                                id="overlay-text"
                                type="text"
                                value={settings.text}
                                maxLength={24}
                                onChange={(event) => updateSettings({ text: event.target.value })}
                                placeholder="24H"
                                disabled={busy !== null}
                              />
                              <span>{settings.text.length}/24</span>
                            </div>
                            <label className="field-label" htmlFor="font-choice">Font</label>
                            <select
                              id="font-choice"
                              value={settings.fontId}
                              onChange={(event) => updateSettings({ fontId: event.target.value as FontId })}
                              disabled={busy !== null}
                              style={{ fontFamily: selectedFont?.family }}
                            >
                              {FONT_OPTIONS.map((font) => (
                                <option key={font.id} value={font.id}>{font.label}</option>
                              ))}
                            </select>
                          </section>

                        </aside>

                        <div className="preview-column">
                          <PreviewCanvas
                            canvasRef={previewCanvasRef}
                            canvasKey={`${source?.url ?? "empty"}:${selectedAsset?.id ?? "none"}`}
                            panelRef={previewPanelRef}
                            hasSource={hasSource}
                            overlayReady={overlayReady}
                            overlayLabel={selectedAsset?.label ?? "Hourglass"}
                            downloadMessage={downloadMessage}
                            isBusy={busy !== null}
                            onBrowse={() => document.getElementById("source-file-input")?.click()}
                            onDownload={() => void handleDownload()}
                          />
                          {hasSource && !overlayReady && (
                            <div className="asset-warning" role="status">
                              <span aria-hidden="true">•</span>
                              <div>
                                <strong>{selectedAssetStatus === "loading" ? "Checking overlay files…" : "No overlay PNG loaded"}</strong>
                                <p>Choose an overlay in Settings after adding your PNG.</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <SequenceGallery
                          id="countdown"
                          frames={sequence}
                          canGenerate={canGenerate}
                          isGenerating={busy === "sequence"}
                          isZipping={busy === "zip"}
                          isStale={sequenceStale}
                          automationControls={
                            <SequenceAutomationControls
                              enabled={settings.automateSequenceIcons}
                              style={settings.hourglassStyle}
                              stageOverrides={settings.stageOverrides}
                              disabled={busy !== null}
                              onEnabledChange={(enabled) => updateSettings({ automateSequenceIcons: enabled })}
                              onStyleChange={handleStyleChange}
                              onStageOverride={handleStageOverride}
                            />
                          }
                          onGenerate={() => void handleGenerateSequence()}
                          onDownloadZip={() => void handleDownloadZip()}
                          onDownloadFrame={(frame) => saveDownload(frame.blob, frame.filename)}
                          onOpenFrame={setOpenFrame}
                        />

                        <section className="customize-panel panel" aria-labelledby="adjust-heading">
                          <div className="customize-panel__header">
                            <h2 id="adjust-heading">Customize</h2>
                            <button type="button" className="customize-panel__reset" onClick={resetSettings} disabled={busy !== null}>
                              <span aria-hidden="true">↶</span>
                              Reset
                            </button>
                          </div>
                          <div className="customize-panel__grid">
                            <ControlRange id="hourglass-size" label="Hourglass size" value={settings.hourglassSize} min={20} max={80} disabled={busy !== null} onChange={(value) => updateSettings({ hourglassSize: value })} />
                            <ControlRange id="hourglass-position" label="Hourglass position" value={settings.hourglassCenterY} min={10} max={90} disabled={busy !== null} onChange={(value) => updateSettings({ hourglassCenterY: value })} />
                            <ControlRange id="hourglass-opacity" label="Hourglass opacity" value={settings.hourglassOpacity} min={0} max={100} disabled={busy !== null} onChange={(value) => updateSettings({ hourglassOpacity: value })} />
                            <ControlRange id="text-size" label="Text size" value={settings.textSize} min={8} max={30} disabled={busy !== null} onChange={(value) => updateSettings({ textSize: value })} />
                            <ControlRange id="text-position" label="Text position" value={settings.textCenterY} min={55} max={92} disabled={busy !== null} onChange={(value) => updateSettings({ textCenterY: value })} />
                            <ControlRange id="text-opacity" label="Text opacity" value={settings.textOpacity} min={0} max={100} disabled={busy !== null} onChange={(value) => updateSettings({ textOpacity: value })} />
                            <ControlRange id="text-stroke-width" label="Text outline size" value={settings.textStrokeWidth} min={0} max={20} suffix="px" disabled={busy !== null} onChange={(value) => updateSettings({ textStrokeWidth: value })} />
                            <ControlRange id="text-stroke-opacity" label="Text outline opacity" value={settings.textStrokeOpacity} min={0} max={100} disabled={busy !== null} onChange={(value) => updateSettings({ textStrokeOpacity: value })} />
                            <ControlRange id="darken" label="Image darkening" value={settings.darken} min={0} max={100} hint="Only the uploaded image is affected." disabled={busy !== null} onChange={(value) => updateSettings({ darken: value })} />
                          </div>
                        </section>
                      </div>
                    ) : activeTool === "script-extractor" ? (
                      <RbxScriptExtractor />
                    ) : (
                      <BatchImageTool key={activeTool} mode={activeTool} />
                    )}
                  </div>

                  {showFloatingPreview && hasSource && activeTool === "icon-maker" && (
                    <div className="floating-preview">
                      <button
                        type="button"
                        className="floating-preview__button"
                        onClick={() => previewPanelRef.current?.scrollIntoView({ behavior: "smooth" })}
                        aria-label="Jump to full preview"
                      >
                        <canvas ref={floatingPreviewCanvasRef} aria-hidden="true" />
                        <span>Preview</span>
                      </button>
                    </div>
                  )}
            </section>
          ) : (
            <section className="tool-empty" aria-labelledby="empty-heading">
              <img
                className="tool-empty__logo"
                src={CREATOR_TOOLS_LOGO_DISPLAY}
                alt="Creator Tools"
              />
              <h1 id="empty-heading">Choose a tool</h1>
              <p>Select a tool from the sidebar to get started.</p>
            </section>
          )}

          <footer className="app-footer">
            <span>Local image tools</span>
            <span className="app-footer__line" aria-hidden="true" />
            <span>Nothing leaves this device</span>
          </footer>
        </main>
      </div>

      <FrameDialog
        frame={openFrame}
        onClose={() => setOpenFrame(null)}
        onDownload={(frame) => saveDownload(frame.blob, frame.filename)}
      />
    </div>
  );
}
