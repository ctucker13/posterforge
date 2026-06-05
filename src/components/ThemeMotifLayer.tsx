import type { CSSProperties } from "react";

interface ThemeMotifLayerProps {
  themeId: string;
  mode: "full-background" | "motif-overlay";
  style?: CSSProperties | undefined;
}

export function ThemeMotifLayer({ themeId, mode, style }: ThemeMotifLayerProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: mode === "motif-overlay" ? 2 : 0,
        ...style,
      }}
    >
      {mode === "full-background" ? (
        <img
          src={`/theme-backgrounds/${themeId}.svg`}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
        />
      ) : (
        <MotifOverlay themeId={themeId} />
      )}
    </div>
  );
}

function MotifOverlay({ themeId }: { themeId: string }) {
  if (themeId === "whiteboard-explainer") {
    return (
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} xmlns="http://www.w3.org/2000/svg">
        {/* Sketch corner arrow — bottom right */}
        <g stroke="rgba(37,99,235,0.2)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M calc(100% - 40px),calc(100% - 60px) L calc(100% - 16px),calc(100% - 60px) L calc(100% - 16px),calc(100% - 36px)" />
          <polyline points="0,0 -8,8 8,8" transform={`translate(${0},${0}) rotate(90)`} />
        </g>
        {/* Dotted divider near top */}
        <line x1="16" y1="52" x2="calc(100% - 16px)" y2="52" stroke="rgba(37,99,235,0.12)" strokeWidth="1" strokeDasharray="4,4" />
      </svg>
    );
  }

  if (themeId === "comic-research-showcase") {
    return (
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} xmlns="http://www.w3.org/2000/svg">
        {/* Bold ink border */}
        <rect x="3" y="3" width="calc(100% - 6px)" height="calc(100% - 6px)" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="3" rx="2" />
        {/* Corner halftone dots */}
        <g fill="rgba(254,231,21,0.5)">
          <circle cx="14" cy="14" r="3"/><circle cx="24" cy="14" r="2"/><circle cx="14" cy="24" r="2"/>
        </g>
      </svg>
    );
  }

  if (themeId === "blueprint-engineering") {
    return (
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} xmlns="http://www.w3.org/2000/svg">
        {/* Grid line overlay */}
        <defs>
          <pattern id={`bp-grid-${themeId}`} width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#bp-grid-${themeId})`}/>
        {/* Corner crosshairs */}
        <g stroke="rgba(255,255,255,0.25)" strokeWidth="1" fill="none">
          <line x1="12" y1="8" x2="12" y2="24"/><line x1="4" y1="16" x2="20" y2="16"/>
        </g>
      </svg>
    );
  }

  if (themeId === "retro-computing-terminal") {
    return (
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`scan-${themeId}`} width="100%" height="4" patternUnits="userSpaceOnUse">
            <rect width="100%" height="2" fill="rgba(0,255,80,0.03)"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#scan-${themeId})`}/>
        {/* Corner brackets */}
        <g stroke="rgba(0,255,80,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="square">
          <polyline points="8,20 8,8 20,8"/>
          <polyline points="calc(100% - 8px),20 calc(100% - 8px),8 calc(100% - 20px),8"/>
        </g>
      </svg>
    );
  }

  if (themeId === "academic-chalkboard") {
    return (
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} xmlns="http://www.w3.org/2000/svg">
        {/* Chalk dust at bottom */}
        <ellipse cx="30%" cy="calc(100% - 4px)" rx="40" ry="4" fill="rgba(255,255,255,0.08)"/>
        <ellipse cx="70%" cy="calc(100% - 4px)" rx="55" ry="5" fill="rgba(255,255,255,0.06)"/>
      </svg>
    );
  }

  // Default fallback: accent rule at card top
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: "var(--theme-accent, #2176AE)",
        opacity: 0.6,
        borderRadius: "8px 8px 0 0",
      }}
    />
  );
}
