import * as THREE from "three";
import scenery from "@/assets/landschaft.avif.asset.json";
import type { Room } from "./bedroom";

/**
 * Level 3 — "Breakfast": a normal-sized kitchen (3.4m x 4m, 2.6m ceiling)
 * with base cabinets, wall cabinets, a stove, a fridge, a window and a small table.
 */

const W = 3.4; // x
const D = 4; // z
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

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo(new THREE.BoxGeometry(w, h, d)), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function createKitchen(): Room {
  const group = new THREE.Group();

  const wallMat = mat(new THREE.MeshStandardMaterial({ color: "#e4ded2", roughness: 0.9 }));
  const floorMat = mat(new THREE.MeshStandardMaterial({ color: "#b0a493", roughness: 0.7 }));
  const ceilMat = mat(new THREE.MeshStandardMaterial({ color: "#f4f0ea", roughness: 1 }));
  const woodMat = mat(new THREE.MeshStandardMaterial({ color: "#6b4a30", roughness: 0.7 }));
  const woodDark = mat(new THREE.MeshStandardMaterial({ color: "#4c3421", roughness: 0.65 }));
  const cabMat = mat(new THREE.MeshStandardMaterial({ color: "#dbe3e6", roughness: 0.5 }));
  const cabFront = mat(new THREE.MeshStandardMaterial({ color: "#eef3f5", roughness: 0.4 }));
  const counterMat = mat(new THREE.MeshStandardMaterial({ color: "#3b3f45", roughness: 0.35 }));
  const metalMat = mat(new THREE.MeshStandardMaterial({ color: "#c9b072", roughness: 0.35, metalness: 0.8 }));
  const chrome = mat(new THREE.MeshStandardMaterial({ color: "#cfd6da", roughness: 0.15, metalness: 0.95 }));
  const steel = mat(new THREE.MeshStandardMaterial({ color: "#b8bec4", roughness: 0.28, metalness: 0.85 }));
  const black = mat(new THREE.MeshStandardMaterial({ color: "#1c1e21", roughness: 0.3 }));

  // Floor + ceiling
  const floor = new THREE.Mesh(geo(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2)), floorMat);
  floor.receiveShadow = true;
  group.add(floor);

  const ceiling = new THREE.Mesh(geo(new THREE.PlaneGeometry(W, D).rotateX(Math.PI / 2)), ceilMat);
  ceiling.position.y = H;
  group.add(ceiling);

  // Walls
  group.add(box(W, H, 0.1, wallMat, 0, H / 2, -D / 2)); // back (window wall)
  group.add(box(0.1, H, D, wallMat, -W / 2, H / 2, 0)); // left (counter wall)
  group.add(box(0.1, H, D, wallMat, W / 2, H / 2, 0)); // right

  // ----- Front wall with a door (identical build to the other rooms) -----
  const doorW = 0.9;
  const doorH = 2.05;
  const doorX = 0.6;
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

  // ----- Base cabinet run along the left wall -----
  const baseD = 0.6; // depth
  const baseH = 0.88; // counter height
  const runZStart = -D / 2 + 0.1;
  const runZEnd = 1.0;
  const runLen = runZEnd - runZStart;
  const runCz = (runZStart + runZEnd) / 2;
  const baseX = -W / 2 + baseD / 2 + 0.05;

  const base = new THREE.Group();
  base.add(box(baseD, baseH - 0.1, runLen, cabMat, baseX, (baseH - 0.1) / 2 + 0.1, runCz));
  // plinth
  base.add(box(baseD - 0.06, 0.1, runLen, black, baseX, 0.05, runCz));
  // counter top
  base.add(box(baseD + 0.04, 0.05, runLen + 0.02, counterMat, baseX, baseH + 0.025, runCz));
  // splash back
  base.add(box(0.02, 0.35, runLen, cabFront, -W / 2 + 0.06, baseH + 0.2, runCz));

  // ----- Stove built into one of the bottom cabinets -----
  const stoveZ = runZStart + 0.45;
  const stove = new THREE.Group();
  // oven front
  stove.add(box(0.03, 0.62, 0.58, steel, baseX - baseD / 2 - 0.005, 0.5, stoveZ));
  const ovenGlass = box(0.02, 0.34, 0.44, black, baseX - baseD / 2 - 0.02, 0.55, stoveZ);
  stove.add(ovenGlass);
  const ovenHandle = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.016, 0.016, 0.5, 12).rotateX(Math.PI / 2)),
    chrome,
  );
  ovenHandle.position.set(baseX - baseD / 2 - 0.06, 0.78, stoveZ);
  stove.add(ovenHandle);
  for (let i = 0; i < 4; i++) {
    const knob = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 14).rotateZ(Math.PI / 2)), chrome);
    knob.position.set(baseX - baseD / 2 - 0.03, 0.26, stoveZ - 0.22 + i * 0.145);
    stove.add(knob);
  }
  // hob on the counter
  stove.add(box(baseD - 0.06, 0.02, 0.58, black, baseX, baseH + 0.06, stoveZ));
  for (const dx of [-0.13, 0.13]) {
    for (const dz of [-0.15, 0.15]) {
      const ring = new THREE.Mesh(
        geo(new THREE.TorusGeometry(0.085, 0.008, 8, 24).rotateX(-Math.PI / 2)),
        steel,
      );
      ring.position.set(baseX + dx, baseH + 0.075, stoveZ + dz);
      stove.add(ring);
    }
  }
  stove.name = "stove";
  base.add(stove);

  // sink section further along the run
  const sinkZ = runZEnd - 0.5;
  const basin = box(0.44, 0.02, 0.4, steel, baseX, baseH + 0.05, sinkZ);
  base.add(basin);
  base.add(box(0.46, 0.14, 0.42, steel, baseX, baseH - 0.02, sinkZ));
  const spout = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.015, 0.02, 0.28, 12)), chrome);
  spout.position.set(baseX - 0.2, baseH + 0.18, sinkZ);
  base.add(spout);
  const spoutArm = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.013, 0.013, 0.18, 12).rotateZ(Math.PI / 2)),
    chrome,
  );
  spoutArm.position.set(baseX - 0.12, baseH + 0.31, sinkZ);
  base.add(spoutArm);

  // cabinet door fronts + handles between stove and sink
  const doorZones = [
    stoveZ + 0.42,
    stoveZ + 0.42 + 0.55,
  ];
  for (const dz of doorZones) {
    if (dz + 0.26 > runZEnd) continue;
    base.add(box(0.02, baseH - 0.2, 0.5, cabFront, baseX - baseD / 2 - 0.015, 0.45, dz));
    const hnd = new THREE.Mesh(
      geo(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 10).rotateX(Math.PI / 2)),
      chrome,
    );
    hnd.position.set(baseX - baseD / 2 - 0.055, 0.72, dz);
    base.add(hnd);
  }
  base.name = "baseCabinets";
  group.add(base);

  // ----- Wall cabinets above the base run -----
  const wallCabD = 0.35;
  const wallCabH = 0.7;
  const wallCabY = 1.55;
  const wallCabX = -W / 2 + wallCabD / 2 + 0.05;
  const wc = new THREE.Group();
  wc.add(box(wallCabD, wallCabH, runLen - 0.4, cabMat, wallCabX, wallCabY + wallCabH / 2, runCz + 0.1));
  // two door fronts
  for (const dz of [runCz - 0.35, runCz + 0.55]) {
    wc.add(box(0.02, wallCabH - 0.06, 0.7, cabFront, wallCabX - wallCabD / 2 - 0.015, wallCabY + wallCabH / 2, dz));
    const hnd = new THREE.Mesh(
      geo(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 10).rotateX(Math.PI / 2)),
      chrome,
    );
    hnd.position.set(wallCabX - wallCabD / 2 - 0.055, wallCabY + 0.12, dz);
    wc.add(hnd);
  }
  // extractor hood above the stove
  const hood = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.14, 0.32, 0.22, 4).rotateY(Math.PI / 4)),
    steel,
  );
  hood.position.set(wallCabX + 0.06, wallCabY - 0.05, stoveZ);
  hood.scale.z = 1.8;
  wc.add(hood);
  wc.add(box(0.22, 0.55, 0.24, steel, wallCabX, wallCabY + 0.3, stoveZ));
  wc.name = "wallCabinets";
  group.add(wc);

  // ----- Fridge in the back-right corner -----
  const fridge = new THREE.Group();
  const frW = 0.7;
  const frD = 0.68;
  const frH = 1.85;
  // Rotate 90° so the door faces the cabinets (-X wall), and pull it 15cm off the window wall.
  fridge.rotation.y = -Math.PI / 2;
  // After rotation the 0.68 depth lies along X, so keep it flush to the right wall.
  fridge.position.set(W / 2 - frD / 2 - 0.08, 0, -D / 2 + frW / 2 + 0.1 + 0.15);
  const doorT = 0.07;
  // ---- hollow cabinet: separate panels so nothing is co-planar (no z-fighting) ----
  const t = 0.05;
  const zFront = frD / 2 - doorT; // plane of the door opening
  const zBack = -frD / 2;
  const cavD = zFront - (zBack + t); // usable interior depth
  const cavCz = (zBack + t + zFront) / 2;

  const inner = mat(new THREE.MeshStandardMaterial({ color: "#f2f6f8", roughness: 0.85 }));
  const glassMat = mat(
    new THREE.MeshStandardMaterial({
      color: "#dff0f5",
      roughness: 0.05,
      metalness: 0,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    }),
  );

  fridge.add(box(frW, frH, t, steel, 0, frH / 2, zBack + t / 2)); // back
  fridge.add(box(t, frH, frD - doorT, steel, -frW / 2 + t / 2, frH / 2, -doorT / 2)); // left
  fridge.add(box(t, frH, frD - doorT, steel, frW / 2 - t / 2, frH / 2, -doorT / 2)); // right
  fridge.add(box(frW - 2 * t, t, cavD, steel, 0, t / 2, cavCz)); // bottom
  fridge.add(box(frW - 2 * t, t, cavD, steel, 0, frH - t / 2, cavCz)); // top

  // white liner just in front of each structural panel (offset avoids co-planar faces)
  fridge.add(box(frW - 2 * t - 0.01, frH - 2 * t - 0.01, 0.012, inner, 0, frH / 2, zBack + t + 0.008));
  fridge.add(box(0.012, frH - 2 * t - 0.01, cavD - 0.01, inner, -frW / 2 + t + 0.008, frH / 2, cavCz));
  fridge.add(box(0.012, frH - 2 * t - 0.01, cavD - 0.01, inner, frW / 2 - t - 0.008, frH / 2, cavCz));
  fridge.add(box(frW - 2 * t - 0.02, 0.012, cavD - 0.01, inner, 0, t + 0.008, cavCz));

  // ceiling light strip
  const strip = box(
    frW - 2 * t - 0.14,
    0.02,
    0.1,
    mat(new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: 0xffffff, emissiveIntensity: 1.2 })),
    0,
    frH - t - 0.02,
    cavCz - cavD / 2 + 0.14,
  );
  fridge.add(strip);
  const fridgeLamp = new THREE.PointLight(0xf2fbff, 2.2, 1.1, 2);
  fridgeLamp.position.set(0, frH - t - 0.08, cavCz);
  fridge.add(fridgeLamp);

  // ---- glass shelves ----
  const shelfY = [0.42, 0.78, 1.12, 1.46];
  const shelfW = frW - 2 * t - 0.02;
  const shelfD = cavD - 0.04;
  for (const sy of shelfY) {
    fridge.add(box(shelfW, 0.014, shelfD, glassMat, 0, sy, cavCz));
    fridge.add(box(shelfW, 0.02, 0.012, inner, 0, sy - 0.02, cavCz + shelfD / 2)); // front rail
  }

  // ---- clear storage bins with colourful produce ----
  const binMat = mat(
    new THREE.MeshStandardMaterial({
      color: "#e8f4f8",
      roughness: 0.08,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    }),
  );
  const pm = (c: string, rough = 0.5) =>
    mat(new THREE.MeshStandardMaterial({ color: c, roughness: rough }));

  const M = {
    tomato: pm("#d2352b", 0.35),
    cucumber: pm("#3f7f2c"),
    carrot: pm("#e2761f"),
    leaf: pm("#4f8f34"),
    lettuce: pm("#7fc04a", 0.8),
    lemon: pm("#f2d31c", 0.45),
    pepperRed: pm("#c4272f", 0.3),
    pepperGreen: pm("#3f9c35", 0.3),
    berry: pm("#c62449", 0.4),
    grape: pm("#6f3f7a", 0.35),
    grapeGreen: pm("#b7c94a", 0.35),
    orange: pm("#ec8a12", 0.6),
    apple: pm("#8dc63f", 0.3),
    stem: pm("#5b4326", 0.9),
    butter: pm("#f6f0d8", 0.7),
    label: pm("#3aa6d8", 0.6),
    yogurtPink: pm("#e4508f", 0.5),
    yogurtWhite: pm("#f4f4f2", 0.6),
    carton: pm("#f0e6c8", 0.85),
    cartonTop: pm("#e0703a", 0.7),
    canA: pm("#f2a0c0", 0.25),
    canB: pm("#8fd3e8", 0.25),
    eggShell: pm("#e9c9a2", 0.75),
    eggTray: pm("#dfe6ea", 0.5),
    lid: pm("#c0392b", 0.35),
  };

  type Kind =
    | "tomato"
    | "cucumber"
    | "carrot"
    | "lettuce"
    | "lemon"
    | "pepper"
    | "berry"
    | "grape"
    | "orange"
    | "apple"
    | "butter"
    | "yogurt"
    | "carton"
    | "can"
    | "eggs";

  // Builds one produce/packaged item of the given kind, sized around `r`.
  const makeItem = (kind: Kind, r: number, i: number): THREE.Object3D => {
    const g = new THREE.Group();
    const add = (m: THREE.Mesh) => {
      m.castShadow = true;
      g.add(m);
      return m;
    };
    switch (kind) {
      case "tomato": {
        const s = add(new THREE.Mesh(geo(new THREE.SphereGeometry(r, 14, 12)), M.tomato));
        s.scale.y = 0.85;
        s.position.y = r * 0.85;
        add(new THREE.Mesh(geo(new THREE.ConeGeometry(r * 0.35, r * 0.3, 5)), M.leaf)).position.y = r * 1.6;
        break;
      }
      case "cucumber": {
        const c = add(
          new THREE.Mesh(geo(new THREE.CapsuleGeometry(r * 0.55, r * 2.4, 6, 12).rotateX(Math.PI / 2)), M.cucumber),
        );
        c.position.y = r * 0.55;
        c.rotation.y = (i % 3) * 0.25 - 0.25;
        break;
      }
      case "carrot": {
        const c = add(
          new THREE.Mesh(geo(new THREE.ConeGeometry(r * 0.5, r * 3.2, 10).rotateZ(Math.PI / 2)), M.carrot),
        );
        c.position.y = r * 0.5;
        c.rotation.y = (i % 2 ? 0.3 : -0.35) + i * 0.05;
        const top = add(new THREE.Mesh(geo(new THREE.ConeGeometry(r * 0.45, r * 0.9, 6)), M.leaf));
        top.position.set(-Math.cos(c.rotation.y) * r * 1.7, r * 0.9, Math.sin(c.rotation.y) * r * 1.7);
        break;
      }
      case "lettuce": {
        const l = add(new THREE.Mesh(geo(new THREE.IcosahedronGeometry(r, 1)), M.lettuce));
        l.scale.set(1, 0.7, 1);
        l.position.y = r * 0.7;
        l.rotation.y = i;
        break;
      }
      case "lemon": {
        const l = add(new THREE.Mesh(geo(new THREE.SphereGeometry(r, 14, 12)), M.lemon));
        l.scale.set(1.25, 0.9, 0.9);
        l.position.y = r * 0.9;
        l.rotation.y = i * 0.7;
        break;
      }
      case "pepper": {
        const body = add(
          new THREE.Mesh(geo(new THREE.SphereGeometry(r, 14, 12)), i % 2 ? M.pepperGreen : M.pepperRed),
        );
        body.scale.set(0.95, 1.15, 0.95);
        body.position.y = r * 1.15;
        const st = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(r * 0.14, r * 0.2, r * 0.5, 8)), M.stem));
        st.position.y = r * 2.3;
        break;
      }
      case "berry": {
        const b = add(new THREE.Mesh(geo(new THREE.ConeGeometry(r, r * 1.8, 10)), M.berry));
        b.rotation.x = Math.PI;
        b.position.y = r * 0.9;
        b.rotation.z = 0.25 * (i % 3);
        break;
      }
      case "grape": {
        const sph = geo(new THREE.SphereGeometry(r * 0.55, 8, 6));
        const gm = i % 2 ? M.grapeGreen : M.grape;
        for (let k = 0; k < 7; k++) {
          const b = add(new THREE.Mesh(sph, gm));
          b.position.set(
            Math.cos(k * 1.9) * r * 0.6,
            r * 0.55 + (k % 3) * r * 0.5,
            Math.sin(k * 1.9) * r * 0.6,
          );
        }
        break;
      }
      case "orange": {
        const o = add(new THREE.Mesh(geo(new THREE.SphereGeometry(r, 16, 12)), M.orange));
        o.position.y = r;
        break;
      }
      case "apple": {
        const a = add(new THREE.Mesh(geo(new THREE.SphereGeometry(r, 14, 12)), M.apple));
        a.scale.y = 0.92;
        a.position.y = r * 0.92;
        const st = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(r * 0.08, r * 0.08, r * 0.4, 6)), M.stem));
        st.position.y = r * 1.9;
        break;
      }
      case "butter": {
        const b = add(new THREE.Mesh(geo(new THREE.BoxGeometry(r * 2.6, r * 1.1, r * 1.6)), M.butter));
        b.position.y = r * 0.55;
        const lb = add(new THREE.Mesh(geo(new THREE.BoxGeometry(r * 1.8, r * 0.6, 0.004)), M.label));
        lb.position.set(0, r * 0.6, r * 0.8 + 0.003);
        break;
      }
      case "yogurt": {
        const c = add(
          new THREE.Mesh(
            geo(new THREE.CylinderGeometry(r * 0.7, r * 0.6, r * 1.7, 14)),
            i % 2 ? M.yogurtPink : M.yogurtWhite,
          ),
        );
        c.position.y = r * 0.85;
        const lid = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(r * 0.74, r * 0.74, r * 0.12, 14)), M.lid));
        lid.position.y = r * 1.75;
        break;
      }
      case "carton": {
        const c = add(new THREE.Mesh(geo(new THREE.BoxGeometry(r * 1.5, r * 3.4, r * 1.5)), M.carton));
        c.position.y = r * 1.7;
        const cap = add(new THREE.Mesh(geo(new THREE.BoxGeometry(r * 1.5, r * 0.5, r * 1.5)), M.cartonTop));
        cap.position.y = r * 3.6;
        break;
      }
      case "can": {
        const c = add(
          new THREE.Mesh(geo(new THREE.CylinderGeometry(r * 0.62, r * 0.62, r * 2.2, 16)), i % 2 ? M.canA : M.canB),
        );
        c.position.y = r * 1.1;
        break;
      }
      case "eggs": {
        const tray = add(new THREE.Mesh(geo(new THREE.BoxGeometry(r * 3.2, r * 0.5, r * 2.2)), M.eggTray));
        tray.position.y = r * 0.25;
        const egg = geo(new THREE.SphereGeometry(r * 0.45, 10, 8));
        for (let k = 0; k < 6; k++) {
          const e = add(new THREE.Mesh(egg, M.eggShell));
          e.scale.y = 1.3;
          e.position.set(-r * 1.05 + (k % 3) * r * 1.05, r * 0.7, k < 3 ? -r * 0.5 : r * 0.5);
        }
        break;
      }
    }
    return g;
  };

  const addBin = (
    cx: number,
    cy: number,
    bw: number,
    bd: number,
    bh: number,
    kind: Kind,
    count: number,
    r: number,
  ) => {
    const wall = 0.008;
    // four walls + floor, none co-planar with the shelf below
    fridge.add(box(bw, bh, wall, binMat, cx, cy + bh / 2, cavCz - bd / 2));
    fridge.add(box(bw, bh, wall, binMat, cx, cy + bh / 2, cavCz + bd / 2));
    fridge.add(box(wall, bh, bd, binMat, cx - bw / 2, cy + bh / 2, cavCz));
    fridge.add(box(wall, bh, bd, binMat, cx + bw / 2, cy + bh / 2, cavCz));
    fridge.add(box(bw, wall, bd, binMat, cx, cy + wall / 2 + 0.004, cavCz));
    const cols = Math.min(3, count);
    for (let i = 0; i < count; i++) {
      const item = makeItem(kind, r, i);
      const row = Math.floor(i / cols);
      item.position.set(
        cx + ((i % cols) - (cols - 1) / 2) * ((bw - r * 1.6) / cols),
        cy + 0.014,
        cavCz + (row === 0 ? -bd / 5 : bd / 5) + (Math.random() - 0.5) * 0.015,
      );
      item.rotation.y += (Math.random() - 0.5) * 0.6;
      fridge.add(item);
    }
  };

  // free-standing items placed directly on a shelf (no bin)
  const addOnShelf = (kind: Kind, r: number, x: number, y: number, z: number, i = 0, ry = 0) => {
    const it = makeItem(kind, r, i);
    it.position.set(x, y + 0.012, z);
    it.rotation.y = ry;
    fridge.add(it);
  };

  const binW = (frW - 2 * t) / 2 - 0.05;
  const leftX = -binW / 2 - 0.035;
  const rightX = binW / 2 + 0.035;
  const zFrontRow = cavCz + cavD / 2 - 0.09;

  // top shelf: cucumbers + carrots in shallow bins — the front strip is kept
  // free for the grabbable GLB items (juice bottle, pepper, egg carton).
  addBin(leftX, shelfY[3]!, binW, cavD - 0.26, 0.13, "cucumber", 4, 0.026);
  addBin(rightX, shelfY[3]!, binW, cavD - 0.26, 0.13, "carrot", 4, 0.024);


  // third shelf: peppers + lemons, butter pack and yogurts in front
  addBin(leftX, shelfY[2]!, binW, cavD - 0.12, 0.14, "pepper", 4, 0.032);
  addBin(rightX, shelfY[2]!, binW, cavD - 0.12, 0.14, "lemon", 5, 0.027);
  addOnShelf("butter", 0.035, leftX - 0.02, shelfY[2]!, zFrontRow);
  addOnShelf("yogurt", 0.038, rightX - 0.03, shelfY[2]!, zFrontRow, 0);
  addOnShelf("yogurt", 0.038, rightX + 0.05, shelfY[2]!, zFrontRow, 1);

  // second shelf: strawberries + grapes, juice carton in the middle
  addBin(leftX, shelfY[1]!, binW, cavD - 0.12, 0.12, "berry", 6, 0.022);
  addBin(rightX, shelfY[1]!, binW, cavD - 0.12, 0.12, "grape", 4, 0.024);
  addOnShelf("carton", 0.032, 0.0, shelfY[1]!, zFrontRow);

  // first shelf: salad greens + apples, egg tray and cans in front
  addBin(leftX, shelfY[0]!, binW, cavD - 0.12, 0.12, "lettuce", 4, 0.03);
  addBin(rightX, shelfY[0]!, binW, cavD - 0.12, 0.12, "apple", 4, 0.03);
  addOnShelf("butter", 0.035, leftX, shelfY[0]!, zFrontRow, 1);
  addOnShelf("can", 0.04, rightX + 0.02, shelfY[0]!, zFrontRow, 0);
  addOnShelf("can", 0.04, rightX + 0.09, shelfY[0]!, zFrontRow, 1);

  // bottom crisper drawer: oranges and a few tomatoes
  addBin(0, t + 0.02, frW - 2 * t - 0.06, cavD - 0.08, 0.3, "orange", 6, 0.045);
  addOnShelf("tomato", 0.04, -0.14, t + 0.05, cavCz + cavD / 4, 0);
  addOnShelf("tomato", 0.04, 0.15, t + 0.05, cavCz + cavD / 4, 1);



  // hinged door leaf — pivot on the +X edge, swings out toward +Z
  const fridgeDoor = new THREE.Group();
  fridgeDoor.position.set(frW / 2, 0, frD / 2 - doorT);
  fridgeDoor.add(box(frW, frH, doorT, steel, -frW / 2, frH / 2, doorT / 2));
  // door split line
  fridgeDoor.add(box(frW - 0.02, 0.02, 0.02, black, -frW / 2, frH * 0.65, doorT + 0.005));
  for (const hy of [frH * 0.72, frH * 0.45]) {
    const fh = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 12)), chrome);
    fh.position.set(-frW + 0.1, hy, doorT + 0.05);
    fridgeDoor.add(fh);
  }
  // interaction anchors
  const grabHandle = new THREE.Object3D();
  grabHandle.position.set(-frW + 0.1, frH * 0.58, doorT + 0.05);
  grabHandle.name = "fridgeHandle";
  fridgeDoor.add(grabHandle);
  const grabEdge = new THREE.Object3D();
  grabEdge.position.set(-frW + 0.02, frH * 0.5, doorT / 2);
  grabEdge.name = "fridgeEdge";
  fridgeDoor.add(grabEdge);
  fridgeDoor.name = "fridgeDoor";
  fridge.add(fridgeDoor);
  fridge.name = "fridge";
  group.add(fridge);


  // ----- Window on the back wall (same as the bedroom) -----
  const win = new THREE.Group();
  const winW = 1.3;
  const winH = 1.1;
  const winY = 1.45;
  const winX = -0.35;
  const wallZ = -D / 2 + 0.055;

  const sceneryTex = new THREE.TextureLoader().load(scenery.url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
  });
  sceneryTex.colorSpace = THREE.SRGBColorSpace;
  const sceneryMat = mat(new THREE.MeshBasicMaterial({ map: sceneryTex, toneMapped: false }));
  const view = new THREE.Mesh(geo(new THREE.PlaneGeometry(winW, winH)), sceneryMat);
  view.position.set(winX, winY, wallZ + 0.005);
  view.name = "windowView";
  win.add(view);

  const fT = 0.08;
  win.add(box(winW + fT * 2, fT, 0.1, woodMat, winX, winY + winH / 2 + fT / 2, wallZ + 0.02));
  win.add(box(winW + fT * 2, fT, 0.1, woodMat, winX, winY - winH / 2 - fT / 2, wallZ + 0.02));
  win.add(box(fT, winH, 0.1, woodMat, winX - winW / 2 - fT / 2, winY, wallZ + 0.02));
  win.add(box(fT, winH, 0.1, woodMat, winX + winW / 2 + fT / 2, winY, wallZ + 0.02));
  win.add(box(0.035, winH, 0.03, woodMat, winX, winY, wallZ + 0.02));
  win.add(box(winW, 0.035, 0.03, woodMat, winX, winY, wallZ + 0.02));
  win.add(box(winW + fT * 2 + 0.1, 0.05, 0.18, woodDark, winX, winY - winH / 2 - fT, wallZ + 0.06));

  const rail = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.02, 0.02, winW + 0.7, 12).rotateZ(Math.PI / 2)),
    metalMat,
  );
  rail.position.set(winX, winY + winH / 2 + 0.24, wallZ + 0.14);
  win.add(rail);
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(geo(new THREE.SphereGeometry(0.035, 16, 12)), metalMat);
    cap.position.set(winX + s * (winW / 2 + 0.35), rail.position.y, rail.position.z);
    win.add(cap);
  }

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

  const dayLight = new THREE.PointLight(0xdcecff, 3, 6, 2);
  dayLight.position.set(winX, winY, wallZ + 0.4);
  group.add(dayLight);

  // ----- Small table against the right wall, between the fridge and the door -----
  const table = new THREE.Group();
  const tW = 0.9; // along x — this edge touches the right wall
  const tD = 0.7; // along z
  const tH = 0.75;
  // push flush against the right wall (x = +W/2), centered between the fridge and the door
  table.position.set(W / 2 - tW / 2 - 0.02, 0, 0.4);
  table.add(box(tW, 0.05, tD, woodMat, 0, tH, 0));
  const legT = 0.06;
  for (const lx of [-tW / 2 + 0.1, tW / 2 - 0.1]) {
    for (const lz of [-tD / 2 + 0.1, tD / 2 - 0.1]) {
      table.add(box(legT, tH - 0.05, legT, woodDark, lx, (tH - 0.05) / 2, lz));
    }
  }
  // a chair that faces +z by default (backrest on the -z side, seat faces +z)
  const makeChair = () => {
    const chair = new THREE.Group();
    chair.add(box(0.38, 0.04, 0.38, woodMat, 0, 0.45, 0)); // seat
    chair.add(box(0.05, 0.5, 0.05, woodDark, -0.15, 0.7, -0.16)); // backrest post
    chair.add(box(0.05, 0.5, 0.05, woodDark, 0.15, 0.7, -0.16)); // backrest post
    chair.add(box(0.34, 0.4, 0.05, woodMat, 0, 0.72, -0.15)); // backrest panel
    for (const lx of [-0.15, 0.15]) {
      for (const lz of [-0.15, 0.15]) {
        chair.add(box(0.045, 0.45, 0.045, woodDark, lx, 0.225, lz));
      }
    }
    return chair;
  };
  // chair on the fridge side (-z), faces the table (+z)
  const chairA = makeChair();
  chairA.position.set(0, 0, -0.62);
  table.add(chairA);
  // chair on the door side (+z), faces the table (-z)
  const chairB = makeChair();
  chairB.position.set(0, 0, 0.62);
  chairB.rotation.y = Math.PI;
  table.add(chairB);
  table.name = "table";
  group.add(table);

  // ----- Lighting -----
  group.add(new THREE.HemisphereLight(0xeef4ff, 0x4f4a42, 0.7));
  const ceilingLight = new THREE.PointLight(0xfff4e2, 13, 12, 2);
  ceilingLight.position.set(0, H - 0.25, 0.2);
  ceilingLight.castShadow = true;
  group.add(ceilingLight);
  const fixture = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 24)),
    mat(new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: 0xfff0d8, emissiveIntensity: 1 })),
  );
  fixture.position.set(0, H - 0.06, 0.2);
  group.add(fixture);

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
