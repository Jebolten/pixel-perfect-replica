import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import pepperAsset from "@/assets/red_bell_pepper_3d_model.glb.asset.json";
import juiceAsset from "@/assets/orange_juice_bottle_3d_model.glb.asset.json";
import eggsAsset from "@/assets/egg_carton_3d_model.glb.asset.json";

/**
 * Grabbable groceries on the top shelf of the fridge.
 *
 * All coordinates are LOCAL to the fridge group (which is rotated -90° in the
 * kitchen), so these objects must be added to the "fridge" group.
 *
 * Fridge geometry (see kitchen.ts): frW 0.7, frD 0.68, doorT 0.07, wall t 0.05
 *   cavity depth  cavD  = 0.56, centre cavCz = -0.01, front face z = 0.27
 *   top shelf surface y = 1.46, shelf bins now end at z = 0.14
 * The front strip z ∈ [0.15, 0.26] is therefore free for these items.
 */
const SHELF_Y = 1.46 + 0.008;
const ROW_Z = 0.205;

export type GrabbableItem = {
  group: THREE.Group;
  /** Rough grab radius of the object. */
  radius: number;
  /** Puts the item back on its shelf spot. */
  reset: () => void;
};

async function loadItem(
  url: string,
  targetSize: number,
  name: string,
  position: THREE.Vector3,
  rotationY: number,
  radius: number,
): Promise<GrabbableItem> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;

  const bbox = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);
  const scale = targetSize / Math.max(size.x, size.y, size.z || 1);
  model.scale.setScalar(scale);
  // Centre horizontally, base resting exactly on the shelf.
  model.position.copy(center).multiplyScalar(-scale);
  model.position.y += (size.y / 2) * scale;

  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });

  const group = new THREE.Group();
  group.name = name;
  group.add(model);
  group.position.copy(position);
  group.rotation.set(0, rotationY, 0);

  return {
    group,
    radius,
    reset: () => {
      group.position.copy(position);
      group.rotation.set(0, rotationY, 0);
      group.scale.setScalar(1);
    },
  };
}

/** Orange juice bottle, ~24cm tall, left side of the top shelf. */
export function loadJuiceBottle(): Promise<GrabbableItem> {
  return loadItem(
    juiceAsset.url,
    0.24,
    "fridgeJuiceBottle",
    new THREE.Vector3(-0.21, SHELF_Y, ROW_Z),
    0.25,
    0.07,
  );
}

/** Red bell pepper, ~9cm, centre of the top shelf front row. */
export function loadBellPepper(): Promise<GrabbableItem> {
  return loadItem(
    pepperAsset.url,
    0.09,
    "fridgeBellPepper",
    new THREE.Vector3(-0.04, SHELF_Y, ROW_Z),
    -0.4,
    0.06,
  );
}

/** Egg carton, ~22cm wide, right side of the top shelf front row. */
export function loadEggCarton(): Promise<GrabbableItem> {
  return loadItem(
    eggsAsset.url,
    0.22,
    "fridgeEggCarton",
    new THREE.Vector3(0.15, SHELF_Y, ROW_Z),
    0,
    0.1,
  );
}

export function loadFridgeItems(): Promise<GrabbableItem[]> {
  return Promise.all([loadJuiceBottle(), loadBellPepper(), loadEggCarton()]);
}
