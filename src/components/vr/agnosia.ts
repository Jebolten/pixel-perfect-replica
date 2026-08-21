import * as THREE from "three";

/**
 * Visual agnosia filter — cubist edition.
 *
 * Replaces an object with a cluster of angular shapes (cubes, planes, discs,
 * pyramids, wedges) that roughly fill its silhouette. The shapes borrow the
 * colours of the object they hide (with painterly variation) and wobble
 * slightly, the way a 1920s cubist painting fragments a subject: shapes and
 * colours without a recognisable identity. Revealing the mask swaps the
 * shapes back for the real model.
 */

export type AgnosiaMask = {
  group: THREE.Group;
  target: THREE.Object3D;
  revealed: boolean;
  setRevealed: (v: boolean) => void;
  /** Glowing blue hint on both the shapes and the real object. */
  hinted: boolean;
  setHinted: (v: boolean) => void;
  /** Keeps the mask on top of a moving target. */
  sync: () => void;
  /** Per-frame wobble. */
  update: (t: number) => void;
  dispose: () => void;
};

type Options = {
  /** Return true for subtrees that must stay visible and unmasked. */
  exclude?: (o: THREE.Object3D) => boolean;
};

/** Cheap deterministic hash -> [0,1). */
function hash(x: number, y: number, z: number, salt = 0): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + salt * 45.3) * 43758.5453;
  return s - Math.floor(s);
}

const textureCache = new WeakMap<THREE.Texture, THREE.Color>();

function averageTextureColour(tex: THREE.Texture): THREE.Color | null {
  const cached = textureCache.get(tex);
  if (cached) return cached;
  const img = tex.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined;
  if (!img || typeof document === "undefined") return null;
  const w = (img as HTMLImageElement).width;
  const h = (img as HTMLImageElement).height;
  if (!w || !h) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img as CanvasImageSource, 0, 0, 16, 16);
    const data = ctx.getImageData(0, 0, 16, 16).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]!;
      if (a < 8) continue;
      r += data[i]!;
      g += data[i + 1]!;
      b += data[i + 2]!;
      n++;
    }
    if (!n) return null;
    const c = new THREE.Color(r / n / 255, g / n / 255, b / n / 255);
    c.convertSRGBToLinear();
    textureCache.set(tex, c);
    return c;
  } catch {
    return null;
  }
}

/** Representative colour of a mesh: its texture average, tinted by its base colour. */
function meshColour(mesh: THREE.Mesh): THREE.Color {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const out = new THREE.Color(0.6, 0.6, 0.6);
  for (const mat of mats) {
    const m = mat as THREE.MeshStandardMaterial;
    if (!m) continue;
    let c: THREE.Color | null = null;
    if (m.map) c = averageTextureColour(m.map);
    if (m.color) {
      const base = m.color.clone();
      c = c ? c.multiply(base).lerp(base, 0.25) : base;
    }
    if (c) {
      out.copy(c);
      break;
    }
  }
  // Keep it readable as paint: avoid pitch black / blown-out white.
  const hsl = { h: 0, s: 0, l: 0 };
  out.getHSL(hsl);
  out.setHSL(hsl.h, THREE.MathUtils.clamp(hsl.s, 0.12, 0.95), THREE.MathUtils.clamp(hsl.l, 0.12, 0.85));
  return out;
}

type ShapeKind = 0 | 1 | 2 | 3 | 4;

function makeGeometry(kind: ShapeKind, cell: number): THREE.BufferGeometry {
  switch (kind) {
    case 0:
      return new THREE.BoxGeometry(cell * 0.95, cell * 0.95, cell * 0.95);
    case 1: {
      // Flat rectangle facet, oversized so planes overlap.
      const g = new THREE.BoxGeometry(cell * 1.35, cell * 1.05, cell * 0.08);
      return g;
    }
    case 2:
      return new THREE.CircleGeometry(cell * 0.62, 16);
    case 3:
      return new THREE.ConeGeometry(cell * 0.62, cell * 1.05, 4);
    case 4:
      // Angular wedge.
      return new THREE.ConeGeometry(cell * 0.7, cell * 0.9, 3);
    default:
      return new THREE.BoxGeometry(cell, cell, cell);
  }
}

type Instance = {
  kind: ShapeKind;
  index: number;
  base: THREE.Vector3;
  quat: THREE.Quaternion;
  scale: THREE.Vector3;
  phase: number;
  speed: number;
  amp: number;
  spin: THREE.Vector3;
};

/**
 * Builds the cubist mask for `target` and adds it to the target's parent so it
 * sits exactly where the object does.
 */
