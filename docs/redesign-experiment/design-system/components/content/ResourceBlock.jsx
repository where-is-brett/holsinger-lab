import React from "react";

/* Meta values print VERBATIM — a DOI is a case-sensitive identifier.
   Labels are uppercased by style; values are not. */
export function ResourceBlock({ title, meta = [], figureLabel }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 340px",
      gap: "0 var(--spacing-gutter-lg)", alignItems: "start",
    }}>
      <div>
        <div style={{
          fontSize: "var(--text-heading)", lineHeight: "var(--text-heading--line-height)",
          fontWeight: 600, letterSpacing: "var(--text-heading--letter-spacing)", maxWidth: 640,
        }}>{title}</div>
        <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 10, font: "400 12.5px/1.5 var(--font-mono)" }}>
          {meta.map((m) => (
            <div key={m.label}>
              <span style={{
                display: "inline-block", minWidth: 64,
                color: "var(--sem-text-faint)", textTransform: "uppercase",
              }}>{m.label}</span>
              {m.href
                ? <a className="hl-link hl-identifier" href={m.href}>{m.value}</a>
                : <span className="hl-identifier">{m.value}</span>}
            </div>
          ))}
        </div>
      </div>
      {figureLabel && (
        <div style={{
          height: 200, boxSizing: "border-box", border: "1px solid var(--sem-rule)",
          background: "repeating-linear-gradient(45deg, transparent 0 12px, color-mix(in oklab, var(--sem-text) 4.5%, transparent) 12px 13px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px",
        }}>
          <span style={{ font: "400 11px/1.6 var(--font-mono)", color: "var(--sem-text-faint)", textAlign: "center" }}>{figureLabel}</span>
        </div>
      )}
    </div>
  );
}
