Mobile (390) site header with a MENU toggle that opens a full-width sheet of numbered 56px nav rows. Parent owns the open state.

```jsx
const [open, setOpen] = React.useState(false);
<MobileHeader open={open} onToggle={() => setOpen(!open)} current="home" />
```

The MENU/CLOSE button rides the full 48px header band, so every touch target is ≥44px.
