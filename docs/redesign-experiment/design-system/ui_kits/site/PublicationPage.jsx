import React from "react";
import { SectionRail } from "../../components/structure/SectionRail.jsx";
import { Tag } from "../../components/publications/Tag.jsx";
import { CopyCitation } from "../../components/publications/CopyCitation.jsx";
import { PUBLICATIONS, CBX7_ABSTRACT } from "./LabData.jsx";

/* One page per paper. Shown: CBX7, Cell Death Discovery 2025.
   CBX7 has no linked resource, so agreed-IA block 6 is honestly
   absent — the linked-resource block appears on the Biomedicines
   '24 chamber paper, mirroring Home block 03. */
export function PublicationPage({ navigate }) {
  const pub = PUBLICATIONS[0];
  const go = (id) => (e) => { e.preventDefault(); navigate(id); };
  return (
    <div>
      {/* 01 Paper */}
      <SectionRail num="01" label="Paper" borderTop={false}>
        <a href="#pubs" onClick={go("pubs")} style={{ font: "500 11px/1 var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--sem-link)" }}>← All publications</a>
        <h1 style={{
          margin: "26px 0 0", fontSize: "2.3125rem", lineHeight: 1.22, fontWeight: 600,
          letterSpacing: "-0.012em", maxWidth: 1060, textWrap: "pretty",
        }}>{pub.title}</h1>
        <p style={{ margin: "20px 0 0", fontSize: 16, lineHeight: 1.6, color: "var(--sem-text-muted)", maxWidth: 900 }}>
          {pub.authorsPre}<strong style={{ fontWeight: 600, color: "var(--sem-text)" }}>{pub.authorsPI}</strong>{pub.authorsPost}
        </p>
        <div style={{ marginTop: 18, font: "400 13px/1.6 var(--font-mono)", color: "var(--sem-text-muted)" }}>
          {pub.journal} · {pub.ref} · {pub.date}
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          <Tag>{pub.type}</Tag>
          {pub.topics.map((t) => <Tag key={t}>{t}</Tag>)}
        </div>
      </SectionRail>

      {/* 02 Abstract */}
      <SectionRail num="02" label="Abstract" padTop="40px">
        {CBX7_ABSTRACT.map((para, i) => (
          <p key={i} style={{
            margin: i === 0 ? 0 : "16px 0 0", fontSize: "var(--text-lead)",
            lineHeight: 1.7, maxWidth: 840, textWrap: "pretty",
          }}>{para}</p>
        ))}
      </SectionRail>

      {/* 03 Cite & access */}
      <SectionRail num="03" label="Cite & access" padTop="40px">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "0 var(--spacing-gutter-lg)", alignItems: "start" }}>
          <div>
            <div style={{ font: "500 10px/1 var(--font-mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--sem-text-faint)" }}>Canonical link — DOI</div>
            <a className="hl-link hl-identifier" href={pub.linkHref} style={{ display: "inline-block", marginTop: 14, font: "500 15px/1.5 var(--font-mono)", wordBreak: "break-all" }}>{pub.linkHref}</a>
            <div style={{ marginTop: 14, font: "400 11px/1.7 var(--font-mono)", letterSpacing: "0.02em", textTransform: "uppercase", color: "var(--sem-text-faint)", maxWidth: 380 }}>
              The DOI is the paper's permanent address. For the 9 papers without one, the recorded publisher URL stands in.
            </div>
          </div>
          <div>
            <div style={{ font: "500 10px/1 var(--font-mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--sem-text-faint)" }}>Formatted citation</div>
            <div style={{ marginTop: 14, border: "1px solid var(--sem-rule)", padding: "20px 22px" }}>
              <div className="hl-identifier" style={{ font: "400 12.5px/1.75 var(--font-mono)" }}>{pub.cite}</div>
              <div style={{ marginTop: 16 }}>
                <CopyCitation cite={pub.cite} copiedLabel="✓ COPIED — CITATION ON CLIPBOARD" />
              </div>
            </div>
          </div>
        </div>
      </SectionRail>
    </div>
  );
}
