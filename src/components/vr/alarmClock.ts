import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import clockAsset from "@/assets/alarm_clock.glb.asset.json";

/** Where the alarm clock rests on the night table (room-local coordinates). */
export const CLOCK_REST_POSITION = new THREE.Vector3(0.11, 0.585, -2.02);
export const CLOCK_REST_ROTATION_Y = Math.PI * 1.95;
/** Target size of the clock's largest dimension, in meters. */
const CLOCK_SIZE = 0.16;

export type AlarmClock = {
  group: THREE.Group;
  /** Radius used for touch / grab proximity checks. */
  radius: number;
  resetToTable: () => void;
};

export async function loadAlarmClock(): Promise<AlarmClock> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(clockAsset.url);
  const model = gltf.scene;

  // Normalize scale and re-center the model on its own origin.
  const bbox = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);
  const scale = CLOCK_SIZE / Math.max(size.x, size.y, size.z || 1);
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
  group.name = "alarmClock";
  group.add(model);

  const resetToTable = () => {
    group.position.copy(CLOCK_REST_POSITION);
    group.rotation.set(0, CLOCK_REST_ROTATION_Y, 0);
    group.scale.setScalar(1);
  };
  resetToTable();

  return { group, radius: CLOCK_SIZE * 0.9, resetToTable };
}
