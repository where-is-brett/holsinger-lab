import React from "react";

export function Button({ children, onClick, href, disabled = false, active = false }) {
  const style = {
    display: "inline-block",
    font: "500 10px/1 var(--font-mono)", letterSpacing: "0.12em",
    textTransform: "uppercase", padding: "9px 14px",
    border: "1px solid " + (active ? "var(--sem-link)" : "var(--sem-rule-strong)"),
    color: active ? "var(--sem-link)" : "var(--sem-text-muted)",
    background: "transparent",
  };
  if (href && !disabled) return <a className="hl-press" href={href} style={style}>{children}</a>;
  return <button type="button" className="hl-press" onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}
