# Cubist agnosia filter

Rework the "pixel" filter so masked objects look like a 1920s cubist painting of themselves: colours pulled from the real object, mixed 2D/3D shapes, gentle wobble. Behaviour stays the same — the mask vanishes when the object is touched/held. The fridge gets masked too.

## Colour

- Sample each masked mesh's own material: base colour, plus the average colour of its texture map when it has one (drawn to a small offscreen canvas once).
- Every shape takes the colour of the mesh whose volume it covers, then gets a deterministic variation in hue (small shift), saturation and lightness, so a wooden wardrobe stays browns/ochres, the fridge stays cool greys/whites, the pepper stays reds.
- Keep the variation seeded from the shape's position so the look is stable between frames.

## Shapes

- Replace the single instanced cube with a small set of shape types: cube, flat rectangle plane, circle/disc, low-poly pyramid, and an angular wedge.
- Each occupied cell picks a type deterministically, gets a random-but-stable rotation (often tilted off-axis, cubist-style) and a slightly varied scale, with flat pieces oversized so faceted planes overlap and break the silhouette.
- One instanced mesh per (shape type x colour bucket) so draw calls stay low.

## Motion

- Each shape wobbles: a tiny position drift and a slow rotation oscillation, amplitude ~1–2% of the object's size, individually phased. Driven by a new `update(t)` call added to the existing per-frame block in `VRScene.tsx`.

## Fridge

- Add `fridge` to the kitchen's static mask list.
- The fridge shell only: the door group, shelf items and the interior lamp keep their own current behaviour, so opening the door and grabbing groceries still works and the grocery items keep their own masks.

## Technical notes

- `src/components/vr/agnosia.ts`: extend the voxelizer to remember which mesh filled each cell (for colour), add material/texture colour sampling, multiple geometries with per-type instanced meshes, per-instance wobble state, and an `update(time)` method on `AgnosiaMask`. Add an optional `exclude` predicate so the fridge mask can skip door/contents subtrees and only toggle visibility on the shell meshes instead of the whole group.
- `src/components/vr/VRScene.tsx`: call `mask.update(t)` for unrevealed masks in the existing agnosia block; add `"fridge"` to the kitchen `addStaticMask` list.
- No changes to grab, task or HUD logic.
