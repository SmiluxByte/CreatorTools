import type { RefObject } from "react";

interface PreviewCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasKey: string;
  panelRef?: RefObject<HTMLElement | null>;
  hasSource: boolean;
  overlayReady: boolean;
  overlayLabel: string;
  downloadMessage?: string | null;
  isBusy: boolean;
  onBrowse: () => void;
  onDownload: () => void;
}

export function PreviewCanvas({
  canvasRef,
  canvasKey,
  panelRef,
  hasSource,
  overlayReady,
  overlayLabel,
  downloadMessage,
  isBusy,
  onBrowse,
  onDownload,
}: PreviewCanvasProps) {
  return (
    <section ref={panelRef} className="preview-panel panel" aria-labelledby="preview-heading">
      <div className="panel-topline">
        <div>
          <div className="section-label">Preview</div>
          <h2 id="preview-heading">512 × 512</h2>
        </div>
        <span className="canvas-size-badge">PNG</span>
      </div>

      <div className="canvas-frame">
          <canvas key={canvasKey} ref={canvasRef} aria-label="512 by 512 update icon preview" />
        {!hasSource && (
          <div className="canvas-empty">
            <strong>No image selected</strong>
            <p>Choose a Roblox game icon to start editing.</p>
            <button type="button" className="button button--mint" onClick={onBrowse}>
              Choose image
            </button>
          </div>
        )}
      </div>

      <div className="preview-footer">
        <div className="preview-footer__copy">
          <div className="preview-status">
            <span className={"status-dot" + (overlayReady ? " is-ready" : "")} aria-hidden="true" />
            {hasSource
              ? overlayReady
                ? overlayLabel + " ready"
                : "Add an overlay to export"
              : "Choose an image to begin"}
          </div>
          {downloadMessage && (
            <div className="download-status" key={downloadMessage} role="status">
              {downloadMessage}
            </div>
          )}
        </div>
        <button
          type="button"
          className={`button button--mint${isBusy ? " is-busy" : ""}`}
          onClick={onDownload}
          disabled={!hasSource || !overlayReady || isBusy}
        >
          {isBusy ? "Rendering…" : "Download PNG"}
        </button>
      </div>
    </section>
  );
}
