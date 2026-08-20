import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import hairbrushAsset from "@/assets/hairbrush.glb.asset.json";
import sunscreenAsset from "@/assets/sunscreen.glb.asset.json";

/** Cabinet top in the bathroom: 0.5 x 0.4 footprint, 1 m tall, front-right corner. */
const CABINET_TOP_Y = 1.0;
const CABINET_X = 0.95;
const CABINET_Z = 1.3;

/** Left half of the cabinet top. */
export const HAIRBRUSH_REST_POSITION = new THREE.Vector3(
  CABINET_X - 0.13,
  CABINET_TOP_Y,
  CABINET_Z,
);
/** Right half of the cabinet top — clearly separated from the hairbrush. */
export const SUNSCREEN_REST_POSITION = new THREE.Vector3(
  CABINET_X + 0.14,
  CABINET_TOP_Y,
  CABINET_Z,
);

async function loadOnSurface(
  url: string,
  targetSize: number,
  name: string,
  position: THREE.Vector3,
  rotationY = 0,
): Promise<THREE.Group> {
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
  // Center horizontally, base at y = 0.
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
  group.rotation.y = rotationY;
  return group;
}

export function loadHairbrush(): Promise<THREE.Group> {
  return loadOnSurface(
    hairbrushAsset.url,
    0.2,
    "hairbrush",
    HAIRBRUSH_REST_POSITION,
    Math.PI / 8,
  );
}

export function loadSunscreen(): Promise<THREE.Group> {
  return loadOnSurface(
    sunscreenAsset.url,
    0.15,
    "sunscreen",
    SUNSCREEN_REST_POSITION,
    -Math.PI / 6,
  );
}
