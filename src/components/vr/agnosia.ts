import * as THREE from "three";

/**
 * Visual agnosia filter.
 *
 * Replaces an object with a coarse cluster of colourful "pixel" cubes that
 * roughly fill its silhouette — the way a patient with visual agnosia may
 * perceive an object: shapes and colours without a recognisable identity.
 * Revealing the mask swaps the blocks back for the real model.
 */

const PALETTE = [
  0xff5c7a, 0xffb03a, 0xffe066, 0x6ee7a0, 0x4cc9f0, 0x7c6cf0, 0xf06ecd, 0xff8a5c,
  0x59d2fe, 0xa0e548, 0xff6b6b, 0x9b8cff,
];

export type AgnosiaMask = {
  group: THREE.Group;
  target: THREE.Object3D;
  revealed: boolean;
  setRevealed: (v: boolean) => void;
  /** Keeps the mask on top of a moving target. */
  sync: () => void;
  dispose: () => void;
};

/**
 * Builds the pixel mask for `target` and adds it to the target's parent so it
 * sits exactly where the object does.
 */
export function createAgnosiaMask(target: THREE.Object3D): AgnosiaMask | null {
  const parent = target.parent;
  if (!parent) return null;

  target.updateWorldMatrix(true, true);
  parent.updateWorldMatrix(true, false);
  const toParent = new THREE.Matrix4().copy(parent.matrixWorld).invert();

  // Collect every mesh bounding box, expressed in the parent's local space.
  const boxes: THREE.Box3[] = [];
  const total = new THREE.Box3();
  target.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox;
    if (!bb) return;
    const local = new THREE.Box3()
      .copy(bb)
      .applyMatrix4(new THREE.Matrix4().multiplyMatrices(toParent, m.matrixWorld));
    boxes.push(local);
    total.union(local);
  });
  if (!boxes.length || total.isEmpty()) return null;

  const size = new THREE.Vector3();
  total.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  let cell = THREE.MathUtils.clamp(maxDim / 6, 0.035, 0.22);

  const key = (i: number, j: number, k: number) => `${i},${j},${k}`;
  const voxelize = (s: number) => {
    const set = new Map<string, THREE.Vector3>();
    for (const b of boxes) {
      const i0 = Math.floor(b.min.x / s);
      const i1 = Math.floor((b.max.x - 1e-6) / s);
      const j0 = Math.floor(b.min.y / s);
      const j1 = Math.floor((b.max.y - 1e-6) / s);
      const k0 = Math.floor(b.min.z / s);
      const k1 = Math.floor((b.max.z - 1e-6) / s);
      for (let i = i0; i <= i1; i++)
        for (let j = j0; j <= j1; j++)
          for (let k = k0; k <= k1; k++) {
            if (set.size > 6000) return set;
            set.set(key(i, j, k), new THREE.Vector3((i + 0.5) * s, (j + 0.5) * s, (k + 0.5) * s));
          }
    }
    return set;
  };

  let voxels = voxelize(cell);
  let guard = 0;
  while (voxels.size > 900 && guard++ < 6) {
    cell *= 1.5;
    voxels = voxelize(cell);
  }
  if (!voxels.size) return null;

  const centres = [...voxels.values()];
  // Bake the blocks relative to the target's own local position so the mask
  // can follow the object when it moves (e.g. the hopping alarm clock).
  const origin = target.position.clone();
  centres.forEach((c) => c.sub(origin));
  const geom = new THREE.BoxGeometry(cell * 0.94, cell * 0.94, cell * 0.94);
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.55,
    metalness: 0.05,
    vertexColors: false,
  });
  const inst = new THREE.InstancedMesh(geom, material, centres.length);
  inst.castShadow = true;
  inst.receiveShadow = true;

  const m4 = new THREE.Matrix4();
  const colour = new THREE.Color();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  centres.forEach((c, idx) => {
    // Deterministic pseudo-random jitter/colour so the mask is stable.
    const seed = Math.abs(Math.sin((c.x * 12.9898 + c.y * 78.233 + c.z * 37.719) * 43758.5453));
    const scale = 0.8 + (seed % 0.4);
    m4.compose(c, q, one.clone().multiplyScalar(scale));
    inst.setMatrixAt(idx, m4);
    colour.setHex(PALETTE[Math.floor(seed * PALETTE.length) % PALETTE.length]!);
    inst.setColorAt(idx, colour);
  });
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;

  const group = new THREE.Group();
  group.name = `agnosia:${target.name || "object"}`;
  group.add(inst);
  group.position.copy(origin);
  parent.add(group);

  let revealed = false;
  target.visible = false;

  const mask: AgnosiaMask = {
    group,
    target,
    get revealed() {
      return revealed;
    },
    setRevealed: (v: boolean) => {
      if (v === revealed) return;
      revealed = v;
      group.visible = !v;
      target.visible = v;
    },
    sync: () => {
      if (target.parent === group.parent) group.position.copy(target.position);
    },
    dispose: () => {
      group.removeFromParent();
      geom.dispose();
      material.dispose();
      inst.dispose();
      target.visible = true;
    },
  };
  return mask;
}

/** Shortest distance from a point to an axis-aligned box (0 when inside). */
export function distanceToBox(box: THREE.Box3, p: THREE.Vector3): number {
  const dx = Math.max(box.min.x - p.x, 0, p.x - box.max.x);
  const dy = Math.max(box.min.y - p.y, 0, p.y - box.max.y);
  const dz = Math.max(box.min.z - p.z, 0, p.z - box.max.z);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
