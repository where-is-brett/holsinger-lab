import React from "react";

export function CopyCitation({ cite, compact = false, copiedLabel }) {
  const [copied, setCopied] = React.useState(false);
  const t = React.useRef(null);
  const onCopy = () => {
    try { if (navigator.clipboard) navigator.clipboard.writeText(cite); } catch (e) { }
    clearTimeout(t.current);
    setCopied(true);
    t.current = setTimeout(() => setCopied(false), 1800);
  };
  const border = copied ? "var(--sem-link)" : "var(--sem-rule-strong)";
  const color = copied ? "var(--sem-link)" : "var(--sem-text-muted)";
  const style = compact
    ? { font: "500 9px/1 var(--font-mono)", letterSpacing: "0.1em", padding: "4px 7px", border: "1px solid " + border, color, flexShrink: 0 }
    : { font: "500 10px/1 var(--font-mono)", letterSpacing: "0.12em", padding: "8px 12px", border: "1px solid " + border, color };
  return (
    <button type="button" className="hl-press" onClick={onCopy} style={style}>
      {compact ? (copied ? "✓" : "CITE") : (copied ? (copiedLabel || "✓ COPIED") : "COPY CITATION")}
    </button>
  );
}
