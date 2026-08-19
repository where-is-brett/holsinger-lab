Copy-citation button — the row-level and page-level citation control. Owns its copied state: rest → active (scale 0.97) → "✓ COPIED" held 1.8s.

```jsx
<CopyCitation cite={pub.cite} />
<CopyCitation cite={pub.cite} compact />  {/* compact rows: CITE / ✓ */}
```
