import type { ReactNode } from "react";
import type { SequenceFrame } from "../types";

interface SequenceGalleryProps {
  id?: string;
  frames: SequenceFrame[];
  canGenerate: boolean;
  isGenerating: boolean;
  isZipping: boolean;
  isStale: boolean;
  automationControls: ReactNode;
  onGenerate: () => void;
  onDownloadZip: () => void;
  onDownloadFrame: (frame: SequenceFrame) => void;
  onOpenFrame: (frame: SequenceFrame) => void;
}

export function SequenceGallery({
  id,
  frames,
  canGenerate,
  isGenerating,
  isZipping,
  isStale,
  automationControls,
  onGenerate,
  onDownloadZip,
  onDownloadFrame,
  onOpenFrame,
}: SequenceGalleryProps) {
  return (
    <section id={id} className="sequence-panel panel" aria-labelledby="sequence-heading">
      <div className="panel-topline">
        <div>
          <div className="section-label">Export</div>
          <h2 id="sequence-heading">Countdown sequence</h2>
        </div>
        <span className="sequence-count">7 PNGs</span>
      </div>

      <p className="panel-copy">
        Generate all seven stages with the current settings.
      </p>

      {automationControls}

      <div className="sequence-actions">
        <button
          type="button"
          className="button button--mint button--full"
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating || isZipping}
        >
          {isGenerating ? "Rendering sequence…" : "Generate sequence"}
        </button>
        <button
          type="button"
          className="button button--soft button--full"
          onClick={onDownloadZip}
          disabled={frames.length === 0 || isGenerating || isZipping}
        >
          {isZipping ? "Building ZIP…" : "Download ZIP"}
        </button>
      </div>

      {isStale && frames.length > 0 && (
        <div className="sequence-notice" role="status">
          Settings changed. Generate again to refresh these frames.
        </div>
      )}

      {frames.length === 0 ? (
        <div className="sequence-empty">
          <strong>No sequence generated</strong>
          <p>Generate the seven PNGs to preview them here.</p>
        </div>
      ) : (
        <div className="sequence-list">
          {frames.map((frame) => (
            <article className="frame-card" key={frame.label}>
              <button
                type="button"
                className="frame-card__preview"
                onClick={() => onOpenFrame(frame)}
                aria-label={"Open " + frame.label + " preview"}
              >
                <img src={frame.url} alt="" />
                <span className="frame-card__zoom" aria-hidden="true">
                  ↗
                </span>
              </button>
              <div className="frame-card__footer">
                <strong>{frame.label}</strong>
                <button type="button" className="text-button" onClick={() => onDownloadFrame(frame)}>
                  Save PNG
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
