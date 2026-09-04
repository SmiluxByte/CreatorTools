import { useCallback, useMemo, useRef, useState } from "react";
import { createFilesZip, downloadBlob } from "../lib/export";
import { buildRenamePlan } from "../lib/batchRename";

interface RenameItem {
  id: string;
  file: File;
}

function createItemId(file: File, index: number): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${file.name}-${file.lastModified}-${index}-${Math.random()}`;
}

export function BatchRenameTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<RenameItem[]>([]);
  const [template, setTemplate] = useState("{name}-{n}");
  const [startNumber, setStartNumber] = useState(1);
  const [padding, setPadding] = useState(3);
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const plan = useMemo(
    () => buildRenamePlan(items.map((item) => item.file.name), { template, startNumber, padding }),
    [items, padding, startNumber, template],
  );

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setItems((current) => [
      ...current,
      ...files.map((file, index) => ({ id: createItemId(file, index), file })),
    ]);
    setError(null);
    setMessage(`${files.length} file${files.length === 1 ? "" : "s"} added.`);
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    setError(null);
    setMessage(null);
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }, []);

  const handleDownload = useCallback(async () => {
    if (items.length === 0 || isExporting) return;
    setIsExporting(true);
    setError(null);
    setSaved(false);
    try {
      const zip = await createFilesZip(
        items.map((item, index) => ({
          blob: item.file,
          filename: plan[index].newName,
        })),
      );
      downloadBlob(zip, "creator-tools-renamed.zip");
      setSaved(true);
      setMessage(`Saved ${items.length} renamed file${items.length === 1 ? "" : "s"} as ZIP.`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "The ZIP could not be created.");
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, items, plan]);

  return (
    <section className="utility-tool" aria-labelledby="batch-rename-heading">
      <div className="utility-workbench">
        <aside className="utility-settings panel" aria-labelledby="batch-rename-settings-heading">
          <div className="panel-topline panel-topline--stacked">
            <div className="section-label">Files</div>
            <h2 id="batch-rename-settings-heading">Rename</h2>
            <p className="panel-copy">Preview every name before downloading.</p>
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
              addFiles(event.dataTransfer.files);
            }}
          >
            <strong>Drop files here</strong>
            <span>Any file type · nothing is uploaded</span>
            <button type="button" className="button button--soft button--small" onClick={() => inputRef.current?.click()}>
              Choose files
            </button>
            <input
              ref={inputRef}
              className="visually-hidden"
              type="file"
              multiple
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>

          <div className="utility-file-summary">
            <span>{items.length} selected</span>
            {items.length > 0 && <button type="button" className="text-button" onClick={clearAll}>Clear all</button>}
          </div>

          <section className="utility-options" aria-labelledby="rename-options-heading">
            <div className="section-label" id="rename-options-heading">Name pattern</div>
            <label className="utility-text-field" htmlFor="rename-template">
              <span>Template</span>
              <input
                id="rename-template"
                type="text"
                value={template}
                onChange={(event) => setTemplate(event.target.value)}
                placeholder="{name}-{n}"
              />
            </label>
            <p className="utility-note">Use <code>{"{name}"}</code> for the old name, <code>{"{n}"}</code> for the number, and <code>{"{ext}"}</code> for the old extension.</p>
            <div className="utility-number-fields">
              <label className="utility-text-field" htmlFor="rename-start">
                <span>Start</span>
                <input id="rename-start" type="number" min="0" value={startNumber} onChange={(event) => setStartNumber(Number(event.target.value) || 0)} />
              </label>
              <label className="utility-text-field" htmlFor="rename-padding">
                <span>Digits</span>
                <input id="rename-padding" type="number" min="1" max="8" value={padding} onChange={(event) => setPadding(Math.min(8, Math.max(1, Number(event.target.value) || 1)))} />
              </label>
            </div>
          </section>

          <p className="utility-note">Browsers cannot rename the originals in place, so the renamed files come in one ZIP.</p>
        </aside>

        <section className="utility-results panel" aria-labelledby="batch-rename-results-heading">
          <div className="panel-topline">
            <div>
              <div className="section-label">Preview</div>
              <h2 id="batch-rename-results-heading">{items.length > 0 ? `${items.length} files` : "Output"}</h2>
            </div>
            <span className="utility-result-state">{items.length > 0 ? "Names ready to review" : "Waiting for files"}</span>
          </div>

          {error && <div className="utility-message utility-message--error" role="alert">{error}</div>}
          {message && !error && <div className="utility-message" role="status">{message}</div>}

          {items.length === 0 ? (
            <div className="utility-empty">
              <strong>Nothing to rename yet</strong>
              <p>Drop files here, then make the pattern yours.</p>
            </div>
          ) : (
            <div className="rename-preview-list">
              {plan.map((entry, index) => (
                <article className="rename-preview-row" key={items[index].id}>
                  <span className="rename-preview-row__index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong title={entry.originalName}>{entry.originalName}</strong>
                    <span aria-hidden="true">↓</span>
                    <output title={entry.newName}>{entry.newName}</output>
                  </div>
                  <button type="button" className="text-button text-button--quiet" onClick={() => removeItem(items[index].id)}>
                    Remove
                  </button>
                </article>
              ))}
            </div>
          )}

          <div className="utility-results__footer">
            <span>Original file content is unchanged</span>
            <button type="button" className={`button button--mint${saved ? " is-saved" : ""}`} onClick={() => void handleDownload()} disabled={items.length === 0 || isExporting}>
              {isExporting ? "Building ZIP…" : saved ? "Saved ZIP" : "Download ZIP"}
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
