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

  function openPicker() {
    if (!disabled) {
      inputRef.current?.click();
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) {
      void onFile(file);
    }
  }

  return (
    <section className="control-section upload-section" aria-labelledby="source-heading">
      <div className="section-label" id="source-heading">
        Source image
      </div>
      <div
        className={"drop-zone" + (isDragging ? " is-dragging" : "") + (disabled ? " is-disabled" : "")}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) {
            setIsDragging(true);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) {
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
          if (!disabled) {
            handleFiles(event.dataTransfer.files);
          }
        }}
      >
        <div className="drop-zone__icon" aria-hidden="true">
          <span>+</span>
        </div>
        <div className="drop-zone__copy">
          <strong>{sourceName ? "Replace image" : "Drop an image here"}</strong>
          <span>PNG or JPG · max 25 MB</span>
        </div>
        <button type="button" className="button button--soft button--small" onClick={openPicker} disabled={disabled}>
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
          disabled={disabled}
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      {sourceName && (
        <div className="source-meta">
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
