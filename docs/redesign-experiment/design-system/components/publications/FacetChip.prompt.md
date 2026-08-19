Filter chip with live count for the publications facets (year · type · topic) and the density toggle.

```jsx
<FacetChip label="2023" count={5} on={year === "2023"} onClick={() => toggleYear("2023")} />
```

OFF: hairline border, muted text. ON: ink fill with inverse text. Press: scale 0.97, 140ms ease-out.
