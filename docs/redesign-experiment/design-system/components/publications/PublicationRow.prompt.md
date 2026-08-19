The four-column publication ledger row (year | title·authors·tags | journal | link·cite) — the reason this direction was chosen. Whole row is the hover target.

```jsx
<PublicationRow pub={pub} density="comfortable" onOpen={openPaper} />
<PublicationRow pub={pub} density="compact" />   {/* one scanning line */}
<PublicationRow pub={pub} variant="home" />      {/* Home recent-work */}
<PublicationRow pub={pub} narrow />               {/* <720px: stacked */}
```

Rules: grid is 64/1fr/230/250 gap 28 and never squeezes — below 720px switch to `narrow`. PI name prints in 600 ink inside the author string. DOI/URL verbatim, never uppercased.
