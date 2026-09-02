import { useEffect } from "react";
import type { SequenceFrame } from "../types";

interface FrameDialogProps {
  frame: SequenceFrame | null;
  onClose: () => void;
  onDownload: (frame: SequenceFrame) => void;
}

export function FrameDialog({ frame, onClose, onDownload }: FrameDialogProps) {
  useEffect(() => {
    if (!frame) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [frame, onClose]);

  if (!frame) {
    return null;
  }

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div
        className="frame-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="frame-dialog-heading"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="frame-dialog__header">
          <div>
            <div className="section-label">Sequence preview</div>
            <h2 id="frame-dialog-heading">{frame.label}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close preview" autoFocus>
            ×
          </button>
        </div>
        <div className="frame-dialog__image">
          <img src={frame.url} alt={"Generated update icon for " + frame.label} />
        </div>
        <div className="frame-dialog__footer">
          <span>{frame.filename}</span>
          <button type="button" className="button button--mint" onClick={() => onDownload(frame)}>
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}
