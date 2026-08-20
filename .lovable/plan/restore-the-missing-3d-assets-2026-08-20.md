# Restore the missing 3D assets

Eight of the fourteen media files are already restored (alarm clock, landline phone, hairbrush, sunscreen, toothbrush holder, both voice recordings, family photo) and now load correctly. The two newest uploads finish two more slots.

## What gets added now

| Upload | Used for |
| --- | --- |
| classic_rotary_phone_3d_model.glb | The rotary phone in the bedroom (replaces the landline model currently mapped there) |
| landschaft.avif | The view through the bedroom window |

## Still missing

No files were provided yet for these five props, so their rooms will keep showing gaps:

- coffee_mug.glb (kitchen table)
- egg_carton_3d_model.glb (fridge)
- orange_juice_bottle_3d_model.glb (fridge)
- pink_candle.glb (kitchen table)
- red_bell_pepper_3d_model.glb (fridge)

Upload those five and they slot in the same way.

## Technical notes

- Upload each file through the asset CLI and overwrite the matching `src/assets/*.asset.json` pointer, keeping the filenames the code already imports.
- The landscape is AVIF, not JPEG: create it as `landschaft.avif`, then update the import in `src/components/vr/bedroom.ts` to the new pointer file and delete the stale `landschaft.jpg.asset.json`.
- Decide the rotary phone mapping: the landline model was uploaded first and is currently pointed at `classic_rotary_phone.glb`. The new rotary model replaces that pointer, so the phone in the bedroom becomes the rotary one.
- Verify every pointer URL returns 200 and load the bedroom, bathroom and kitchen in the preview to confirm the models appear at their rest positions.
