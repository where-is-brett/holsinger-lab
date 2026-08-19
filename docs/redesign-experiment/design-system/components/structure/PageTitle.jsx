import React from "react";

export function PageTitle({ title, meta, accentMeta = false }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "var(--spacing-rail) 1fr" }}>
      <div style={{ borderRight: "1px solid var(--sem-rule)" }}></div>
      <div style={{
        padding: "var(--spacing-stack) var(--spacing-gutter-lg) 30px var(--spacing-gutter-md)",
        display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24,
      }}>
        <h1 style={{
          margin: 0, fontSize: "var(--text-title)",
          lineHeight: 1, fontWeight: 600,
          letterSpacing: "var(--text-title--letter-spacing)",
        }}>{title}</h1>
        {meta && <span style={{
          font: "400 12px/1 var(--font-mono)", letterSpacing: "0.1em",
          textTransform: "uppercase", flexShrink: 0,
          color: accentMeta ? "var(--sem-link)" : "var(--sem-text-faint)",
        }}>{meta}</span>}
      </div>
    </div>
  );
}
