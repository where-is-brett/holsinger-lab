Sticky facet band for the publications index — Year/Type/Topic chip rows with live counts, plus the density toggle. Parent owns all filter state.

```jsx
<FacetBand
  groups={[
    { label: "Year", chips: years.map((y) => ({ label: y, count: counts[y], on: fy === y, onClick: () => toggle(y) })) },
  ]}
  density={{ options: ["COMFORTABLE", "COMPACT"], value: dens, onChange: setDens }}
  note="CLICK TO FILTER · CLICK AGAIN TO CLEAR"
/>
```

Sticky at `top: 0` because the header scrolls away; against a sticky header, position with `var(--nav-height)`.
