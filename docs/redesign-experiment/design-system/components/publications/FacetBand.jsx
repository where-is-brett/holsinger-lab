import React from "react";
import { FacetChip } from "./FacetChip.jsx";

/* Sticky facet band. In this direction the header is NOT sticky, so
   the band pins at top: 0 and the record scrolls beneath it. If the
   app keeps a sticky header, the offset MUST be var(--nav-height) —
   never a hardcoded pixel value (app token contract). */
export function FacetBand({ groups = [], density, note, sticky = true, num = "01", label = "Filter" }) {
  const row = { display: "grid", gridTemplateColumns: "72px 1fr", gap: "0 20px", alignItems: "start" };
  const rowLabel = {
    font: "500 10px/2.6 var(--font-mono)", letterSpacing: "0.14em",
    textTransform: "uppercase", color: "var(--sem-text-faint)",
  };
  return (
    <div style={{
      position: sticky ? "sticky" : "static", top: 0, zIndex: 5,
      background: "var(--sem-surface)",
      display: "grid", gridTemplateColumns: "var(--spacing-rail) 1fr",
      borderTop: "1px solid var(--sem-rule)", borderBottom: "1px solid var(--sem-rule)",
    }}>
      <div style={{
        borderRight: "1px solid var(--sem-rule)", display: "flex", flexDirection: "column",
        alignItems: "center", paddingTop: 32, gap: 18,
      }}>
        <span style={{ font: "500 13px/1 var(--font-mono)", color: "var(--sem-accent)" }}>{num}</span>
        <span style={{
          writingMode: "vertical-rl", transform: "rotate(180deg)",
          font: "400 10px/1 var(--font-mono)", letterSpacing: "0.22em",
          textTransform: "uppercase", color: "var(--sem-text-faint)",
        }}>{label}</span>
      </div>
      <div style={{
        padding: "32px var(--spacing-gutter-lg) 36px var(--spacing-gutter-md)",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        {groups.map((g) => (
          <div key={g.label} style={row}>
            <span style={rowLabel}>{g.label}</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {g.chips.map((c) => <FacetChip key={c.label} {...c} />)}
            </div>
          </div>
        ))}
        {density && (
          <div style={Object.assign({}, row, { alignItems: "center", borderTop: "1px solid var(--sem-rule)", paddingTop: 12 })}>
            <span style={Object.assign({}, rowLabel, { lineHeight: 1 })}>Density</span>
            <div style={{ display: "flex", gap: 8 }}>
              {density.options.map((d) => (
                <FacetChip key={d} label={d} on={density.value === d} onClick={() => density.onChange(d)} />
              ))}
            </div>
          </div>
        )}
        {note && <div style={{
          font: "400 10px/1.5 var(--font-mono)", letterSpacing: "0.08em",
          textTransform: "uppercase", color: "var(--sem-text-faint)",
        }}>{note}</div>}
      </div>
    </div>
  );
}
