# Plan: Add a desk (Schreibtisch) to the bedroom

## What to build

Add a wooden desk against the front wall (+Z), to the **left of the door** — the only wall section next to the door with enough free space (~2.55 m wide, from x=−2.0 to x=0.55).

## Placement

- **Wall**: front wall (z ≈ 2.5), inner surface at z ≈ 2.45
- **Position**: centered around x = −0.7, pushed against the wall (desk back at z ≈ 2.45)
- **Size**: 1.2 m wide × 0.6 m deep × 0.75 m high (standard desk proportions)
- Fits comfortably left of the door (door opening starts at x = 0.55) with margin on both sides

## Desk construction (in `src/components/vr/bedroom.ts`)

- **Desktop**: 1.2 × 0.04 × 0.6 m plank at y = 0.75, using `woodMat`
- **Four legs**: 0.06 × 0.73 × 0.06 m posts at the corners, using `woodDark`
- **Drawer unit**: a small 3-drawer pedestal on the left side under the desktop (0.4 × 0.6 × 0.4 m body + drawer fronts + metal handles), using `woodDark` / `woodMat` / `metalMat`
- **Optional desk lamp**: a small lamp on the right rear corner (stem + shade + PointLight) for consistency with the night-table lamp, so the desk isn't dark

No other furniture or logic changes — the desk is decorative/scene only. Teleport bounds already exclude the wall area (maxZ = D/2 − 0.35 = 2.15), so the desk sits outside the walkable zone and won't interfere with movement.

## Files changed

- `src/components/vr/bedroom.ts` — add a desk group to the bedroom scene, placed against the front wall left of the door
