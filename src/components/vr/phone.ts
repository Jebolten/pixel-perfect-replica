import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import phoneAsset from "@/assets/classic_rotary_phone.glb.asset.json";

/** Where the rotary phone rests on the desk (room-local coordinates). */
export const PHONE_REST_POSITION = new THREE.Vector3(-0.9, 0.771, 2.05);
export const PHONE_REST_ROTATION_Y = Math.PI * 0.92;
/** Target size of the phone's largest dimension, in meters. */
const PHONE_SIZE = 0.3;

export async function loadPhone(): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(phoneAsset.url);
  const model = gltf.scene;

  // Normalize scale and re-center the model so its origin is at the base.
  const bbox = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);
  const scale = PHONE_SIZE / Math.max(size.x, size.y, size.z || 1);
  model.scale.setScalar(scale);
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
  group.name = "phone";
  group.add(model);
  group.position.copy(PHONE_REST_POSITION);
  group.rotation.set(0, PHONE_REST_ROTATION_Y, 0);

  return group;
}
