import React from "react";
import { SectionRail } from "../../components/structure/SectionRail.jsx";
import { PageTitle } from "../../components/structure/PageTitle.jsx";
import { PersonCard } from "../../components/people/PersonCard.jsx";
import { PEOPLE_GROUPS, PI_BIO, PI_EMAIL, PI_IMG } from "./LabData.jsx";

export function PeopleScreen() {
  return (
    <div>
      <PageTitle title="People" meta="LAB HEAD + 19 CURRENT MEMBERS · 6 GROUPS" />

      {/* 01 Lab head */}
      <SectionRail num="01" label="Lab head">
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "0 44px", alignItems: "start" }}>
          <img className="hl-portrait" src={PI_IMG} alt="Dr Damian Holsinger" style={{ width: 220, aspectRatio: "4 / 5", objectFit: "cover", background: "var(--sem-surface-raised)" }} />
          <div className="hl-person">
            <div style={{ font: "500 10px/1 var(--font-mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--sem-text-faint)" }}>Head of laboratory · Principal investigator</div>
            <h2 style={{ margin: "12px 0 0", fontSize: "var(--text-heading)", lineHeight: 1.1, fontWeight: 600, letterSpacing: "-0.01em" }}>Dr Damian Holsinger</h2>
            {PI_BIO.map((para, i) => (
              <p key={i} style={{ margin: i === 0 ? "22px 0 0" : "14px 0 0", fontSize: "var(--text-body)", lineHeight: 1.65, color: "var(--sem-text-muted)", maxWidth: 720, textWrap: "pretty" }}>{para}</p>
            ))}
            <a className="hl-link hl-identifier" href={"mailto:" + PI_EMAIL} style={{ display: "inline-block", marginTop: 20, font: "400 12.5px/1 var(--font-mono)" }}>{PI_EMAIL}</a>
          </div>
        </div>
      </SectionRail>

      {/* 02 Members — six role groups */}
      <SectionRail num="02" label="Members" pad={false}>
        <div style={{ padding: "var(--spacing-stack) var(--spacing-gutter-lg) 24px var(--spacing-gutter-md)" }}>
          {PEOPLE_GROUPS.map((g, gi) => (
            <div key={g.label} style={{ paddingBottom: 36 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, borderTop: "1px solid var(--sem-rule)", paddingTop: 18, marginBottom: 20 }}>
                <span style={{ font: "500 12px/1 var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{g.label}</span>
                <span style={{ font: "400 12px/1 var(--font-mono)", color: "var(--sem-link)" }}>{g.count}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "28px 24px" }}>
                {g.members.map((m) => (
                  <PersonCard key={m.name} name={m.name} role={m.role} img={m.img} initials={m.initials} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionRail>

      {/* 03 Alumni — inline list, kept honest */}
      <SectionRail num="03" label="Alumni" padTop="40px">
        <div style={{ font: "500 12px/1 var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Recent lab alumni</div>
        <div style={{
          border: "1px solid var(--sem-rule)", padding: 26, maxWidth: 820, boxSizing: "border-box",
          background: "repeating-linear-gradient(45deg, transparent 0 12px, color-mix(in oklab, var(--sem-text) 4.5%, transparent) 12px 13px)",
        }}>
          <span style={{ font: "400 11px/1.7 var(--font-mono)", color: "var(--sem-text-faint)" }}>
            [ alumni name list — a plain inline run of names, comma-separated, in this position. Names to be supplied by the lab. Kept honest: names only, no invented years or degrees (agreed-IA §6.5). ]
          </span>
        </div>
      </SectionRail>
    </div>
  );
}
