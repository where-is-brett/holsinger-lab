Site header for every page: wordmark line ("Holsinger Lab — The University of Sydney") left, six-item mono-caps nav right. Not sticky — it scrolls away with the page.

```jsx
<SiteNav current="pubs" onNavigate={(id) => setRoute(id)} />
```

States: rest = ink; hover = accent + underline (offset 5px); current = accent, no underline (set via `current`, rendered as `aria-current="page"`).
