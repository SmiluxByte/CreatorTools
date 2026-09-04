import { useRef, useState } from "react";

interface UploadPanelProps {
  sourceName?: string;
  sourceDimensions?: string;
  disabled?: boolean;
  onFile: (file: File) => void | Promise<void>;
}

export function UploadPanel({
  sourceName,
  sourceDimensions,
  disabled = false,
  onFile,
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function openPicker() {
    if (!disabled) {
      inputRef.current?.click();
    }
  }

  async function handleFiles(files: FileList | null): Promise<void> {
    const file = files?.[0];
    if (!file || disabled || isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      await onFile(file);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="control-section upload-section" aria-labelledby="source-heading" aria-busy={isLoading}>
      <div className="section-label" id="source-heading">
        Source image
      </div>
      <div
        className={
          "drop-zone" +
          (isDragging ? " is-dragging" : "") +
          (disabled || isLoading ? " is-disabled" : "") +
          (isLoading ? " is-loading" : "")
        }
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled && !isLoading) {
            setIsDragging(true);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !isLoading) {
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
          if (!disabled && !isLoading) {
            void handleFiles(event.dataTransfer.files);
          }
        }}
      >
        <div className="drop-zone__icon" aria-hidden="true">
          <span>{isLoading ? "…" : "+"}</span>
        </div>
        <div className="drop-zone__copy">
          <strong>{isLoading ? "Reading image…" : sourceName ? "Replace image" : "Drop an image here"}</strong>
          <span>{isLoading ? "Processing locally…" : "PNG or JPG · max 25 MB"}</span>
        </div>
        <button type="button" className="button button--soft button--small" onClick={openPicker} disabled={disabled || isLoading}>
          Browse
        </button>
        <input
          ref={inputRef}
          id="source-file-input"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          disabled={disabled || isLoading}
          onChange={(event) => {
            void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      {sourceName && (
        <div className="source-meta" key={sourceName}>
          <span className="source-meta__dot" aria-hidden="true" />
          <span className="source-meta__name" title={sourceName}>
            {sourceName}
          </span>
          {sourceDimensions && <span>{sourceDimensions}</span>}
        </div>
      )}
    </section>
  );
}
