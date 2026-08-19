import React from "react";

export function FacetChip({ label, count, on = false, onClick }) {
  return (
    <button type="button" className="hl-press" onClick={onClick} aria-pressed={on} style={{
      font: "500 11px/1 var(--font-mono)", letterSpacing: "0.08em",
      padding: "8px 13px", whiteSpace: "nowrap",
      border: "1px solid " + (on ? "var(--sem-surface-inverse)" : "var(--sem-rule-strong)"),
      background: on ? "var(--sem-surface-inverse)" : "transparent",
      color: on ? "var(--sem-text-inverse)" : "var(--sem-text-muted)",
    }}>
      {label}{count != null && <span style={{ opacity: 0.55 }}> {count}</span>}
    </button>
  );
}
