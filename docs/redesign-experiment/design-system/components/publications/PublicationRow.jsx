import React from "react";
import { CopyCitation } from "./CopyCitation.jsx";

/* The load-bearing component of the direction. Four-column ledger
   anatomy: year | title·authors·tags | journal | link·cite on the
   normalized grid 64px / 1fr / 230px / 250px, gap 28px.
   Column behaviour at narrow widths (<720px container): the grid
   does NOT squeeze — switch to `narrow`, which stacks each row:
   line 1 = year + journal ref (mono), line 2 = title, line 3 =
   link (single line, ellipsized). Authors, tags and the copy
   control yield to the publication page. */

const GRID = { display: "grid", gridTemplateColumns: "64px 1fr 230px 250px", gap: "0 28px" };

export function PublicationRow({ pub, density = "comfortable", variant = "index", narrow = false, onOpen }) {
  const open = (e) => { if (onOpen) { e.preventDefault(); onOpen(pub); } };
  const year = (extra) => (
    <span style={Object.assign({ font: "500 13px/1.5 var(--font-mono)", color: "var(--sem-accent)" }, extra)}>{pub.year}</span>
  );
  const link = (fontSize) => (
    <span style={{ font: "400 " + fontSize + "px/1.5 var(--font-mono)", wordBreak: "break-all" }}>
      <span style={{ color: "var(--sem-text-faint)" }}>{pub.linkKind} </span>
      <a className="hl-link hl-identifier" href={pub.linkHref}>{pub.linkLabel}</a>
    </span>
  );

  if (narrow) {
    return (
      <div style={{ padding: "13px 0", borderTop: "1px solid var(--sem-rule)" }}>
        <div style={{ font: "500 10px/1.4 var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          <span style={{ color: "var(--sem-accent)" }}>{pub.year}</span>
          <span style={{ color: "var(--sem-text-faint)" }}> — {pub.journal} {pub.ref}</span>
        </div>
        <a href="#paper" onClick={open} style={{ display: "block", marginTop: 6, fontSize: 14.5, lineHeight: 1.4, fontWeight: 600, textWrap: "pretty" }}>{pub.title}</a>
        <div style={{ marginTop: 6, font: "400 9.5px/1.4 var(--font-mono)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <span style={{ color: "var(--sem-text-faint)" }}>{pub.linkKind} </span>
          <a className="hl-link hl-identifier" href={pub.linkHref}>{pub.linkLabel}</a>
        </div>
      </div>
    );
  }

  if (variant === "home") {
    return (
      <div className="hl-row" style={Object.assign({ padding: "var(--spacing-row) 0", borderTop: "1px solid var(--sem-rule)", alignItems: "baseline" }, GRID)}>
        {year()}
        <a className="hl-row-title" href="#paper" onClick={open} style={{ fontSize: 17.5, lineHeight: 1.35, fontWeight: 600, letterSpacing: "-0.005em", textWrap: "pretty", paddingRight: 12 }}>{pub.title}</a>
        <span style={{ font: "400 12.5px/1.5 var(--font-mono)", color: "var(--sem-text-muted)" }}>{pub.journal} {pub.ref}</span>
        {link(12)}
      </div>
    );
  }

  if (density === "compact") {
    return (
      <div className="hl-row" style={Object.assign({ padding: "10px 0", borderTop: "1px solid var(--sem-rule)", alignItems: "baseline" }, GRID)}>
        {year({ font: "500 12px/1.5 var(--font-mono)" })}
        <a className="hl-row-title" href="#paper" onClick={open} style={{ display: "block", fontSize: 14.5, lineHeight: 1.5, fontWeight: 600, letterSpacing: "-0.005em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 12 }}>{pub.title}</a>
        <span style={{ font: "400 11.5px/1.6 var(--font-mono)", color: "var(--sem-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pub.journal} · {pub.ref}</span>
        <span style={{ display: "flex", alignItems: "baseline", gap: 10, font: "400 11px/1.6 var(--font-mono)", whiteSpace: "nowrap" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ color: "var(--sem-text-faint)" }}>{pub.linkKind} </span>
            <a className="hl-link hl-identifier" href={pub.linkHref}>{pub.linkLabelShort || pub.linkLabel}</a>
          </span>
          <CopyCitation cite={pub.cite} compact />
        </span>
      </div>
    );
  }

  return (
    <div className="hl-row" style={Object.assign({ padding: "var(--spacing-row) 0", borderTop: "1px solid var(--sem-rule)", alignItems: "start" }, GRID)}>
      {year()}
      <div style={{ display: "flex", flexDirection: "column", gap: 7, paddingRight: 12 }}>
        <a className="hl-row-title" href="#paper" onClick={open} style={{ fontSize: 17.5, lineHeight: 1.35, fontWeight: 600, letterSpacing: "-0.005em", textWrap: "pretty" }}>{pub.title}</a>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--sem-text-muted)" }}>
          {pub.authorsPre}<strong style={{ fontWeight: 600, color: "var(--sem-text)" }}>{pub.authorsPI}</strong>{pub.authorsPost}
        </div>
        <div style={{ font: "500 10px/1.6 var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--sem-text-faint)" }}>
          {pub.type}{pub.topics && pub.topics.length ? " · " + pub.topics.join(" · ") : ""}
        </div>
      </div>
      <div style={{ font: "400 12.5px/1.6 var(--font-mono)", color: "var(--sem-text-muted)" }}>
        {pub.journal}<br />{pub.ref}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
        {link(11.5)}
        <CopyCitation cite={pub.cite} />
      </div>
    </div>
  );
}
