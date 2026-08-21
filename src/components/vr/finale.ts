import * as THREE from "three";

export const YOUTUBE_ID = "eF5Yqcb0RCM";
export const YOUTUBE_URL = `https://www.youtube.com/watch?v=${YOUTUBE_ID}`;

export type Finale = {
  group: THREE.Group;
  /** The TV panel the player can point at to start the video. */
  screen: THREE.Mesh;
  dispose: () => void;
};

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Final world: the start environment plus a congratulation panel 4 m opposite
 * the menu and a big TV screen off to the side.
 */
export function createFinale(): Finale {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const texs: THREE.Texture[] = [];

  // ----- Congratulation text box (4 m opposite the menu at z = -2) -----
  const tex = canvasTexture(1280, 512, (ctx) => {
    const w = 1280;
    const h = 512;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(18,24,42,0.94)");
    g.addColorStop(1, "rgba(10,14,26,0.94)");
    ctx.fillStyle = g;
    roundRect(ctx, 10, 10, w - 20, h - 20, 40);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,190,120,0.6)";
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffd8a8";
    ctx.font = `700 84px ${FONT}`;
    ctx.fillText("Congratulation,", w / 2, h / 2 - 90);
    ctx.fillStyle = "#f2f7ff";
    ctx.font = `600 62px ${FONT}`;
    ctx.fillText("you have completed", w / 2, h / 2 + 10);
    ctx.fillText("your morning routine!", w / 2, h / 2 + 100);
  });
  texs.push(tex);
  const panelGeo = new THREE.PlaneGeometry(2.4, 0.96);
  const panelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  geos.push(panelGeo);
  mats.push(panelMat);
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.position.set(0, 1.6, 2);
  panel.rotation.y = Math.PI; // faces the player standing between menu and panel
  group.add(panel);

  // ----- Big TV to the side -----
  const tv = new THREE.Group();
  tv.position.set(3.6, 0, 1.2);
  tv.lookAt(new THREE.Vector3(0, 0, 0.2));

  const frameGeo = new THREE.BoxGeometry(3.3, 1.95, 0.12);
  const frameMat = new THREE.MeshStandardMaterial({ color: "#14181f", roughness: 0.5 });
  geos.push(frameGeo);
  mats.push(frameMat);
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.set(0, 1.9, 0);
  tv.add(frame);

  const standGeo = new THREE.BoxGeometry(0.24, 0.95, 0.24);
  const standMat = new THREE.MeshStandardMaterial({ color: "#0e1116", roughness: 0.6 });
  geos.push(standGeo);
  mats.push(standMat);
  const stand = new THREE.Mesh(standGeo, standMat);
  stand.position.set(0, 0.47, 0);
  tv.add(stand);
  const footGeo = new THREE.BoxGeometry(1.4, 0.08, 0.5);
  geos.push(footGeo);
  const foot = new THREE.Mesh(footGeo, standMat);
  foot.position.set(0, 0.04, 0);
  tv.add(foot);

  const thumbTex = new THREE.TextureLoader().load(
    `https://img.youtube.com/vi/${YOUTUBE_ID}/maxresdefault.jpg`,
  );
  thumbTex.colorSpace = THREE.SRGBColorSpace;
  texs.push(thumbTex);
  const screenGeo = new THREE.PlaneGeometry(3.1, 1.75);
  const screenMat = new THREE.MeshBasicMaterial({ map: thumbTex, toneMapped: false });
  geos.push(screenGeo);
  mats.push(screenMat);
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, 1.9, 0.065);
  screen.name = "tvScreen";
  tv.add(screen);




  group.add(tv);

  const light = new THREE.PointLight(0xffe0c0, 6, 14, 2);
  light.position.set(1.5, 3, 1.5);
  group.add(light);

  return {
    group,
    screen,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      texs.forEach((t) => t.dispose());
    },
  };
}
