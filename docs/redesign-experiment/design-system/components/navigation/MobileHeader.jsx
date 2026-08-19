import React from "react";
import { NAV_ITEMS } from "./SiteNav.jsx";

export function MobileHeader({ open = false, onToggle, current, items = NAV_ITEMS, onNavigate }) {
  const go = (id) => (e) => { if (onNavigate) { e.preventDefault(); onNavigate(id); } };
  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "stretch",
        height: 48, boxSizing: "border-box", padding: "0 var(--spacing-gutter)",
        borderBottom: "1px solid var(--sem-rule)",
      }}>
        <span style={{
          alignSelf: "center", font: "500 9.5px/1 var(--font-mono)",
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}>Holsinger Lab — USYD</span>
        {/* The toggle rides the full 48px header band — target >= 44px */}
        <button type="button" onClick={onToggle} aria-expanded={open} style={{
          display: "flex", alignItems: "center", padding: "0 4px",
          font: "500 9.5px/1 var(--font-mono)", letterSpacing: "0.14em",
          color: "var(--sem-link)",
        }}>{open ? "CLOSE ✕" : "MENU"}</button>
      </div>
      {open && (
        <div>
          <nav style={{ display: "flex", flexDirection: "column" }}>
            {items.map((it, i) => (
              <a key={it.id} href={"#" + it.id} onClick={go(it.id)}
                aria-current={current === it.id ? "page" : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 16, minHeight: 56,
                  padding: "0 var(--spacing-gutter)", boxSizing: "border-box",
                  borderBottom: "1px solid var(--sem-rule)",
                  font: "500 14px/1 var(--font-mono)", letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: current === it.id ? "var(--sem-link)" : "inherit",
                }}>
                <span style={{ font: "500 10px/1 var(--font-mono)", color: "var(--sem-text-faint)", width: 18 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {it.label}
              </a>
            ))}
          </nav>
          <div style={{
            padding: "16px var(--spacing-gutter) 20px",
            font: "400 8.5px/1.5 var(--font-mono)", letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--sem-text-faint)",
          }}>The University of Sydney</div>
        </div>
      )}
    </div>
  );
}
