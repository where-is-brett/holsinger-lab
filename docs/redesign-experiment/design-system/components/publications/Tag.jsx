import React from "react";

export function Tag({ children, href, onClick }) {
  const style = {
    font: "500 10.5px/1 var(--font-mono)", letterSpacing: "0.1em",
    textTransform: "uppercase", padding: "8px 13px", display: "inline-block", whiteSpace: "nowrap",
    border: "1px solid var(--sem-rule-strong)", color: "var(--sem-text-muted)",
  };
  if (href || onClick) return <a href={href || "#"} onClick={onClick} style={style}>{children}</a>;
  return <span style={style}>{children}</span>;
}
