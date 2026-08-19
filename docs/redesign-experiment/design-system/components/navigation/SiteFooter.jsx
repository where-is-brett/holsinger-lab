import React from "react";

export function SiteFooter({ compact = false }) {
  return (
    <footer style={{
      display: "flex",
      flexDirection: compact ? "column" : "row",
      justifyContent: "space-between",
      gap: compact ? 5 : 24,
      padding: compact ? "14px var(--spacing-gutter) 18px" : "20px 2rem 26px",
      borderTop: "1px solid var(--sem-rule)",
      font: compact ? "400 8.5px/1.4 var(--font-mono)" : "400 11px/1 var(--font-mono)",
      letterSpacing: "0.08em", textTransform: "uppercase",
      color: "var(--sem-text-faint)",
    }}>
      <span>Designed by Brett Yang</span>
      <span>Copyright 2026 © Holsinger Lab</span>
    </footer>
  );
}
