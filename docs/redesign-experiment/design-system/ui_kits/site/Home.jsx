import React from "react";
import { SectionRail } from "../../components/structure/SectionRail.jsx";
import { PublicationRow } from "../../components/publications/PublicationRow.jsx";
import { ResourceBlock } from "../../components/content/ResourceBlock.jsx";
import { PUBLICATIONS, PI_EMAIL, PI_IMG } from "./LabData.jsx";

const LABEL = { font: "500 11px/1 var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--sem-text-faint)" };
const GRID_HEAD = {
  display: "grid", gridTemplateColumns: "64px 1fr 230px 250px", gap: "0 28px", paddingBottom: 12,
  font: "500 11px/1 var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--sem-text-faint)",
};

export function HomeScreen({ navigate }) {
  const go = (id) => (e) => { e.preventDefault(); navigate(id); };
  return (
    <div>
      {/* 01 Identity — auto-generated, zero editorial fields */}
      <SectionRail num="01" label="Identity" borderTop={false}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ width: 36, height: 1, background: "var(--sem-text)" }}></span>
          <span style={{ font: "500 12px/1 var(--font-mono)", letterSpacing: "0.2em", textTransform: "uppercase" }}>The University of Sydney</span>
        </div>
        <h1 style={{
          margin: "30px 0 0", fontSize: "var(--text-display)", lineHeight: "var(--text-display--line-height)",
          fontWeight: 600, letterSpacing: "var(--text-display--letter-spacing)", maxWidth: 1180, textWrap: "balance",
        }}>Laboratory of Molecular<br />Neuroscience and Dementia</h1>
        <div style={{ marginTop: 38, display: "grid", gridTemplateColumns: "1fr 320px", gap: "0 56px", alignItems: "end" }}>
          <p style={{ margin: 0, fontSize: "var(--text-lead)", lineHeight: 1.6, color: "var(--sem-text-muted)", maxWidth: 560, textWrap: "pretty" }}>
            Advancing the Understanding and Treatment of Neurological Disorders through Molecular Research
          </p>
          <div style={{ borderLeft: "1px solid var(--sem-rule)", paddingLeft: 26 }}>
            <div style={{ font: "500 10px/1 var(--font-mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--sem-text-faint)" }}>Principal investigator</div>
            <div style={{ marginTop: 9, fontSize: 21, fontWeight: 600, letterSpacing: "-0.01em" }}>Dr Damian Holsinger</div>
            <a className="hl-link hl-identifier" href={"mailto:" + PI_EMAIL} style={{ display: "inline-block", marginTop: 7, font: "400 11.5px/1.4 var(--font-mono)" }}>{PI_EMAIL}</a>
          </div>
        </div>
      </SectionRail>

      {/* 02 Recent work — latest 5 by date (auto) */}
      <SectionRail num="02" label="Recent work" pad={false}>
        <div style={{ padding: "var(--spacing-stack) var(--spacing-gutter-lg) var(--spacing-stack) var(--spacing-gutter-md)" }}>
          <div style={GRID_HEAD}>
            <span>Year</span><span>Title</span><span>Journal</span>
            <span style={{ display: "flex", justifyContent: "space-between" }}><span>Link</span><span style={{ letterSpacing: "0.08em" }}>Latest five · by date</span></span>
          </div>
          {PUBLICATIONS.slice(0, 5).map((p) => (
            <PublicationRow key={p.linkHref} pub={p} variant="home" onOpen={() => navigate("paper")} />
          ))}
          <a href="#pubs" onClick={go("pubs")} style={{ display: "inline-block", marginTop: 20, font: "500 12px/1 var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--sem-link)" }}>All 19 publications →</a>
        </div>
      </SectionRail>

      {/* 03 Resource — sole item at launch; do not pad */}
      <SectionRail num="03" label="Resources">
        <ResourceBlock
          title="Electrical-stimulation cell-culture chamber"
          meta={[
            { label: "KIND", value: "Hardware" },
            { label: "SOURCE", value: "Biomedicines 12(2) 289 · 2024" },
            { label: "DOI", value: "10.3390/biomedicines12020289", href: "https://doi.org/10.3390/biomedicines12020289" },
          ]}
          figureLabel="[ chamber unit photo — fig. from Biomedicines 12(2) ]"
        />
      </SectionRail>

      {/* 04 MAESTRO — inverse band */}
      <SectionRail num="04" label="Outreach" inverse>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 64, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 27, lineHeight: 1.25, fontWeight: 600, maxWidth: 640, textWrap: "pretty" }}>MAESTRO — dreaMers And doErs: the Scientists of TomorROw</div>
            <div style={{ marginTop: 12, fontSize: 15, lineHeight: 1.5, color: "var(--sem-text-inverse-muted)" }}>A platform for postgraduate student presentations.</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ font: "500 20px/1.4 var(--font-mono)", color: "var(--sem-link-inverse)" }}>TUE · 10:00 GMT</div>
            <div style={{ marginTop: 10, font: "400 10px/1.6 var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--sem-text-inverse-muted)" }}>
              Example — timing for the lab to confirm (agreed-IA §6.4):<br />a settings field, or dropped if it can't be kept fresh
            </div>
            <a className="hl-identifier" href="https://tinyurl.com/maestrotalks" style={{ display: "inline-block", marginTop: 10, font: "400 12px/1 var(--font-mono)", letterSpacing: "0.08em", color: "var(--sem-text-inverse)", textDecoration: "underline", textUnderlineOffset: 4 }}>REGISTER — tinyurl.com/maestrotalks</a>
          </div>
        </div>
      </SectionRail>

      {/* 05 The lab */}
      <SectionRail num="05" label="The lab">
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "0 48px", alignItems: "start" }}>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <img className="hl-portrait" src={PI_IMG} alt="Dr Damian Holsinger" style={{ width: 64, height: 64, objectFit: "cover", background: "var(--sem-surface-raised)" }} />
            <div>
              <div style={Object.assign({ marginBottom: 10 }, LABEL)}>Principal investigator</div>
              <a href="#people" onClick={go("people")} style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em" }}>Dr Damian Holsinger</a>
            </div>
          </div>
          <div>
            <div style={Object.assign({ marginBottom: 10 }, LABEL)}>Current members</div>
            <a href="#people" onClick={go("people")} style={{ fontSize: 24, fontWeight: 600 }}>19 <span style={{ font: "400 12px/1 var(--font-mono)", color: "var(--sem-text-faint)" }}>— PEOPLE →</span></a>
          </div>
          <div>
            <div style={Object.assign({ marginBottom: 12 }, LABEL)}>Funding</div>
            <a className="hl-link" href="#lab" style={{ font: "500 13px/1.5 var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Support our research →</a>
          </div>
        </div>
      </SectionRail>
    </div>
  );
}
