import * as THREE from "three";
import scenery from "@/assets/landschaft.avif.asset.json";

/**
 * Level 1 — "Waking Up": a normal-sized bedroom (4m x 5m, 2.6m ceiling)
 * with a bed, a night table, a wardrobe and a door.
 */
export type Room = {
  group: THREE.Group;
  /** Pivot of the L-shaped door lever; rotate around Z to turn it down. */
  doorHandle: THREE.Object3D;
  /** Meshes the teleport arc / walking area should stay inside. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  dispose: () => void;
};

const W = 4; // x
const D = 5; // z
const H = 2.6;

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

export function createBedroom(): Room {
  const group = new THREE.Group();

  const wallMat = mat(new THREE.MeshStandardMaterial({ color: "#d8cfc2", roughness: 0.95 }));
  const floorMat = mat(new THREE.MeshStandardMaterial({ color: "#8a6543", roughness: 0.8 }));
  const ceilMat = mat(new THREE.MeshStandardMaterial({ color: "#efe9e2", roughness: 1 }));
  const woodMat = mat(new THREE.MeshStandardMaterial({ color: "#6b4a30", roughness: 0.7 }));
  const woodDark = mat(new THREE.MeshStandardMaterial({ color: "#4c3421", roughness: 0.65 }));
  const sheetMat = mat(new THREE.MeshStandardMaterial({ color: "#e8eef5", roughness: 0.9 }));
  const blanketMat = mat(new THREE.MeshStandardMaterial({ color: "#3f6ea3", roughness: 0.95 }));
  const metalMat = mat(new THREE.MeshStandardMaterial({ color: "#c9b072", roughness: 0.35, metalness: 0.8 }));

  // Floor + ceiling
  const floor = new THREE.Mesh(geo(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2)), floorMat);
  floor.receiveShadow = true;
  group.add(floor);

  const ceiling = new THREE.Mesh(geo(new THREE.PlaneGeometry(W, D).rotateX(Math.PI / 2)), ceilMat);
  ceiling.position.y = H;
  group.add(ceiling);

  // Walls (inward facing boxes, 10cm thick)
  group.add(box(W, H, 0.1, wallMat, 0, H / 2, -D / 2)); // back
  group.add(box(0.1, H, D, wallMat, -W / 2, H / 2, 0)); // left
  group.add(box(0.1, H, D, wallMat, W / 2, H / 2, 0)); // right

  // Front wall with a door opening (door on +Z wall, offset to the right)
  const doorW = 0.9;
  const doorH = 2.05;
  const doorX = 1.0;
  const leftSeg = doorX - doorW / 2 + W / 2;
  const rightSeg = W / 2 - (doorX + doorW / 2);
  group.add(box(leftSeg, H, 0.1, wallMat, -W / 2 + leftSeg / 2, H / 2, D / 2));
  group.add(box(rightSeg, H, 0.1, wallMat, W / 2 - rightSeg / 2, H / 2, D / 2));
  group.add(box(doorW, H - doorH, 0.1, wallMat, doorX, doorH + (H - doorH) / 2, D / 2));

  // Door frame + door leaf
  group.add(box(0.06, doorH, 0.14, woodDark, doorX - doorW / 2, doorH / 2, D / 2));
  group.add(box(0.06, doorH, 0.14, woodDark, doorX + doorW / 2, doorH / 2, D / 2));
  group.add(box(doorW + 0.12, 0.06, 0.14, woodDark, doorX, doorH, D / 2));

  const door = box(doorW - 0.02, doorH - 0.03, 0.045, woodMat, doorX, doorH / 2, D / 2 - 0.02);
  door.name = "door";
  group.add(door);

  // Opaque dark panel right behind the door leaf so the agnosia mask on the
  // door never reveals the void outside the room. Never pixelated.
  const doorBlocker = box(
    doorW + 0.1,
    doorH + 0.06,
    0.04,
    new THREE.MeshStandardMaterial({ color: 0x140f0b, roughness: 1, metalness: 0 }),
    doorX,
    doorH / 2,
    D / 2 + 0.05,
  );
  doorBlocker.name = "doorBlocker";
  group.add(doorBlocker);


  // L-shaped door handle (lever). The pivot rotates around Z so the lever turns down.
  const handleBase = new THREE.Mesh(
    geo(new THREE.BoxGeometry(0.07, 0.07, 0.018)),
    metalMat,
  );
  handleBase.position.set(doorX - doorW / 2 + 0.16, 1.05, D / 2 - 0.055);
  handleBase.castShadow = true;
  group.add(handleBase);

  const doorHandle = new THREE.Group();
  doorHandle.position.set(doorX - doorW / 2 + 0.16, 1.05, D / 2 - 0.062);
  // neck: sticks out of the door towards the room (-Z)
  const neck = new THREE.Mesh(
    geo(new THREE.BoxGeometry(0.032, 0.032, 0.055).translate(0, 0, -0.0275)),
    metalMat,
  );
  neck.castShadow = true;
  doorHandle.add(neck);
  // lever: horizontal bar pointing away from the hinge (+X, rotated 180°)
  const lever = new THREE.Mesh(
    geo(new THREE.BoxGeometry(0.13, 0.026, 0.03).translate(0.065 - 0.016, 0, -0.055)),
    metalMat,
  );
  lever.castShadow = true;
  doorHandle.add(lever);
  doorHandle.name = "doorHandle";
  group.add(doorHandle);

  // ----- Bed (140 x 200) against the left wall, headboard at back wall -----
  const bed = new THREE.Group();
  bed.position.set(-W / 2 + 0.85, 0, -D / 2 + 1.15);
  const bedW = 1.4;
  const bedL = 2.0;

  bed.add(box(bedW, 0.25, bedL, woodDark, 0, 0.18, 0)); // frame
  bed.add(box(bedW + 0.06, 0.7, 0.08, woodMat, 0, 0.55, -bedL / 2 - 0.02)); // headboard
  bed.add(box(bedW - 0.06, 0.22, bedL - 0.08, sheetMat, 0, 0.41, 0)); // mattress
  const blanket = box(bedW - 0.02, 0.1, bedL * 0.62, blanketMat, 0, 0.55, bedL * 0.16);
  bed.add(blanket);
  const pillow = box(0.55, 0.13, 0.32, sheetMat, -0.3, 0.58, -bedL / 2 + 0.3);
  const pillow2 = box(0.55, 0.13, 0.32, sheetMat, 0.3, 0.58, -bedL / 2 + 0.3);
  bed.add(pillow, pillow2);
  bed.name = "bed";
  group.add(bed);

  // ----- Night table next to the bed -----
  const nt = new THREE.Group();
  nt.position.set(-W / 2 + 1.95, 0, -D / 2 + 0.45);
  nt.add(box(0.45, 0.05, 0.4, woodMat, 0, 0.55, 0)); // top
  nt.add(box(0.4, 0.5, 0.36, woodDark, 0, 0.3, 0)); // body
  nt.add(box(0.34, 0.16, 0.02, woodMat, 0, 0.42, 0.19)); // drawer front
  const handle = new THREE.Mesh(geo(new THREE.SphereGeometry(0.022, 16, 12)), metalMat);
  handle.position.set(0, 0.42, 0.21);
  nt.add(handle);
  // small lamp
  nt.add(box(0.12, 0.02, 0.12, woodDark, 0, 0.59, 0));
  const lampStem = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 12)), metalMat);
  lampStem.position.set(0, 0.7, 0);
  nt.add(lampStem);
  const shade = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.09, 0.12, 0.14, 20, 1, true)),
    mat(new THREE.MeshStandardMaterial({ color: "#f3e2bd", roughness: 1, side: THREE.DoubleSide })),
  );
  shade.position.set(0, 0.86, 0);
  nt.add(shade);
  const bulb = new THREE.PointLight(0xffd9a0, 2.5, 4, 2);
  bulb.position.set(0, 0.85, 0);
  nt.add(bulb);
  nt.name = "nightTable";
  group.add(nt);

  // ----- Wardrobe against the right wall -----
  const wd = new THREE.Group();
  wd.position.set(W / 2 - 0.32, 0, 0.4);
  wd.add(box(0.6, 2.1, 1.2, woodDark, 0, 1.05, 0));
  wd.add(box(0.03, 1.98, 0.56, woodMat, -0.31, 1.05, -0.3)); // left door
  wd.add(box(0.03, 1.98, 0.56, woodMat, -0.31, 1.05, 0.3)); // right door
  const h1 = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 12)), metalMat);
  h1.position.set(-0.34, 1.1, -0.06);
  const h2 = h1.clone();
  h2.position.z = 0.06;
  wd.add(h1, h2);
  wd.add(box(0.64, 0.06, 1.26, woodMat, 0, 2.13, 0)); // cornice
  wd.name = "wardrobe";
  group.add(wd);

  // ----- Desk against the front wall, left of the door -----
  const desk = new THREE.Group();
  const deskW = 1.2;
  const deskD = 0.6;
  const deskH = 0.75;
  const deskX = -0.7;
  const deskZ = 2.45 - deskD / 2; // back against the front wall
  desk.position.set(deskX, 0, deskZ);

  // desktop
  desk.add(box(deskW, 0.04, deskD, woodMat, 0, deskH, 0));

  // two legs on the right side (drawer pedestal supports the left)
  const legW = 0.06;
  const legH = deskH - 0.04;
  for (const lz of [deskD / 2 - legW / 2, -deskD / 2 + legW / 2]) {
    desk.add(box(legW, legH, legW, woodDark, deskW / 2 - legW / 2, legH / 2, lz));
  }

  // drawer pedestal on the left side
  const pedW = 0.4;
  const pedD = 0.5;
  const pedCx = -deskW / 2 + pedW / 2;
  desk.add(box(pedW, legH, pedD, woodDark, pedCx, legH / 2, 0));
  // three drawer fronts + knobs
  for (let i = 0; i < 3; i++) {
    const dy = 0.04 + i * (legH / 3);
    desk.add(box(pedW - 0.06, legH / 3 - 0.03, 0.02, woodMat, pedCx, dy, pedD / 2));
    const knobMesh = new THREE.Mesh(geo(new THREE.SphereGeometry(0.018, 12, 10)), metalMat);
    knobMesh.position.set(pedCx, dy, pedD / 2 + 0.02);
    desk.add(knobMesh);
  }

  // desk lamp on the right-rear corner of the desktop
  const dlamp = new THREE.Group();
  dlamp.add(box(0.1, 0.02, 0.1, woodDark, 0, 0.012, 0)); // base
  const dStem = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 10)), metalMat);
  dStem.position.y = 0.13;
  dlamp.add(dStem);
  const dShade = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.07, 0.1, 0.12, 18, 1, true)),
    mat(new THREE.MeshStandardMaterial({ color: "#f3e2bd", roughness: 1, side: THREE.DoubleSide })),
  );
  dShade.position.y = 0.25;
  dlamp.add(dShade);
  const dLight = new THREE.PointLight(0xffd9a0, 2, 3, 2);
  dLight.position.y = 0.24;
  dlamp.add(dLight);
  dlamp.position.set(deskW / 2 - 0.15, deskH + 0.04, deskD / 2 - 0.15);
  desk.add(dlamp);

  desk.name = "desk";
  group.add(desk);

  // ----- Window on the back wall (does not pierce the wall) -----
  const win = new THREE.Group();
  const winW = 1.3;
  const winH = 1.1;
  const winY = 1.45;
  const winX = 0.85;
  const wallZ = -D / 2 + 0.055; // just in front of the back wall surface

  // scenery image (lit like a bright outdoor view)
  const sceneryTex = new THREE.TextureLoader().load(scenery.url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
  });
  sceneryTex.colorSpace = THREE.SRGBColorSpace;
  const sceneryMat = mat(
    new THREE.MeshBasicMaterial({ map: sceneryTex, toneMapped: false }),
  );
  const view = new THREE.Mesh(geo(new THREE.PlaneGeometry(winW, winH)), sceneryMat);
  view.position.set(winX, winY, wallZ + 0.005);
  view.name = "windowView";
  win.add(view);

  // frame around the view
  const frameMat = woodMat;
  const fT = 0.08; // frame thickness
  win.add(box(winW + fT * 2, fT, 0.1, frameMat, winX, winY + winH / 2 + fT / 2, wallZ + 0.02));
  win.add(box(winW + fT * 2, fT, 0.1, frameMat, winX, winY - winH / 2 - fT / 2, wallZ + 0.02));
  win.add(box(fT, winH, 0.1, frameMat, winX - winW / 2 - fT / 2, winY, wallZ + 0.02));
  win.add(box(fT, winH, 0.1, frameMat, winX + winW / 2 + fT / 2, winY, wallZ + 0.02));
  // muntins (cross bars)
  win.add(box(0.035, winH, 0.03, frameMat, winX, winY, wallZ + 0.02));
  win.add(box(winW, 0.035, 0.03, frameMat, winX, winY, wallZ + 0.02));
  // sill
  win.add(box(winW + fT * 2 + 0.1, 0.05, 0.18, woodDark, winX, winY - winH / 2 - fT, wallZ + 0.06));

  // curtain rail
  const railMat = metalMat;
  const rail = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.02, 0.02, winW + 0.7, 12).rotateZ(Math.PI / 2)),
    railMat,
  );
  rail.position.set(winX, winY + winH / 2 + 0.24, wallZ + 0.14);
  win.add(rail);
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(geo(new THREE.SphereGeometry(0.035, 16, 12)), railMat);
    cap.position.set(winX + s * (winW / 2 + 0.35), rail.position.y, rail.position.z);
    win.add(cap);
  }

  // curtains: gently waved cloth panels hanging on both sides
  const curtainMat = mat(
    new THREE.MeshStandardMaterial({ color: "#c8d8e6", roughness: 1, side: THREE.DoubleSide }),
  );
  const curtainH = winH + 0.55;
  for (const s of [-1, 1]) {
    const cw = 0.55;
    const g = geo(new THREE.PlaneGeometry(cw, curtainH, 12, 1));
    const pos = g.attributes["position"] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, Math.sin((x / cw) * Math.PI * 3) * 0.045);
    }
    g.computeVertexNormals();
    const panel = new THREE.Mesh(g, curtainMat);
    panel.position.set(
      winX + s * (winW / 2 + 0.06 + cw / 2 - 0.12),
      rail.position.y - 0.04 - curtainH / 2,
      wallZ + 0.14,
    );
    panel.castShadow = true;
    win.add(panel);
  }

  win.name = "window";
  group.add(win);

  // subtle daylight spilling from the window
  const dayLight = new THREE.PointLight(0xdcecff, 3, 6, 2);
  dayLight.position.set(winX, winY, wallZ + 0.4);
  group.add(dayLight);

  // ----- Rug -----
  const rug = new THREE.Mesh(
    geo(new THREE.CircleGeometry(0.9, 48).rotateX(-Math.PI / 2)),
    mat(new THREE.MeshStandardMaterial({ color: "#9c5f56", roughness: 1 })),
  );
  rug.position.set(0.1, 0.005, 0.9);
  rug.receiveShadow = true;
  group.add(rug);

  // ----- Lighting -----
  const ambient = new THREE.HemisphereLight(0xdfe8ff, 0x4a4034, 0.6);
  group.add(ambient);

  const ceilingLight = new THREE.PointLight(0xfff2dd, 12, 12, 2);
  ceilingLight.position.set(0, H - 0.25, 0);
  ceilingLight.castShadow = true;
  group.add(ceilingLight);
  const fixture = new THREE.Mesh(
    geo(new THREE.SphereGeometry(0.12, 20, 16)),
    mat(new THREE.MeshStandardMaterial({ color: "#fff6e6", emissive: 0xffe9c4, emissiveIntensity: 1 })),
  );
  fixture.position.set(0, H - 0.22, 0);
  group.add(fixture);

  return {
    group,
    doorHandle,
    bounds: { minX: -W / 2 + 0.35, maxX: W / 2 - 0.35, minZ: -D / 2 + 0.35, maxZ: D / 2 - 0.35 },
    dispose: () => {
      disposables.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      disposables.length = 0;
      mats.length = 0;
    },
  };
}
