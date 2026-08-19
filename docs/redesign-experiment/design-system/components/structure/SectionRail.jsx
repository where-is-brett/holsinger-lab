import React from "react";

export function SectionRail({ num, label, inverse = false, borderTop = true, pad = true, padTop = "var(--spacing-stack)", children }) {
  const rule = inverse ? "var(--sem-rule-inverse)" : "var(--sem-rule)";
  return (
    <section style={{
      display: "grid", gridTemplateColumns: "var(--spacing-rail) 1fr",
      background: inverse ? "var(--sem-surface-inverse)" : "transparent",
      color: inverse ? "var(--sem-text-inverse)" : "inherit",
      borderTop: borderTop && !inverse ? "1px solid var(--sem-rule)" : "none",
    }}>
      <div style={{
        borderRight: "1px solid " + rule, display: "flex", flexDirection: "column",
        alignItems: "center", paddingTop: padTop, gap: 18,
      }}>
        {num && <span style={{
          font: "500 13px/1 var(--font-mono)",
          color: inverse ? "var(--sem-link-inverse)" : "var(--sem-accent)",
        }}>{num}</span>}
        {label && <span style={{
          writingMode: "vertical-rl", transform: "rotate(180deg)",
          font: "400 10px/1 var(--font-mono)", letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: inverse ? "var(--sem-text-inverse-muted)" : "var(--sem-text-faint)",
        }}>{label}</span>}
      </div>
      <div style={pad ? {
        padding: "var(--spacing-stack) var(--spacing-gutter-lg) var(--spacing-stack-lg) var(--spacing-gutter-md)",
      } : undefined}>{children}</div>
    </section>
  );
}
