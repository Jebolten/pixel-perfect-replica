import * as THREE from "three";
import photoAsset from "@/assets/family_photo.jpg.asset.json";

/** Where the standing picture frame rests on the bedroom desk (room-local). */
export const FRAME_REST_POSITION = new THREE.Vector3(-0.48, 0.772, 2.22);
export const FRAME_REST_ROTATION_Y = Math.PI;

export type PhotoFrame = {
  group: THREE.Group;
  /** Radius used for grab proximity checks. */
  radius: number;
  resetToDesk: () => void;
  dispose: () => void;
};

/** A small standing photo frame with a kickstand, holding the family picture. */
export function createPhotoFrame(): PhotoFrame {
  const group = new THREE.Group();
  group.name = "photoFrame";

  const w = 0.18;
  const h = 0.14;
  const d = 0.015;
  const border = 0.016;

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a4f2a, roughness: 0.65 });

  // Backing panel (pivot at the bottom edge so it stands on the desk).
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat);
  back.position.set(0, h / 2, 0);
  back.castShadow = true;
  group.add(back);

  // Photo texture on the front face.
  const texture = new THREE.TextureLoader().load(photoAsset.url);
  texture.colorSpace = THREE.SRGBColorSpace;
  const photo = new THREE.Mesh(
    new THREE.PlaneGeometry(w - border * 2, h - border * 2),
    new THREE.MeshBasicMaterial({ map: texture })
  );
  photo.position.set(0, h / 2, d / 2 + 0.001);
  group.add(photo);

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

  // Slight backwards tilt, like a real standing frame.
  group.rotation.x = -0.12;
  group.position.copy(FRAME_REST_POSITION);
  group.rotation.y = FRAME_REST_ROTATION_Y;

  return {
    group,
    radius: 0.12,
    resetToDesk: () => {
      group.position.copy(FRAME_REST_POSITION);
      group.rotation.set(-0.12, FRAME_REST_ROTATION_Y, 0);
      group.scale.setScalar(1);
    },
    dispose: () => {
      texture.dispose();
    },
  };
}
