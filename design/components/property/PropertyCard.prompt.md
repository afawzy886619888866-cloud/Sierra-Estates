**PropertyCard** — the flagship listing card. Use it in listing grids and map result panels. Composes photo + SBR code + listing badge + live AI score + save heart, then title/price/specs.

```jsx
<PropertyCard
  image="https://…/villa.jpg"
  code="MV-VL-02"
  title="Villa Lumière"
  location="Mountain View · 5th Settlement"
  price="EGP 14.2M"
  badge="Featured" badgeColor="#C8961A"
  aiScore={9.6}
  beds={5} baths={4} area={480}
  saved={false} onSave={(s) => save(s)}
/>
```

- Hover lifts the card, glows the border gold and zooms the photo (all via CSS).
- `badgeColor` matches the listing's badge hue from the data (gold/red/blue/violet…).
- Prices use `EGP …M` for resale and `EGP …K/yr` for rent — always mono.
- Omit any optional field to hide that element.
