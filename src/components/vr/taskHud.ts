import * as THREE from "three";

/** One entry of the morning-routine to-do list. */
export type TaskDef = { id: string; label: string };
export type TaskGroup = { room: string; tasks: TaskDef[] };

export const TASK_GROUPS: TaskGroup[] = [
  {
    room: "Level 1 — Bedroom",
    tasks: [
      { id: "clock", label: "Turn off the alarm clock" },
      { id: "phone", label: "Answer the telephone" },
      { id: "door1", label: "Leave through the door" },
    ],
  },
  {
    room: "Level 2 — Bathroom",
    tasks: [
      { id: "toothbrush", label: "Grab the toothbrush" },
      { id: "sunscreen", label: "Grab the sunscreen" },
      { id: "door2", label: "Leave through the door" },
    ],
  },
  {
    room: "Level 3 — Kitchen",
    tasks: [
      { id: "juice", label: "Orange juice on the counter" },
      { id: "door3", label: "Leave through the door" },
    ],
  },
];

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

export type TaskHud = {
  mesh: THREE.Mesh;
  update: (done: Set<string>) => void;
  dispose: () => void;
};

const ALL_TASKS: TaskDef[] = TASK_GROUPS.flatMap((g) => g.tasks);

/**
 * Compact, see-through objective banner near the centre of the field of view.
 * Shows only the current objective and its index, e.g. "Task 3/8".
 */
export function createTaskHud(): TaskHud {
  const W = 768;
  const H = 176;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.75,
    depthTest: false,
    depthWrite: false,
  });
  const geometry = new THREE.PlaneGeometry(0.28, 0.064);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0.16, 0.19, -1.0);
  mesh.renderOrder = 999;
  mesh.frustumCulled = false;

  const draw = (done: Set<string>) => {
    ctx.clearRect(0, 0, W, H);

    const total = ALL_TASKS.length;
    const index = ALL_TASKS.findIndex((t) => !done.has(t.id));
    const current = index === -1 ? null : ALL_TASKS[index];

    ctx.fillStyle = "rgba(10,14,26,0.55)";
    roundRect(ctx, 6, 6, W - 12, H - 12, 34);
    ctx.fill();
    ctx.strokeStyle = "rgba(126,206,255,0.35)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (!current) {
      ctx.fillStyle = "#9beec2";
      ctx.font = `600 44px ${FONT}`;
      ctx.fillText("All tasks complete", W / 2, H / 2);
    } else {
      ctx.fillStyle = "#7ecEff";
      ctx.font = `600 32px ${FONT}`;
      ctx.fillText(`Task ${index + 1}/${total}`, W / 2, 56);
      ctx.fillStyle = "#f2f7ff";
      ctx.font = `500 40px ${FONT}`;
      ctx.fillText(current.label, W / 2, 112);
    }

    texture.needsUpdate = true;
  };

  draw(new Set());

  return {
    mesh,
    update: draw,
    dispose: () => {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}

