Numbered section rail — the structural signature of every page. Each content block is a `[rail | content]` grid: accent block number, vertical mono-caps label, hairline on the rail's right edge.

```jsx
<SectionRail num="02" label="Recent work">
  …block content…
</SectionRail>
<SectionRail num="04" label="Outreach" inverse>
  …dark band content…
</SectionRail>
```

`pad={false}` when the block manages its own padding (e.g. full-width row lists). Inverse bands have no top hairline — the background change is the separator.
