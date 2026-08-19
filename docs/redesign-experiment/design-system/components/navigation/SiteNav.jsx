import React from "react";

export const NAV_ITEMS = [
  { id: "home", label: "Home" },
  { id: "pubs", label: "Publications" },
  { id: "research", label: "Research" },
  { id: "resources", label: "Resources" },
  { id: "people", label: "People" },
  { id: "lab", label: "Lab" },
];

export function SiteNav({ current, items = NAV_ITEMS, onNavigate }) {
  const go = (id) => (e) => { if (onNavigate) { e.preventDefault(); onNavigate(id); } };
  return (
    <header style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      height: "var(--nav-height)", boxSizing: "border-box", padding: "0 2rem",
      borderBottom: "1px solid var(--sem-rule)", gap: 24,
    }}>
      <a href="#home" onClick={go("home")} style={{
        font: "500 12px/1 var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase",
      }}>Holsinger Lab — The University of Sydney</a>
      <nav style={{
        display: "flex", gap: 28,
        font: "400 12px/1 var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase",
      }}>
        {items.map((it) => (
          <a key={it.id} className="hl-navlink" href={"#" + it.id} onClick={go(it.id)}
            aria-current={current === it.id ? "page" : undefined}>{it.label}</a>
        ))}
      </nav>
    </header>
  );
}
