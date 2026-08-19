import React from "react";

export function FormField({ label, hint, type = "text", textarea = false, rows = 5, placeholder, value, onChange, disabled = false, name }) {
  const inputStyle = {
    display: "block", width: "100%", boxSizing: "border-box", marginTop: 10,
    background: "transparent", border: "1px solid var(--sem-field)", borderRadius: 0,
    padding: "12px 14px", font: "400 15px/1.5 var(--font-sans)",
    color: "var(--sem-text)", minHeight: 44, resize: "vertical",
  };
  const id = name || (label || "field").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div>
      <label htmlFor={id} style={{
        display: "block", font: "500 10px/1 var(--font-mono)",
        letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--sem-text-faint)",
      }}>{label}</label>
      {textarea
        ? <textarea className="hl-field-input" id={id} name={id} rows={rows} placeholder={placeholder} value={value} onChange={onChange} disabled={disabled} style={inputStyle}></textarea>
        : <input className="hl-field-input" id={id} name={id} type={type} placeholder={placeholder} value={value} onChange={onChange} disabled={disabled} style={inputStyle} />}
      {hint && <div style={{ marginTop: 8, font: "400 10px/1.6 var(--font-mono)", letterSpacing: "0.06em", color: "var(--sem-text-faint)" }}>{hint}</div>}
    </div>
  );
}
