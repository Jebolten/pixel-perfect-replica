import * as THREE from "three";
import type { Room } from "./bedroom";

/**
 * Level 2 — "The Bathroom": a normal-sized bathroom (2.4m x 3m, 2.5m ceiling)
 * with a sink, a toilet, a cabinet and a door identical to the bedroom one.
 */

const W = 2.4; // x
const D = 3; // z
const H = 2.5;

const disposables: THREE.BufferGeometry[] = [];
const mats: THREE.Material[] = [];

function geo<T extends THREE.BufferGeometry>(g: T): T {
  disposables.push(g);
  return g;
}
function mat<T extends THREE.Material>(m: T): T {
  mats.push(m);
  return m;
}

function box(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = new THREE.Mesh(geo(new THREE.BoxGeometry(w, h, d)), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function createBathroom(): Room {
  const group = new THREE.Group();

  const wallMat = mat(new THREE.MeshStandardMaterial({ color: "#dfe7ea", roughness: 0.55 }));
  const tileMat = mat(new THREE.MeshStandardMaterial({ color: "#c7d3d8", roughness: 0.35 }));
  const floorMat = mat(new THREE.MeshStandardMaterial({ color: "#b9c2c6", roughness: 0.5 }));
  const ceilMat = mat(new THREE.MeshStandardMaterial({ color: "#f2f5f6", roughness: 1 }));
  const woodMat = mat(new THREE.MeshStandardMaterial({ color: "#6b4a30", roughness: 0.7 }));
  const woodDark = mat(new THREE.MeshStandardMaterial({ color: "#4c3421", roughness: 0.65 }));
  const porcelain = mat(
    new THREE.MeshStandardMaterial({ color: "#fbfdfe", roughness: 0.18, metalness: 0.02 }),
  );
  const metalMat = mat(
    new THREE.MeshStandardMaterial({ color: "#c9b072", roughness: 0.35, metalness: 0.8 }),
  );
  const chrome = mat(
    new THREE.MeshStandardMaterial({ color: "#cfd6da", roughness: 0.15, metalness: 0.95 }),
  );

  // Floor + ceiling
  const floor = new THREE.Mesh(geo(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2)), floorMat);
  floor.receiveShadow = true;
  group.add(floor);

  const ceiling = new THREE.Mesh(geo(new THREE.PlaneGeometry(W, D).rotateX(Math.PI / 2)), ceilMat);
  ceiling.position.y = H;
  group.add(ceiling);

  // Walls
  group.add(box(W, H, 0.1, wallMat, 0, H / 2, -D / 2)); // back
  group.add(box(0.1, H, D, wallMat, -W / 2, H / 2, 0)); // left
  group.add(box(0.1, H, D, wallMat, W / 2, H / 2, 0)); // right

  // Tile wainscot (1.4m high) on back and side walls
  const tileH = 1.4;
  group.add(box(W - 0.02, tileH, 0.02, tileMat, 0, tileH / 2, -D / 2 + 0.055));
  group.add(box(0.02, tileH, D - 0.02, tileMat, -W / 2 + 0.055, tileH / 2, 0));
  group.add(box(0.02, tileH, D - 0.02, tileMat, W / 2 - 0.055, tileH / 2, 0));

  // ----- Front wall with door (identical build to the bedroom) -----
  const doorW = 0.9;
  const doorH = 2.05;
  const doorX = -0.6;
  const leftSeg = doorX - doorW / 2 + W / 2;
  const rightSeg = W / 2 - (doorX + doorW / 2);
  group.add(box(leftSeg, H, 0.1, wallMat, -W / 2 + leftSeg / 2, H / 2, D / 2));
  group.add(box(rightSeg, H, 0.1, wallMat, W / 2 - rightSeg / 2, H / 2, D / 2));
  group.add(box(doorW, H - doorH, 0.1, wallMat, doorX, doorH + (H - doorH) / 2, D / 2));

  group.add(box(0.06, doorH, 0.14, woodDark, doorX - doorW / 2, doorH / 2, D / 2));
  group.add(box(0.06, doorH, 0.14, woodDark, doorX + doorW / 2, doorH / 2, D / 2));
  group.add(box(doorW + 0.12, 0.06, 0.14, woodDark, doorX, doorH, D / 2));

  const door = box(doorW - 0.02, doorH - 0.03, 0.045, woodMat, doorX, doorH / 2, D / 2 - 0.02);
  door.name = "door";
  group.add(door);

  const handleBase = new THREE.Mesh(geo(new THREE.BoxGeometry(0.07, 0.07, 0.018)), metalMat);
  handleBase.position.set(doorX - doorW / 2 + 0.16, 1.05, D / 2 - 0.055);
  handleBase.castShadow = true;
  group.add(handleBase);

  const doorHandle = new THREE.Group();
  doorHandle.position.set(doorX - doorW / 2 + 0.16, 1.05, D / 2 - 0.062);
  const neck = new THREE.Mesh(
    geo(new THREE.BoxGeometry(0.032, 0.032, 0.055).translate(0, 0, -0.0275)),
    metalMat,
  );
  neck.castShadow = true;
  doorHandle.add(neck);
  const lever = new THREE.Mesh(
    geo(new THREE.BoxGeometry(0.13, 0.026, 0.03).translate(0.065 - 0.016, 0, -0.055)),
    metalMat,
  );
  lever.castShadow = true;
  doorHandle.add(lever);
  doorHandle.name = "doorHandle";
  group.add(doorHandle);

  // ----- Sink (vanity basin on the back wall) -----
  const sink = new THREE.Group();
  sink.position.set(-W / 2 + 0.55, 0, -D / 2 + 0.3);

  // pedestal column
  const column = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.09, 0.13, 0.78, 20)),
    porcelain,
  );
  column.position.y = 0.39;
  column.castShadow = true;
  sink.add(column);

  // basin
  const basinOuter = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.28, 0.2, 0.16, 28)),
    porcelain,
  );
  basinOuter.position.y = 0.84;
  basinOuter.castShadow = true;
  sink.add(basinOuter);
  const basinInner = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.24, 0.15, 0.14, 28, 1, true)),
    mat(new THREE.MeshStandardMaterial({ color: "#eef4f6", roughness: 0.2, side: THREE.DoubleSide })),
  );
  basinInner.position.y = 0.855;
  sink.add(basinInner);
  const basinBottom = new THREE.Mesh(
    geo(new THREE.CircleGeometry(0.15, 28).rotateX(-Math.PI / 2)),
    porcelain,
  );
  basinBottom.position.y = 0.79;
  sink.add(basinBottom);
  const drain = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.02, 0.02, 0.01, 16)), chrome);
  drain.position.y = 0.795;
  sink.add(drain);

  // faucet
  const spoutBase = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.03, 0.035, 0.12, 16)), chrome);
  spoutBase.position.set(0, 0.95, -0.21);
  sink.add(spoutBase);
  const spout = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 12).rotateX(Math.PI / 2)),
    chrome,
  );
  spout.position.set(0, 1.0, -0.14);
  sink.add(spout);
  for (const s of [-1, 1]) {
    const tap = new THREE.Mesh(geo(new THREE.BoxGeometry(0.07, 0.02, 0.02)), chrome);
    tap.position.set(s * 0.08, 0.95, -0.21);
    sink.add(tap);
  }

  // mirror above the sink
  const mirrorFrame = box(0.66, 0.86, 0.03, woodDark, 0, 1.55, -D / 2 + 0.06 - sink.position.z);
  sink.add(mirrorFrame);
  const mirror = new THREE.Mesh(
    geo(new THREE.PlaneGeometry(0.58, 0.78)),
    mat(new THREE.MeshStandardMaterial({ color: "#dfeaf0", roughness: 0.05, metalness: 0.9 })),
  );
  mirror.position.set(0, 1.55, mirrorFrame.position.z + 0.02);
  sink.add(mirror);

  sink.name = "sink";
  group.add(sink);

  // ----- Toilet against the right wall -----
  const wc = new THREE.Group();
  wc.position.set(W / 2 - 0.42, 0, -0.35);
  wc.rotation.y = -Math.PI / 2; // faces into the room (-X)

  // cistern against the wall
  wc.add(box(0.42, 0.42, 0.19, porcelain, 0, 0.62, -0.28));
  const flush = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16)), chrome);
  flush.position.set(0, 0.84, -0.28);
  wc.add(flush);

  // bowl
  const bowl = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.2, 0.16, 0.26, 24)), porcelain);
  bowl.position.set(0, 0.28, 0);
  bowl.scale.z = 1.25;
  bowl.castShadow = true;
  wc.add(bowl);
  const pedestal = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.12, 0.15, 0.16, 20)), porcelain);
  pedestal.position.set(0, 0.08, -0.06);
  wc.add(pedestal);

  // seat + lid
  const seat = new THREE.Mesh(geo(new THREE.TorusGeometry(0.16, 0.032, 12, 28).rotateX(-Math.PI / 2)), porcelain);
  seat.position.set(0, 0.42, 0);
  seat.scale.z = 1.25;
  wc.add(seat);
  const lid = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 24)),
    porcelain,
  );
  lid.position.set(0, 0.47, -0.2);
  lid.rotation.x = -Math.PI / 2.2;
  wc.add(lid);

  wc.name = "toilet";
  group.add(wc);

  // ----- Simple rectangular bathroom cabinet in the front-right corner -----
  const cab = new THREE.Group();
  // corner at (W/2, D/2); cabinet sits against both the right and front walls
  const cabW = 0.5; // along x (parallel to front wall)
  const cabH = 1.0; // 1 m tall
  const cabD = 0.4; // depth into the room (along z)
  cab.position.set(W / 2 - cabW / 2, 0, D / 2 - cabD / 2);
  // body
  cab.add(box(cabW, cabH, cabD, woodDark, 0, cabH / 2, 0));
  // single door panel facing into the room (-Z)
  cab.add(box(cabW - 0.04, cabH - 0.08, 0.03, woodMat, 0, cabH / 2, -cabD / 2 - 0.005));
  // knob
  const knob = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.015, 0.015, 0.04, 12).rotateZ(Math.PI / 2)), chrome);
  knob.position.set(-cabW / 2 + 0.08, cabH / 2, -cabD / 2 - 0.04);
  cab.add(knob);
  cab.name = "cabinet";
  group.add(cab);

  // ----- Lighting -----
  group.add(new THREE.HemisphereLight(0xeaf4ff, 0x5a6066, 0.7));

  const ceilingLight = new THREE.PointLight(0xf2f8ff, 10, 10, 2);
  ceilingLight.position.set(0, H - 0.25, 0);
  ceilingLight.castShadow = true;
  group.add(ceilingLight);
  const fixture = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 24)),
    mat(new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: 0xdfeeff, emissiveIntensity: 1 })),
  );
  fixture.position.set(0, H - 0.06, 0);
  group.add(fixture);

  const mirrorLight = new THREE.PointLight(0xffffff, 3, 3, 2);
  mirrorLight.position.set(sink.position.x, 1.95, sink.position.z + 0.1);
  group.add(mirrorLight);

  return {
    group,
    doorHandle,
    bounds: { minX: -W / 2 + 0.4, maxX: W / 2 - 0.4, minZ: -D / 2 + 0.4, maxZ: D / 2 - 0.4 },
    dispose: () => {
      disposables.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      disposables.length = 0;
      mats.length = 0;
    },
  };
}
