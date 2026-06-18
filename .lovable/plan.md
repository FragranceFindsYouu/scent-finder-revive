## Goal
Add a discreet admin entry point in the footer, blending with the existing aesthetic (cream surface, muted text, rose hover).

## Change
**`src/components/Footer.tsx`**
- Add a tiny "Admin" link in the bottom copyright row, right after the © line.
- Style: same `text-xs text-muted-foreground hover:text-rose` as the surrounding footer text, separated by a soft `·` divider so it feels like a footnote, not a CTA.
- Only render when `useIsAdmin()` returns true — regular visitors never see it.
- Link target: `/admin-dashboard`.

No changes to Header, routes, or auth — purely a discreet footer affordance.