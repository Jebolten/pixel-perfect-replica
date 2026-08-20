import * as THREE from "three";

export type PanelState = {
  hover: boolean;
  selected: boolean;
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

export function makeCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { texture: tex, canvas, ctx };
}

export function drawTitlePanel(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(16,22,38,0.94)");
  g.addColorStop(1, "rgba(10,14,26,0.94)");
  ctx.fillStyle = g;
  roundRect(ctx, 8, 8, w - 16, h - 16, 36);
  ctx.fill();
  ctx.strokeStyle = "rgba(126,206,255,0.45)";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f2f7ff";
  ctx.font = `600 76px ${FONT}`;
  ctx.fillText("Virtual Agnosia", w / 2, h / 2 - 44);
  ctx.fillStyle = "#7ecEff";
  ctx.font = `500 56px ${FONT}`;
  ctx.fillText("Morning Routine", w / 2, h / 2 + 40);
}

export function drawButton(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  label: string,
  sub: string | null,
  state: PanelState,
  accent = false,
) {
  ctx.clearRect(0, 0, w, h);
  const base: [number, number, number] = accent ? [30, 92, 120] : [22, 30, 48];
  const boost = state.hover ? 40 : 0;
  const sel = state.selected;
  ctx.fillStyle = sel
    ? "rgba(126,206,255,0.95)"
    : `rgba(${base[0] + boost},${base[1] + boost},${base[2] + boost},0.94)`;
  roundRect(ctx, 6, 6, w - 12, h - 12, 28);
  ctx.fill();
  ctx.strokeStyle = state.hover ? "rgba(180,232,255,0.95)" : "rgba(126,206,255,0.4)";
  ctx.lineWidth = state.hover ? 6 : 3;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = sel ? "#08111f" : "#eaf4ff";
  ctx.font = `600 ${sub ? 46 : 54}px ${FONT}`;
  ctx.fillText(label, w / 2, sub ? h / 2 - 22 : h / 2);
  if (sub) {
    ctx.fillStyle = sel ? "rgba(8,17,31,0.75)" : "rgba(200,220,240,0.7)";
    ctx.font = `400 32px ${FONT}`;
    ctx.fillText(sub, w / 2, h / 2 + 32);
  }
}
