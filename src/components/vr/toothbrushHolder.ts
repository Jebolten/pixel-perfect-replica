import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import holderAsset from "@/assets/toothbrush_holder.glb.asset.json";

/** Resting spot on the bathroom basin rim, pushed back towards the wall. */
export const HOLDER_REST_POSITION = new THREE.Vector3(-0.48, 0.921, -1.34);
/** Target size of the holder's largest dimension, in meters. */
const HOLDER_SIZE = 0.24;

export async function loadToothbrushHolder(): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(holderAsset.url);
  const model = gltf.scene;

  const bbox = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);
  const scale = HOLDER_SIZE / Math.max(size.x, size.y, size.z || 1);
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
  group.name = "toothbrushHolder";
  group.add(model);
  group.position.copy(HOLDER_REST_POSITION);

  return group;
}
