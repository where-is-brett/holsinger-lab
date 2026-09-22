import React from "react";
import { SectionRail } from "../../components/structure/SectionRail.jsx";
import { PageTitle } from "../../components/structure/PageTitle.jsx";
import { FacetBand } from "../../components/publications/FacetBand.jsx";
import { PublicationRow } from "../../components/publications/PublicationRow.jsx";
import { PUBLICATIONS } from "./LabData.jsx";

const YEARS = ["2025", "2024", "2023", "2022", "2021", "2020"];
const TYPES = ["Article", "Review", "Case report"];

export function PublicationsIndex({ navigate }) {
  const [fy, setFy] = React.useState(null);
  const [ft, setFt] = React.useState(null);
  const [fp, setFp] = React.useState(null);
  const [dens, setDens] = React.useState("COMFORTABLE");

  const count = (key) => {
    const m = {};
    PUBLICATIONS.forEach((p) => {
      const v = key === "topics" ? p.topics[0] : p[key];
      m[v] = (m[v] || 0) + 1;
    });
    return m;
  };
  const yc = count("year"), tc = count("type"), pc = count("topics");
  const topics = Object.keys(pc).sort();
  const rows = PUBLICATIONS.filter((p) =>
    (!fy || p.year === fy) && (!ft || p.type === ft) && (!fp || p.topics.indexOf(fp) >= 0));
  const filtered = fy || ft || fp;

  return (
    <div>
      <PageTitle
        title="Publications"
        meta={filtered ? rows.length + " OF 19 RECORDS SHOWN" : "19 RECORDS · 2020–2025"}
        accentMeta={!!filtered}
      />
      {/* 01 Filter — sticky at top: 0 (header is not sticky in this
          direction; against a sticky header use var(--nav-height)) */}
      <FacetBand
        num="01" label="Filter"
        groups={[
          { label: "Year", chips: YEARS.map((y) => ({ label: y, count: yc[y], on: fy === y, onClick: () => setFy(fy === y ? null : y) })) },
          { label: "Type", chips: TYPES.map((t) => ({ label: t, count: tc[t], on: ft === t, onClick: () => setFt(ft === t ? null : t) })) },
          { label: "Topic", chips: topics.map((t) => ({ label: t, count: pc[t], on: fp === t, onClick: () => setFp(fp === t ? null : t) })) },
        ]}
        density={{ options: ["COMFORTABLE", "COMPACT"], value: dens, onChange: setDens }}
        note="CLICK TO FILTER · CLICK AGAIN TO CLEAR — AN UNTAGGED PAPER STILL APPEARS UNDER YEAR AND TYPE · COMPACT TIGHTENS EACH ROW TO ONE SCANNING LINE"
      />
      {/* 02 Record — one long scroll; growth changes page height, never composition */}
      <SectionRail num="02" label="Record" borderTop={false} pad={false} padTop="32px">
        <div style={{ padding: "32px var(--spacing-gutter-lg) var(--spacing-stack-lg) var(--spacing-gutter-md)" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "64px 1fr 230px 250px", gap: "0 28px", paddingBottom: 12,
            font: "500 11px/1 var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--sem-text-faint)",
          }}>
            <span>Year</span><span>Title · Authors · Tags</span><span>Journal</span><span>Link · Cite</span>
          </div>
          {rows.map((p) => (
            <PublicationRow key={p.linkHref} pub={p}
              density={dens === "COMPACT" ? "compact" : "comfortable"}
              onOpen={() => navigate("paper")} />
          ))}
        </div>
      </SectionRail>
    </div>
  );
}
