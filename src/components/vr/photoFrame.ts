import * as THREE from "three";
import photoNormal from "@/assets/family_photo_normal.png.asset.json";
import photoFaceless from "@/assets/family_photo_faceless.png.asset.json";

/** Where the standing picture frame rests on the bedroom desk (room-local). */
export const FRAME_REST_POSITION = new THREE.Vector3(-0.48, 0.772, 2.22);
export const FRAME_REST_ROTATION_Y = Math.PI;

export type PhotoFrame = {
  group: THREE.Group;
  /** Radius used for grab proximity checks. */
  radius: number;
  /** Call when the player grabs the frame: starts the 3s fade to the faceless photo. */
  pickUp: () => void;
  /** Per-frame update, dt in seconds. */
  update: (dt: number) => void;
  resetToDesk: () => void;
  dispose: () => void;
};

function makeLabelTexture(text: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.font = "bold 68px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillText(text, c.width / 2 + 3, c.height / 2 + 3);
  ctx.fillStyle = "#f6ecd8";
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A small standing photo frame with a kickstand, holding the family picture. */
export function createPhotoFrame(): PhotoFrame {
  const group = new THREE.Group();
  group.name = "photoFrame";

  // Portrait format, matching the photographs.
  const w = 0.14;
  const h = 0.19;
  const d = 0.015;
  const border = 0.014;

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a4f2a, roughness: 0.65 });

  // Backing panel (pivot at the bottom edge so it stands on the desk).
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat);
  back.position.set(0, h / 2, 0);
  back.castShadow = true;
  group.add(back);

  const loader = new THREE.TextureLoader();
  const texNormal = loader.load(photoNormal.url);
  texNormal.colorSpace = THREE.SRGBColorSpace;
  const texFaceless = loader.load(photoFaceless.url);
  texFaceless.colorSpace = THREE.SRGBColorSpace;

  const photoGeo = new THREE.PlaneGeometry(w - border * 2, h - border * 2);
  const matNormal = new THREE.MeshBasicMaterial({ map: texNormal });
  const matFaceless = new THREE.MeshBasicMaterial({
    map: texFaceless,
    transparent: true,
    opacity: 0,
  });

  const photo = new THREE.Mesh(photoGeo, matNormal);
  photo.position.set(0, h / 2, d / 2 + 0.001);
  group.add(photo);

  const photoAlt = new THREE.Mesh(photoGeo, matFaceless);
  photoAlt.position.set(0, h / 2, d / 2 + 0.002);
  group.add(photoAlt);

  // Raised frame lip around the photo.
  const lip = (lw: number, lh: number, x: number, y: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(lw, lh, 0.008), woodMat);
    m.position.set(x, y, d / 2 + 0.004);
    group.add(m);
  };
  lip(w, border, 0, h - border / 2);
  lip(w, border, 0, border / 2);
  lip(border, h, -w / 2 + border / 2, h / 2);
  lip(border, h, w / 2 - border / 2, h / 2);

  // Kickstand leaning backwards.
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.04, h * 0.85, 0.008), woodMat);
  stand.position.set(0, h * 0.4, -0.035);
  stand.rotation.x = 0.35;
  group.add(stand);

  // "Prosopagnosia" label floating just above the frame.
  const labelTex = makeLabelTexture("Prosopagnosia");
  const labelMat = new THREE.SpriteMaterial({
    map: labelTex,
    transparent: true,
    opacity: 0,
    depthTest: false,
  });
  const label = new THREE.Sprite(labelMat);
  label.scale.set(0.24, 0.06, 1);
  label.position.set(0, h + 0.06, 0.01);
  label.renderOrder = 10;
  group.add(label);

  // Slight backwards tilt, like a real standing frame.
  group.rotation.x = -0.12;
  group.position.copy(FRAME_REST_POSITION);
  group.rotation.y = FRAME_REST_ROTATION_Y;

  let held = false;
  let t = 0;

  const DELAY = 3;
  const FADE = 1.2;
  const LABEL_IN = 0.4;
  const LABEL_HOLD = 2.4;
  const LABEL_OUT = 0.8;

  return {
    group,
    radius: 0.12,
    pickUp: () => {
      if (held) return;
      held = true;
      t = 0;
    },
    update: (dt: number) => {
      if (!held) return;
      t += dt;
      const after = t - DELAY;
      if (after <= 0) return;
      matFaceless.opacity = Math.min(1, after / FADE);
      // label appears with the faceless photo, then fades out again
      let o = 0;
      if (after < LABEL_IN) o = after / LABEL_IN;
      else if (after < LABEL_IN + LABEL_HOLD) o = 1;
      else if (after < LABEL_IN + LABEL_HOLD + LABEL_OUT)
        o = 1 - (after - LABEL_IN - LABEL_HOLD) / LABEL_OUT;
      labelMat.opacity = o;
    },
    resetToDesk: () => {
      group.position.copy(FRAME_REST_POSITION);
      group.rotation.set(-0.12, FRAME_REST_ROTATION_Y, 0);
      group.scale.setScalar(1);
      held = false;
      t = 0;
      matFaceless.opacity = 0;
      labelMat.opacity = 0;
    },
    dispose: () => {
      texNormal.dispose();
      texFaceless.dispose();
      labelTex.dispose();
      photoGeo.dispose();
      matNormal.dispose();
      matFaceless.dispose();
      labelMat.dispose();
    },
  };
}
