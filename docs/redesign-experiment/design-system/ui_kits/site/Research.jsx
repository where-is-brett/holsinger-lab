import React from "react";
import { SectionRail } from "../../components/structure/SectionRail.jsx";
import { PageTitle } from "../../components/structure/PageTitle.jsx";
import { PI_EMAIL } from "./LabData.jsx";

function Narrative({ kicker, accentTags, title, body, figureLabel }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "0 var(--spacing-gutter-lg)", alignItems: "start" }}>
      <div>
        <div style={{ font: "500 11px/1.6 var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--sem-text-faint)" }}>
          {kicker} — <span style={{ color: "var(--sem-link)" }}>{accentTags}</span>
        </div>
        <h2 style={{
          margin: "16px 0 0", fontSize: "var(--text-heading)", lineHeight: "var(--text-heading--line-height)",
          fontWeight: 600, letterSpacing: "var(--text-heading--letter-spacing)", maxWidth: 640, textWrap: "pretty",
        }}>{title}</h2>
        <p style={{ margin: "22px 0 0", fontSize: "var(--text-lead)", lineHeight: 1.7, maxWidth: 680, textWrap: "pretty" }}>{body}</p>
      </div>
      <div style={{
        height: 230, boxSizing: "border-box", border: "1px solid var(--sem-rule)",
        background: "repeating-linear-gradient(45deg, transparent 0 12px, color-mix(in oklab, var(--sem-text) 4.5%, transparent) 12px 13px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px",
      }}>
        <span style={{ font: "400 11px/1.6 var(--font-mono)", color: "var(--sem-text-faint)", textAlign: "center" }}>{figureLabel}</span>
      </div>
    </div>
  );
}

export function ResearchScreen() {
  return (
    <div>
      <PageTitle title="Research" meta="2 ACTIVE PROJECTS" />

      {/* 01 Gut–brain — overview text verbatim from the project record */}
      <SectionRail num="01" label="Gut–brain" padTop="48px">
        <Narrative
          kicker="Since 2023 · Non-pharmacological interventions"
          accentTags="Gut · Brain · Microbiome"
          title="Involvement of gut microbiota in Alzheimer's disease"
          body="The gut microbiome has been implicated in numerous neurodegenerative diseases. We were the first to demonstrate that modulation of the gut microbiome of Alzheimer's disease (AD) mice results in improved cognition and pathology (Left - non-treated; Right - treated for 7 days). We are now investigating mechanisms driving these changes in the brain as they will highlight therapeutic avenues for disease modification."
          figureLabel="[ project figure — brain pathology, left non-treated · right treated 7 days ]"
        />
      </SectionRail>

      {/* 02 Glia */}
      <SectionRail num="02" label="Glia" padTop="48px">
        <Narrative
          kicker="Since 2018"
          accentTags="Astrocytes · Microglia"
          title="Glial activity as a marker of disease"
          body="Astrocytes and microglia play an important role in the maintenance of a homestatic environment in the brain. They aid in the clearance of dead and dying cells, preventing inflammatory reactions in the brain. During Alzheimer's disease, these two classes of cells turn rogue and contribute to disease pathology."
          figureLabel="[ project figure — glial imaging, from project record ]"
        />
      </SectionRail>

      {/* 03 Enquiries — inverse band; example wording, no positions list */}
      <SectionRail num="03" label="Enquiries" inverse>
        <div style={{ fontSize: 23, lineHeight: 1.45, fontWeight: 500, maxWidth: 880, textWrap: "pretty" }}>
          Student and collaboration enquiries are welcome —{" "}
          <a className="hl-link-inverse hl-identifier" href={"mailto:" + PI_EMAIL} style={{ font: "500 20px/1.4 var(--font-mono)", textDecoration: "underline", textUnderlineOffset: 5 }}>{PI_EMAIL}</a>
        </div>
        <div style={{ marginTop: 14, font: "400 10px/1.6 var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--sem-text-inverse-muted)" }}>
          Example wording — for the lab to confirm (agreed-IA §6.6). No positions list to keep current.
        </div>
      </SectionRail>
    </div>
  );
}
