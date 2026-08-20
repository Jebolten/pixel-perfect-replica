import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import candleAsset from "@/assets/pink_candle.glb.asset.json";
import mugAsset from "@/assets/coffee_mug.glb.asset.json";

/**
 * Kitchen table — pushed flush against the right wall, centered between the
 * fridge and the door. The group sits at (W/2 - tW/2 - 0.02, 0, 0.4) in room
 * coordinates, with a 0.9m x 0.7m top whose surface is 0.775m off the floor.
 *   room X centre = 1.23, room Z centre = 0.4, top Y = 0.775
 */
const TABLE_X = 1.23;
const TABLE_Z = 0.4;
const TABLE_TOP_Y = 0.775;

/** Dead-centre of the table top. */
export const CANDLE_REST_POSITION = new THREE.Vector3(TABLE_X, TABLE_TOP_Y, TABLE_Z);
/** Offset ~30cm toward the room centre (away from the wall) so it clears the candle. */
export const MUG_REST_POSITION = new THREE.Vector3(TABLE_X - 0.3, TABLE_TOP_Y, TABLE_Z);

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

/** Pink candle, ~13cm tall, placed dead-centre on the kitchen table. */
export function loadCandle(): Promise<THREE.Group> {
  return loadOnSurface(candleAsset.url, 0.13, "candle", CANDLE_REST_POSITION, Math.PI * 0.2);
}

/** Coffee mug scaled to ~11cm, offset 30cm from the candle toward the room. */
export function loadCoffeeMug(): Promise<THREE.Group> {
  return loadOnSurface(mugAsset.url, 0.11, "coffeeMug", MUG_REST_POSITION, -Math.PI / 5);
}
