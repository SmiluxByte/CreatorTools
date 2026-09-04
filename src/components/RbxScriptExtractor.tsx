import { useMemo, useRef, useState } from "react";
import { downloadBlob } from "../lib/export";
import { createRbxSourceZip } from "../lib/rbxExport";
import {
  buildLlmBundle,
  getSafeFileStem,
  isSupportedRbxXmlFile,
  MAX_RBX_XML_BYTES,
  parseRbxXml,
  RbxFileError,
  type RbxProject,
  type RbxScript,
} from "../lib/rbxFile";

const formatBytes = (bytes: number): string => {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied ? Promise.resolve() : Promise.reject(new Error("Clipboard access was blocked."));
}

function getSourceLabel(script: RbxScript): string {
  if (!script.sourceAvailable) {
    return "Source unavailable";
  }
  if (!script.source) {
    return "Empty source";
  }
  return `${script.lineCount} ${script.lineCount === 1 ? "line" : "lines"}`;
}

interface RbxScriptExtractorProps {
  onError?: (message: string | null) => void;
}

export function RbxScriptExtractor({ onError }: RbxScriptExtractorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState<RbxProject | null>(null);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reportError = (message: string | null) => {
    setError(message);
    onError?.(message);
  };

  const filteredScripts = useMemo(() => {
    if (!project) {
      return [];
    }
    const query = filter.trim().toLowerCase();
    if (!query) {
      return project.scripts;
    }
    return project.scripts.filter((script) =>
      `${script.path} ${script.className} ${script.source}`.toLowerCase().includes(query),
    );
  }, [filter, project]);

  const selectedScript = project?.scripts.find((script) => script.id === selectedScriptId) ?? null;

  async function handleFile(file: File): Promise<void> {
    reportError(null);
    setNotice(null);

    if (!isSupportedRbxXmlFile(file)) {
      reportError("Choose a saved .rbxlx or .rbxmx XML file. Binary .rbxl/.rbxm files are not supported yet.");
      return;
    }
    if (file.size > MAX_RBX_XML_BYTES) {
      reportError(`That file is larger than ${formatBytes(MAX_RBX_XML_BYTES)}. Save a smaller place or model and try again.`);
      return;
    }

    setIsReading(true);
    try {
      const xmlText = await file.text();
      const nextProject = parseRbxXml(xmlText, file.name);
      setProject(nextProject);
      setSelectedScriptId(nextProject.scripts[0]?.id ?? null);
      setFilter("");
      setNotice(
        nextProject.scripts.length === 0
          ? "The hierarchy loaded, but no Script, LocalScript, or ModuleScript instances were found."
          : `Loaded ${nextProject.scripts.length} ${nextProject.scripts.length === 1 ? "script" : "scripts"}.`,
      );
    } catch (readError) {
      reportError(
        readError instanceof RbxFileError
          ? readError.message
          : readError instanceof Error
            ? readError.message
            : "That Roblox file could not be read.",
      );
      setProject(null);
      setSelectedScriptId(null);
    } finally {
      setIsReading(false);
    }
  }

  function reset(): void {
    setProject(null);
    setSelectedScriptId(null);
    setFilter("");
    setNotice(null);
    reportError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleCopyAll(): Promise<void> {
    if (!project) {
      return;
    }
    try {
      await copyText(buildLlmBundle(project));
      setNotice("Copied the full hierarchy and source bundle for your LLM.");
      reportError(null);
    } catch (copyError) {
      reportError(copyError instanceof Error ? copyError.message : "The bundle could not be copied.");
    }
  }

  async function handleCopyScript(): Promise<void> {
    if (!selectedScript) {
      return;
    }
    try {
      await copyText(selectedScript.source);
      setNotice(`Copied ${selectedScript.name}.`);
      reportError(null);
    } catch (copyError) {
      reportError(copyError instanceof Error ? copyError.message : "The script could not be copied.");
    }
  }

  function handleDownloadText(): void {
    if (!project) {
      return;
    }
    const blob = new Blob([buildLlmBundle(project)], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `${getSafeFileStem(project.fileName)}-llm-context.txt`);
    setNotice("Saved the LLM context file.");
  }

  async function handleDownloadZip(): Promise<void> {
    if (!project || isZipping) {
      return;
    }
    setIsZipping(true);
    reportError(null);
    try {
      const blob = await createRbxSourceZip(project);
      downloadBlob(blob, `${getSafeFileStem(project.fileName)}-source.zip`);
      setNotice("Saved the source ZIP with folders, tree, manifest, and LLM context.");
    } catch (zipError) {
      reportError(zipError instanceof Error ? zipError.message : "The source ZIP could not be created.");
    } finally {
      setIsZipping(false);
    }
  }

  return (
    <section className="rbx-tool" aria-label="RBX source extractor">
      {error && (
        <div className="rbx-tool__alert" role="alert">
          <span aria-hidden="true">!</span>
          <p>{error}</p>
          <button type="button" onClick={() => reportError(null)} aria-label="Dismiss error">×</button>
        </div>
      )}

      {!project ? (
        <div
          className={`rbx-dropzone${isDragging ? " is-dragging" : ""}${isReading ? " is-reading" : ""}`}
          aria-busy={isReading}
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
            if (event.currentTarget === event.target) {
              setIsDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            const file = event.dataTransfer.files[0];
            if (file) {
              void handleFile(file);
            }
          }}
        >
          <div className="rbx-dropzone__mark" aria-hidden="true">&lt;/&gt;</div>
          <h2>{isReading ? "Reading Roblox hierarchy…" : "Drop an .rbxlx file here"}</h2>
          <p>
            Extract every Script, LocalScript, and ModuleScript with its exact folder path for an LLM.
          </p>
          <button
            type="button"
            className="rbx-button rbx-button--primary"
            onClick={() => inputRef.current?.click()}
            disabled={isReading}
          >
            Choose Roblox file
          </button>
          <small className="rbx-dropzone__status" role="status">
            {isReading ? "Reading locally…" : `.rbxlx and .rbxmx · up to ${formatBytes(MAX_RBX_XML_BYTES)} · local only`}
          </small>
          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept=".rbxlx,.rbxmx,application/xml,text/xml"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
              event.target.value = "";
            }}
          />
        </div>
      ) : (
        <>
          <div className="rbx-tool__topbar">
            <div>
              <div className="section-label">Loaded file</div>
              <h2>{project.fileName}</h2>
              <p>Source is read locally. Nothing is executed or uploaded.</p>
            </div>
            <div className="rbx-tool__actions">
              <button type="button" className="rbx-button" onClick={() => void handleCopyAll()}>
                Copy LLM bundle
              </button>
              <button type="button" className="rbx-button" onClick={handleDownloadText}>
                Download .txt
              </button>
              <button
                type="button"
                className={`rbx-button rbx-button--primary${isZipping ? " is-busy" : ""}`}
                onClick={() => void handleDownloadZip()}
                disabled={isZipping}
              >
                {isZipping ? "Building ZIP…" : "Download source ZIP"}
              </button>
              <button type="button" className="rbx-button rbx-button--quiet" onClick={reset}>
                New file
              </button>
            </div>
          </div>

          <div className="rbx-tool__stats" aria-label="File summary">
            <span><strong>{project.scripts.length}</strong> scripts</span>
            <span><strong>{project.instanceCount}</strong> instances</span>
            <span><strong>{project.containerCount}</strong> containers</span>
            <span><strong>{project.scripts.reduce((total, script) => total + script.lineCount, 0)}</strong> source lines</span>
          </div>

          {notice && <p className="rbx-tool__notice" key={notice} role="status">{notice}</p>}

          <div className="rbx-workspace">
            <aside className="rbx-script-list" aria-label="Extracted scripts">
              <div className="rbx-script-list__header">
                <div>
                  <div className="section-label">Project tree</div>
                  <strong>{filteredScripts.length} of {project.scripts.length} scripts</strong>
                </div>
                <button type="button" className="rbx-copy-small" onClick={() => void handleCopyAll()}>
                  Copy all
                </button>
              </div>
              <label className="rbx-search">
                <span className="visually-hidden">Filter scripts</span>
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  placeholder="Filter paths or code"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                />
              </label>
              <div className="rbx-script-list__items">
                {filteredScripts.length > 0 ? filteredScripts.map((script, index) => (
                  <button
                    type="button"
                    key={script.id}
                    className={`rbx-script-item rbx-script-item--enter${selectedScriptId === script.id ? " is-selected" : ""}`}
                    style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
                    onClick={() => setSelectedScriptId(script.id)}
                  >
                    <span className="rbx-script-item__topline">
                      <strong>{script.name}</strong>
                      <span className={`rbx-class-badge rbx-class-badge--${script.className.toLowerCase()}`}>
                        {script.className === "ModuleScript" ? "Module" : script.className.replace("Script", "")}
                      </span>
                    </span>
                    <span className="rbx-script-item__path">{script.path}</span>
                    <span className="rbx-script-item__meta">{getSourceLabel(script)}</span>
                  </button>
                )) : (
                  <p className="rbx-script-list__empty">No scripts match that filter.</p>
                )}
              </div>
            </aside>

            <section
              className="rbx-script-viewer"
              key={selectedScript?.id ?? "empty"}
              aria-label="Selected source"
            >
              {selectedScript ? (
                <>
                  <div className="rbx-script-viewer__header">
                    <div>
                      <div className="section-label">{selectedScript.className}</div>
                      <h3>{selectedScript.name}</h3>
                      <p>{selectedScript.path}</p>
                    </div>
                    <button type="button" className="rbx-button" onClick={() => void handleCopyScript()}>
                      Copy script
                    </button>
                  </div>
                  <pre><code>{selectedScript.sourceAvailable ? selectedScript.source || "-- Empty source" : "-- Source is unavailable in this saved file."}</code></pre>
                </>
              ) : (
                <div className="rbx-script-viewer__empty">
                  <strong>No script selected</strong>
                  <span>Select a file from the project tree.</span>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
