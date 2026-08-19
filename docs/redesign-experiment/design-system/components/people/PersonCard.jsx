import React from "react";

export function PersonCard({ name, role, img, initials }) {
  return (
    <div className="hl-person">
      {img ? (
        <img className="hl-portrait" src={img} alt={name} style={{
          width: "100%", aspectRatio: "4 / 5", objectFit: "cover", display: "block",
          background: "var(--sem-surface-raised)",
        }} />
      ) : (
        <div style={{
          width: "100%", aspectRatio: "4 / 5", boxSizing: "border-box",
          border: "1px solid var(--sem-rule)",
          background: "repeating-linear-gradient(45deg, transparent 0 12px, color-mix(in oklab, var(--sem-text) 4.5%, transparent) 12px 13px)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <span style={{ font: "500 26px/1 var(--font-mono)", color: "var(--sem-text-muted)" }}>{initials}</span>
          <span style={{ font: "400 8.5px/1.4 var(--font-mono)", letterSpacing: "0.08em", color: "var(--sem-text-faint)" }}>[ NO PORTRAIT ON FILE ]</span>
        </div>
      )}
      <div className="hl-person-name" style={{ marginTop: 10, fontSize: 15, fontWeight: 600, letterSpacing: "-0.005em" }}>{name}</div>
      <div style={{ marginTop: 3, font: "400 10.5px/1.5 var(--font-mono)", color: "var(--sem-text-faint)" }}>{role}</div>
    </div>
  );
}
