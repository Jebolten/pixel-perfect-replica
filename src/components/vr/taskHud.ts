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

/**
 * Small to-do / score board pinned to the top-right of the player's field of view.
 * Attach the returned mesh to the camera.
 */
export function createTaskHud(): TaskHud {
  const W = 560;
  const H = 720;
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
    depthTest: false,
    depthWrite: false,
  });
  const geometry = new THREE.PlaneGeometry(0.34, 0.437);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0.44, 0.3, -1.0);
  mesh.renderOrder = 999;
  mesh.frustumCulled = false;

  const draw = (done: Set<string>) => {
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(14,20,34,0.88)");
    g.addColorStop(1, "rgba(9,12,22,0.88)");
    ctx.fillStyle = g;
    roundRect(ctx, 8, 8, W - 16, H - 16, 30);
    ctx.fill();
    ctx.strokeStyle = "rgba(126,206,255,0.45)";
    ctx.lineWidth = 3;
    ctx.stroke();

    const total = TASK_GROUPS.reduce((n, gr) => n + gr.tasks.length, 0);
    const count = TASK_GROUPS.reduce(
      (n, gr) => n + gr.tasks.filter((t) => done.has(t.id)).length,
      0,
    );

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f2f7ff";
    ctx.font = `600 38px ${FONT}`;
    ctx.fillText("Morning Routine", 36, 56);
    ctx.fillStyle = "#7ecEff";
    ctx.font = `500 30px ${FONT}`;
    ctx.fillText(`${count} / ${total} done`, 36, 100);

    let y = 152;
    for (const group of TASK_GROUPS) {
      ctx.fillStyle = "rgba(160,200,235,0.85)";
      ctx.font = `600 26px ${FONT}`;
      ctx.fillText(group.room.toUpperCase(), 36, y);
      y += 40;
      for (const task of group.tasks) {
        const ok = done.has(task.id);
        ctx.strokeStyle = ok ? "#6ee7a8" : "rgba(180,205,230,0.55)";
        ctx.lineWidth = 3;
        roundRect(ctx, 38, y - 15, 30, 30, 8);
        ctx.stroke();
        if (ok) {
          ctx.strokeStyle = "#6ee7a8";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(45, y);
          ctx.lineTo(52, y + 8);
          ctx.lineTo(62, y - 9);
          ctx.stroke();
        }
        ctx.fillStyle = ok ? "rgba(150,235,190,0.95)" : "#e6f0fa";
        ctx.font = `${ok ? 400 : 500} 27px ${FONT}`;
        ctx.fillText(task.label, 84, y + 1);
        if (ok) {
          const w = ctx.measureText(task.label).width;
          ctx.strokeStyle = "rgba(150,235,190,0.7)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(84, y + 2);
          ctx.lineTo(84 + w, y + 2);
          ctx.stroke();
        }
        y += 44;
      }
      y += 22;
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
