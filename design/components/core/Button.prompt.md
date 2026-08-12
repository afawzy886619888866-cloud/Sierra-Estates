**Button** — the primary action control. Use the gold-gradient `primary` for the single hero action on a view; `secondary`/`ghost` for supporting actions; `danger` for destructive.

```jsx
<Button variant="primary" size="lg" iconLeft={<i data-lucide="sliders-horizontal" />}>
  Search · 1,500
</Button>
<Button variant="secondary">Save search</Button>
<Button variant="ghost" size="sm">Reset</Button>
```

- **variant**: `primary` (gold), `secondary` (outline), `ghost` (subtle fill), `danger` (red)
- **size**: `sm` 34 · `md` 44 · `lg` 54 px — never go below `md` for touch
- **block** stretches full width; **as="a"** for link CTAs
- Labels are UPPERCASE with wide tracking; keep them short (1–3 words).