export function createAgnosiaMask(
  target: THREE.Object3D,
  options: Options = {},
): AgnosiaMask | null {
  const parent = target.parent;
  if (!parent) return null;

  target.updateWorldMatrix(true, true);
  parent.updateWorldMatrix(true, false);
  const toParent = new THREE.Matrix4().copy(parent.matrixWorld).invert();

  // Collect every mesh bounding box, expressed in the parent's local space.
  const boxes: { box: THREE.Box3; colour: THREE.Color }[] = [];
  const maskedMeshes: THREE.Mesh[] = [];
  const total = new THREE.Box3();
  const skip = options.exclude;
  const walk = (o: THREE.Object3D) => {
    if (skip?.(o)) return;
    // Never voxelize another mask's shapes (masks live inside the room tree and
    // would otherwise spawn a phantom cluster at the group origin).
    if (o.name.startsWith("agnosia:")) return;
    // Already hidden by an earlier mask (e.g. the stove inside the cabinet run).
    if (!o.visible) return;

    const m = o as THREE.Mesh;
    if (m.isMesh && m.geometry) {
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      const bb = m.geometry.boundingBox;
      if (bb) {
        const local = new THREE.Box3()
          .copy(bb)
          .applyMatrix4(new THREE.Matrix4().multiplyMatrices(toParent, m.matrixWorld));
        boxes.push({ box: local, colour: meshColour(m) });
        total.union(local);
        maskedMeshes.push(m);
      }
    }
    o.children.forEach(walk);
  };
  walk(target);
  if (!boxes.length || total.isEmpty()) return null;

  const size = new THREE.Vector3();
  total.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  let cell = THREE.MathUtils.clamp(maxDim / 6, 0.035, 0.22);

  const key = (i: number, j: number, k: number) => `${i},${j},${k}`;
  type Voxel = { p: THREE.Vector3; colour: THREE.Color };
  const voxelize = (s: number) => {
    const set = new Map<string, Voxel>();
    for (const b of boxes) {
      const i0 = Math.floor(b.box.min.x / s);
      const i1 = Math.floor((b.box.max.x - 1e-6) / s);
      const j0 = Math.floor(b.box.min.y / s);
      const j1 = Math.floor((b.box.max.y - 1e-6) / s);
      const k0 = Math.floor(b.box.min.z / s);
      const k1 = Math.floor((b.box.max.z - 1e-6) / s);
      for (let i = i0; i <= i1; i++)
        for (let j = j0; j <= j1; j++)
          for (let k = k0; k <= k1; k++) {
            if (set.size > 6000) return set;
            set.set(key(i, j, k), {
              p: new THREE.Vector3((i + 0.5) * s, (j + 0.5) * s, (k + 0.5) * s),
              colour: b.colour,
            });
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

  const cells = [...voxels.values()];
  // Bake the shapes relative to the target's own local position so the mask
  // can follow the object when it moves (e.g. the hopping alarm clock).
  const origin = target.position.clone();
  cells.forEach((c) => c.p.sub(origin));

  const group = new THREE.Group();
  group.name = `agnosia:${target.name || "object"}`;
  group.position.copy(origin);

  // Assign a shape kind per cell first so each instanced mesh knows its count.
  const kinds: ShapeKind[] = cells.map((c) => {
    const r = hash(c.p.x, c.p.y, c.p.z, 1);
    if (r < 0.34) return 0;
    if (r < 0.6) return 1;
    if (r < 0.74) return 2;
    if (r < 0.88) return 3;
    return 4;
  });

  const counts = [0, 0, 0, 0, 0];
  kinds.forEach((k) => counts[k]!++);

  const geoms: (THREE.BufferGeometry | null)[] = [];
  const meshes: (THREE.InstancedMesh | null)[] = [];
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.62,
    metalness: 0.04,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  for (let k = 0; k < 5; k++) {
    if (!counts[k]) {
      geoms.push(null);
      meshes.push(null);
      continue;
    }
    const g = makeGeometry(k as ShapeKind, cell);
    const im = new THREE.InstancedMesh(g, material, counts[k]!);
    im.castShadow = true;
    im.receiveShadow = true;
    im.frustumCulled = false;
    geoms.push(g);
    meshes.push(im);
    group.add(im);
  }

  const instances: Instance[] = [];
  const cursor = [0, 0, 0, 0, 0];
  const m4 = new THREE.Matrix4();
  const colour = new THREE.Color();
  const hsl = { h: 0, s: 0, l: 0 };
  const euler = new THREE.Euler();

  cells.forEach((c, idx) => {
    const kind = kinds[idx]!;
    const im = meshes[kind]!;
    const i = cursor[kind]!++;

    const r1 = hash(c.p.x, c.p.y, c.p.z, 2);
    const r2 = hash(c.p.x, c.p.y, c.p.z, 3);
    const r3 = hash(c.p.x, c.p.y, c.p.z, 4);
    const r4 = hash(c.p.x, c.p.y, c.p.z, 5);

    // Cubist tilt: mostly off-axis rotations.
    euler.set(
      (r1 - 0.5) * Math.PI * 0.9,
      (r2 - 0.5) * Math.PI,
      (r3 - 0.5) * Math.PI * 0.9,
    );
    const quat = new THREE.Quaternion().setFromEuler(euler);
    const s = 0.75 + r4 * 0.6;
    const scale = new THREE.Vector3(s, s * (0.8 + r1 * 0.6), s * (0.8 + r2 * 0.5));
    const base = c.p.clone().add(
      new THREE.Vector3((r1 - 0.5) * cell * 0.3, (r2 - 0.5) * cell * 0.3, (r3 - 0.5) * cell * 0.3),
    );

    m4.compose(base, quat, scale);
    im.setMatrixAt(i, m4);

    // Painterly variation around the object's own colour.
    colour.copy(c.colour);
    colour.getHSL(hsl);
    colour.setHSL(
      (hsl.h + (r2 - 0.5) * 0.08 + 1) % 1,
      THREE.MathUtils.clamp(hsl.s * (0.7 + r3 * 0.7), 0.08, 1),
      THREE.MathUtils.clamp(hsl.l * (0.75 + r4 * 0.6), 0.08, 0.92),
    );
    im.setColorAt(i, colour);

    instances.push({
      kind,
      index: i,
      base,
      quat,
      scale,
      phase: r1 * Math.PI * 2,
      speed: 0.6 + r2 * 0.9,
      amp: cell * (0.03 + r3 * 0.06),
      spin: new THREE.Vector3(r1 - 0.5, r2 - 0.5, r3 - 0.5).multiplyScalar(0.09),
    });
  });

  meshes.forEach((im) => {
    if (!im) return;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });

  parent.add(group);

  let revealed = false;
  const setMaskedVisible = (v: boolean) => {
    if (skip) maskedMeshes.forEach((m) => (m.visible = v));
    else target.visible = v;
  };
  setMaskedVisible(false);

  const tmpPos = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const wobbleEuler = new THREE.Euler();
  const wobbleQuat = new THREE.Quaternion();

  // --- Blue hint glow ---
  let hinted = false;
  const HINT = new THREE.Color(0x3fa9ff);
  const hintOutlines: THREE.Mesh[] = [];
  const outlineMat = new THREE.MeshBasicMaterial({
    color: HINT,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const applyHint = (v: boolean) => {
    // Mask shapes glow.
    material.emissive.copy(v ? HINT : new THREE.Color(0x000000));
    material.emissiveIntensity = v ? 0.9 : 0;
    material.needsUpdate = true;
    // Real object gets a blue shell outline.
    if (v && !hintOutlines.length) {
      for (const m of maskedMeshes) {
        if (!m.geometry) continue;
        const o = new THREE.Mesh(m.geometry, outlineMat);
        o.name = "agnosia:hintOutline";
        o.scale.setScalar(1.06);
        o.renderOrder = 5;
        m.add(o);
        hintOutlines.push(o);
      }
    }
    hintOutlines.forEach((o) => (o.visible = v));
  };

  const mask: AgnosiaMask = {
    group,
    target,
    get revealed() {
      return revealed;
    },
    get hinted() {
      return hinted;
    },
    setHinted: (v: boolean) => {
      if (v === hinted) return;
      hinted = v;
      applyHint(v);
    },
    setRevealed: (v: boolean) => {
      if (v === revealed) return;
      revealed = v;
      group.visible = !v;
      setMaskedVisible(v);
    },
    sync: () => {
      if (target.parent === group.parent) group.position.copy(target.position);
    },
    update: (t: number) => {
      if (revealed) return;
      for (const inst of instances) {
        const im = meshes[inst.kind];
        if (!im) continue;
        const a = t * inst.speed + inst.phase;
        tmpPos.set(
          inst.base.x + Math.sin(a) * inst.amp,
          inst.base.y + Math.sin(a * 1.31 + 1.7) * inst.amp,
          inst.base.z + Math.cos(a * 0.87) * inst.amp,
        );
        wobbleEuler.set(
          Math.sin(a * 0.9) * inst.spin.x,
          Math.sin(a * 1.1 + 0.6) * inst.spin.y,
          Math.cos(a * 0.8) * inst.spin.z,
        );
        wobbleQuat.setFromEuler(wobbleEuler);
        tmpQuat.copy(inst.quat).multiply(wobbleQuat);
        m4.compose(tmpPos, tmpQuat, inst.scale);
        im.setMatrixAt(inst.index, m4);
      }
      meshes.forEach((im) => im && (im.instanceMatrix.needsUpdate = true));
    },
    dispose: () => {
      group.removeFromParent();
      geoms.forEach((g) => g?.dispose());
      meshes.forEach((im) => im?.dispose());
      material.dispose();
      hintOutlines.forEach((o) => o.removeFromParent());
      hintOutlines.length = 0;
      outlineMat.dispose();
      setMaskedVisible(true);
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
