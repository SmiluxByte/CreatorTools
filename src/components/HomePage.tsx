import type { ToolId } from "./ToolNavigation";

const CREATOR_TOOLS_LOGO = `${import.meta.env.BASE_URL}assets/creator-tools-logo.png`;
const CREATOR_TOOLS_ICON = `${import.meta.env.BASE_URL}assets/creator-tools-icon.png`;

interface HomePageProps {
  onOpenTools: (tool?: ToolId) => void;
}

const TOOLS = [
  { id: "icon-maker" as const, name: "Hourglass", detail: "Countdown update icons" },
  { id: "resize" as const, name: "Batch Resize", detail: "Exact output sizes" },
  { id: "stroke" as const, name: "Batch Stroke", detail: "Outlines for PNGs" },
  { id: "script-extractor" as const, name: "RBX Source Extractor", detail: "Scripts for LLMs" },
];

function ToolIcon({ tool }: { tool: (typeof TOOLS)[number]["id"] }) {
  if (tool === "script-extractor") {
    return (
      <svg viewBox="0 0 96 96" role="img" aria-hidden="true">
        <path d="M23 14h34l16 16v52H23z" />
        <path d="M57 14v17h16M35 48l-9 9 9 9M50 66l9-9-9-9M66 48l7 18" />
      </svg>
    );
  }

  if (tool === "resize") {
    return (
      <svg viewBox="0 0 96 96" role="img" aria-hidden="true">
        <rect x="13" y="25" width="45" height="45" rx="3" />
        <rect x="38" y="13" width="45" height="45" rx="3" />
        <path d="M24 14v10M14 24h10M72 72V62M82 62H72" />
        <path d="m18 18 12 12M78 78 66 66" />
      </svg>
    );
  }

  if (tool === "stroke") {
    return (
      <svg viewBox="0 0 96 96" role="img" aria-hidden="true">
        <rect x="25" y="25" width="46" height="46" rx="3" />
        <path d="M18 36V18h18M60 18h18v18M78 60v18H60M36 78H18V60" />
        <path d="m34 60 10-11 8 7 8-10 9 14" />
        <circle cx="40" cy="39" r="4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 96 96" role="img" aria-hidden="true">
      <rect x="14" y="18" width="58" height="58" rx="4" />
      <path d="m22 66 16-18 12 12 8-9 11 15" />
      <circle cx="33" cy="34" r="5" />
      <path d="M78 14v18M69 23h18" />
    </svg>
  );
}

export function HomePage({ onOpenTools }: HomePageProps) {
  return (
    <div className="home-page">
      <div className="home-page__grid" aria-hidden="true" />
      <div className="home-page__glow home-page__glow--top" aria-hidden="true" />
      <div className="home-page__glow home-page__glow--logo" aria-hidden="true" />

      <header className="home-header">
        <a className="home-wordmark" href={import.meta.env.BASE_URL} aria-label="Creator Tools home">
          <img className="home-wordmark__mark" src={CREATOR_TOOLS_ICON} alt="" />
          <span>
            <strong>Creator Tools</strong>
            <small>Local tools</small>
          </span>
        </a>
        <div className="home-header__right">
          <span className="home-status">
            <span className="home-status__dot" aria-hidden="true" />
            Local tools
          </span>
        </div>
      </header>

      <main className="home-main">
        <section className="home-hero home-hero--launcher" aria-labelledby="home-heading">
          <div className="home-logo-stage">
            <img
              className="home-logo"
              src={CREATOR_TOOLS_LOGO}
              alt="Creator Tools"
            />
          </div>

          <div className="home-copy">
            <p className="home-eyebrow">CREATOR TOOLS</p>
            <h1 id="home-heading">
              Most used tools
            </h1>
            <p className="home-lede">
              The tools we use most for Roblox and game assets.
            </p>
          </div>
        </section>

        <section
          className="home-tool-list home-tool-list--launcher"
          id="tools"
          aria-labelledby="tools-heading"
        >
          <h2 id="tools-heading" className="visually-hidden">
            Available tools
          </h2>
          <div className="home-tool-list__items">
            {TOOLS.map((tool) => (
              <button type="button" className="home-tool-card" key={tool.id} onClick={() => onOpenTools(tool.id)}>
                <span className="home-tool-card__icon">
                  <ToolIcon tool={tool.id} />
                </span>
                <span className="home-tool-card__copy">
                  <strong>{tool.name}</strong>
                  <small>{tool.detail}</small>
                </span>
                <span className="home-tool-card__arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>
          <button type="button" className="home-all-tools" onClick={() => onOpenTools()}>
            <span>View all tools</span>
            <span aria-hidden="true">→</span>
          </button>
        </section>
      </main>
    </div>
  );
}
