import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
import { drawButton, drawTitlePanel, makeCanvasTexture } from "./menuTextures";
import { createBedroom, type Room } from "./bedroom";
import { createBathroom } from "./bathroom";
import { createKitchen } from "./kitchen";

import { loadAlarmClock, CLOCK_REST_POSITION, type AlarmClock } from "./alarmClock";
import { loadPhone, PHONE_REST_POSITION, PHONE_REST_ROTATION_Y } from "./phone";
import { createPhotoFrame, type PhotoFrame } from "./photoFrame";
import { loadToothbrushHolder, HOLDER_REST_POSITION } from "./toothbrushHolder";
import {
  loadHairbrush,
  loadSunscreen,
  HAIRBRUSH_REST_POSITION,
  SUNSCREEN_REST_POSITION,
} from "./cabinetItems";
import { loadCandle, loadCoffeeMug } from "./tableItems";
import { loadFridgeItems, type GrabbableItem } from "./fridgeItems";
import { createAgnosiaMask, distanceToBox, type AgnosiaMask } from "./agnosia";
import { createTaskHud, TASK_GROUPS } from "./taskHud";
import { createFinale, YOUTUBE_ID, type Finale } from "./finale";

import { createAlarmSound } from "./alarmSound";
import { createPhoneRing } from "./phoneRing";
import { createGrampaMessage } from "./grampaMessage";

type MenuItem = {
  id: string;
  label: string;
  sub: string | null;
  accent?: boolean;
  mesh: THREE.Mesh;
  redraw: (hover: boolean, selected: boolean) => void;
};

const SKY_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SKY_FRAG = /* glsl */ `
  varying vec3 vWorldPos;
  uniform vec3 topColor;
  uniform vec3 midColor;
  uniform vec3 bottomColor;
  void main() {
    float h = normalize(vWorldPos).y;
    vec3 col = h > 0.0
      ? mix(midColor, topColor, pow(clamp(h, 0.0, 1.0), 0.65))
      : mix(midColor, bottomColor, pow(clamp(-h, 0.0, 1.0), 0.5));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function VRScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<string>("");
  const [doneTasks, setDoneTasks] = useState<string[]>([]);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const vrButton = VRButton.createButton(renderer);
    vrButton.classList.add("vr-enter-button");
    mount.appendChild(vrButton);

    if (typeof navigator !== "undefined" && !("xr" in navigator)) {
      setStatus("WebXR is not available in this browser. Open on a VR headset browser to play.");
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 400);
    camera.position.set(0, 1.6, 0);

    // Player rig: move this to teleport / turn.
    const player = new THREE.Group();
    player.add(camera);
    scene.add(player);

    // ---------- Current objective banner (hidden in the start / end world) ----------
    const hud = createTaskHud();
    hud.mesh.visible = false;
    camera.add(hud.mesh);
    const doneSet = new Set<string>();
    const completeTask = (id: string) => {
      if (doneSet.has(id)) return;
      doneSet.add(id);
      hud.update(doneSet);
      setDoneTasks([...doneSet]);
    };
    const resetTasks = () => {
      doneSet.clear();
      hud.update(doneSet);
      setDoneTasks([]);
    };



    // Gradient sky
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(200, 48, 32),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        uniforms: {
          topColor: { value: new THREE.Color("#1b3a6e") },
          midColor: { value: new THREE.Color("#e85a8e") },
          bottomColor: { value: new THREE.Color("#ff9e5a") },
        },
      }),
    );
    scene.add(sky);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: "#4a7a3a", roughness: 0.95, metalness: 0 }),
    );
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(60, 60, 0xff9e5a, 0x7a5a8a);
    (grid.material as THREE.Material).opacity = 0.35;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = 0.002;
    scene.add(grid);

    scene.add(new THREE.HemisphereLight(0xffd9a0, 0x4a3a4a, 1.3));
    const sun = new THREE.DirectionalLight(0xffb070, 1.3);
    sun.position.set(4, 8, 3);
    scene.add(sun);

    // ---------- Menu ----------
    const menu = new THREE.Group();
    menu.position.set(0, 1.45, -2);
    scene.add(menu);

    const backing = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.6),
      new THREE.MeshBasicMaterial({ color: 0x0a1120, transparent: true, opacity: 0.35 }),
    );
    backing.position.z = -0.02;
    menu.add(backing);

    const title = makeCanvasTexture(1024, 320, (ctx) => drawTitlePanel(ctx, 1024, 320));
    const titleMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.44),
      new THREE.MeshBasicMaterial({ map: title.texture, transparent: true }),
    );
    titleMesh.position.y = 0.52;
    menu.add(titleMesh);

    const items: MenuItem[] = [];
    const defs = [
      { id: "start", label: "Start", sub: null, y: 0.16, accent: true },
      { id: "level-1", label: "Level 1", sub: "Waking Up", y: -0.08, accent: false },
      { id: "level-2", label: "Level 2", sub: "The Bathroom", y: -0.30, accent: false },
      { id: "level-3", label: "Level 3", sub: "Breakfast", y: -0.52, accent: false },
    ];

    for (const def of defs) {
      const { texture, ctx, canvas } = makeCanvasTexture(768, 160, (c) =>
        drawButton(c, 768, 160, def.label, def.sub, { hover: false, selected: false }, def.accent),
      );
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(def.accent ? 0.8 : 1.24, def.accent ? 0.2 : 0.19),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
      );
      mesh.position.set(0, def.y, 0);
      menu.add(mesh);
      items.push({
        id: def.id,
        label: def.label,
        sub: def.sub,
        accent: def.accent,
        mesh,
        redraw: (hover, selected) => {
          drawButton(ctx, canvas.width, canvas.height, def.label, def.sub, { hover, selected }, def.accent);
          texture.needsUpdate = true;
        },
      });
    }

    let selectedLevel = "level-1";
    const refreshMenu = (hoveredId: string | null) => {
      for (const item of items) {
        item.redraw(hoveredId === item.id, item.id === selectedLevel);
      }
    };
    refreshMenu(null);

    // ---------- Controllers ----------
    const controllerModelFactory = new XRControllerModelFactory();
    const rayGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);

    type Ctrl = {
      controller: THREE.XRTargetRaySpace;
      grip: THREE.XRGripSpace;
      ray: THREE.Line;
      handedness: string;
      teleporting: boolean;
      holding: boolean;
      holdingFrame: boolean;
      holdingPhone: boolean;
      holdingItem: GrabbableItem | null;
      turningHandle: boolean;
      source: XRInputSource | null;
    };

    const ctrls: Ctrl[] = [0, 1].map((i) => {
      const controller = renderer.xr.getController(i);
      const ray = new THREE.Line(
        rayGeom,
        new THREE.LineBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.7 }),
      );
      ray.scale.z = 5;
      controller.add(ray);
      player.add(controller);

      const grip = renderer.xr.getControllerGrip(i);
      grip.add(controllerModelFactory.createControllerModel(grip));
      player.add(grip);

      return {
        controller,
        grip,
        ray,
        handedness: "none",
        teleporting: false,
        holding: false,
        holdingFrame: false,
        holdingPhone: false,
        holdingItem: null,
        turningHandle: false,
        source: null,
      };
    });

    ctrls.forEach((c) => {
      c.controller.addEventListener("connected", (event: unknown) => {
        const src = (event as { data: XRInputSource }).data;
        c.source = src;
        c.handedness = src.handedness ?? "none";
      });
      c.controller.addEventListener("disconnected", () => {
        c.source = null;
        c.handedness = "none";
      });
    });

    // ---------- Teleport arc ----------
    const ARC_SEGMENTS = 40;
    const arcPositions = new Float32Array(ARC_SEGMENTS * 3);
    const arcGeom = new THREE.BufferGeometry();
    arcGeom.setAttribute("position", new THREE.BufferAttribute(arcPositions, 3));
    const arc = new THREE.Line(
      arcGeom,
      new THREE.LineBasicMaterial({ color: 0x7ecEff, transparent: true, opacity: 0.9 }),
    );
    arc.frustumCulled = false;
    arc.visible = false;
    scene.add(arc);

    const marker = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.3, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x7ecEff, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x7ecEff, transparent: true, opacity: 0.25, side: THREE.DoubleSide }),
    );
    marker.add(ring, disc);
    marker.position.y = 0.01;
    marker.visible = false;
    scene.add(marker);

    const tmpPos = new THREE.Vector3();
    const tmpDir = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();
    const camWorld = new THREE.Vector3();
    let teleportTarget: THREE.Vector3 | null = null;

    const computeArc = (origin: THREE.Vector3, dir: THREE.Vector3): THREE.Vector3 | null => {
      const speed = 7;
      const g = -9.8;
      const v = dir.clone().multiplyScalar(speed);
      let hit: THREE.Vector3 | null = null;
      let last = origin.clone();
      for (let i = 0; i < ARC_SEGMENTS; i++) {
        const t = i * 0.045;
        const p = new THREE.Vector3(
          origin.x + v.x * t,
          origin.y + v.y * t + 0.5 * g * t * t,
          origin.z + v.z * t,
        );
        if (!hit && p.y <= 0 && last.y > 0) {
          const alpha = last.y / (last.y - p.y);
          hit = last.clone().lerp(p, alpha);
          hit.y = 0;
        }
        const clamped = hit ? hit : p;
        arcPositions[i * 3] = clamped.x;
        arcPositions[i * 3 + 1] = clamped.y;
        arcPositions[i * 3 + 2] = clamped.z;
        last = p;
      }
      arcGeom.attributes['position']!.needsUpdate = true;
      if (hit) {
        if (room) {
          const b = room.bounds;
          if (hit.x < b.minX || hit.x > b.maxX || hit.z < b.minZ || hit.z > b.maxZ) hit = null;
          else if (blockers.some((r) => hit!.x > r.minX && hit!.x < r.maxX && hit!.z > r.minZ && hit!.z < r.maxZ))
            hit = null;
        } else if (hit.length() > 29) {
          hit = null;
        }
      }
      return hit;
    };

    /** Footprints (world XZ) the player must not teleport into. The bed is walkable. */
    let blockers: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
    const BLOCKING_NAMES = [
      "nightTable",
      "wardrobe",
      "desk",
      "sink",
      "toilet",
      "cabinet",
      "stove",
      "baseCabinets",
      "fridge",
      "table",
    ];
    const refreshBlockers = () => {
      blockers = [];
      if (!room) return;
      const box = new THREE.Box3();
      for (const name of BLOCKING_NAMES) {
        const obj = room.group.getObjectByName(name);
        if (!obj) continue;
        box.setFromObject(obj);
        if (box.isEmpty()) continue;
        // Ignore purely overhead geometry (nothing to bump into at floor level).
        if (box.min.y > 1.3) continue;
        blockers.push({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z });
      }
    };


    const raycaster = new THREE.Raycaster();
    let hoveredId: string | null = null;
    let room: Room | null = null;
    let level: "none" | "bedroom" | "bathroom" | "kitchen" | "finale" = "none";
    let finale: Finale | null = null;
    let videoPlaying = false;
    let clock3d: AlarmClock | null = null;
    let clockTouched = false;
    let heldBy: Ctrl | null = null;
    let frame3d: PhotoFrame | null = null;
    let heldFrameBy: Ctrl | null = null;
    let disposed = false;
    let ringing = false;
    let transitioning = false;
    let fridgeDoor: THREE.Group | null = null;
    let fridgeHandle: THREE.Object3D | null = null;
    let fridgeEdge: THREE.Object3D | null = null;
    let fridgeOpen = false;
    let fridgeGroup: THREE.Object3D | null = null;
  let fridgeItems: GrabbableItem[] = [];
  /** Grabbable bathroom items (toothbrush holder, hairbrush, sunscreen). */
  let bathroomItems: GrabbableItem[] = [];
  /** Grabbable kitchen-table items (candle, coffee mug). */
  let tableItems: GrabbableItem[] = [];
    const alarmSound = createAlarmSound();
    const phoneRing = createPhoneRing();
    const grampaMessage = createGrampaMessage();
    let phone3d: THREE.Group | null = null;
    let heldPhoneBy: Ctrl | null = null;
    let phoneCallTimer: ReturnType<typeof setTimeout> | null = null;
    /** True when the phone was grabbed while it was actually ringing (task 2 answered). */
    let phoneAnswered = false;
    /** Task 2 is done once the Grampa message has been played. */
    let task2Complete = false;
    let task3Complete = false;
    /** Task 4: grab the toothbrush. Task 5: grab the sunscreen. */
    let task4Complete = false;
    let task5Complete = false;
    /** Task 7: carry the orange juice out of the fridge onto the kitchen counter. */
    let task7Complete = false;
    /** The juice bottle sticks to the hand until it is placed on the counter. */
    let juiceHeldBy: Ctrl | null = null;
    /** Free counter area (kitchen-local): the run along the left wall, without the hob. */
    const COUNTER = { minX: -1.8, maxX: -0.8, minZ: -1.05, maxZ: 0.9, surfaceY: 0.93 };

    // ---------- Visual agnosia filter ----------
    /** Fixed objects: revealed while a controller is within 10 cm. */
    type StaticMask = { mask: AgnosiaMask; box: THREE.Box3 };
    let staticMasks: StaticMask[] = [];
    /** Movable objects: revealed only while they are grabbed. */
    let itemMasks: AgnosiaMask[] = [];
    const REACH = 0.1;

    const addStaticMask = (name: string, exclude?: (o: THREE.Object3D) => boolean) => {
      const obj = room?.group.getObjectByName(name);
      if (!obj) return;
      const box = new THREE.Box3().setFromObject(obj);
      const mask = createAgnosiaMask(obj, exclude ? { exclude } : {});
      if (!mask) return;
      staticMasks.push({ mask, box });
    };


    const addItemMask = (obj: THREE.Object3D | null | undefined) => {
      if (!obj) return;
      const mask = createAgnosiaMask(obj);
      if (mask) itemMasks.push(mask);
    };

    const clearMasks = () => {
      staticMasks.forEach((s) => s.mask.dispose());
      itemMasks.forEach((m) => m.dispose());
      staticMasks = [];
      itemMasks = [];
    };


    /** Task 2: 10 s after the very first clock touch, the phone starts calling. */
    const markClockTouched = () => {
      if (clockTouched) return;
      clockTouched = true;
      completeTask("clock");
      phoneCallTimer = setTimeout(() => {
        phoneCallTimer = null;
        if (disposed || level !== "bedroom") return;
        phoneRing.start();
        setStatus("The telephone is ringing — grab it to answer.");
      }, 10000);
    };

    const stopPhoneCall = () => {
      if (phoneCallTimer) clearTimeout(phoneCallTimer);
      phoneCallTimer = null;
      phoneRing.stop();
    };

    const clearRoom = () => {
      clearMasks();
      if (heldBy) {
        heldBy.holding = false;
        heldBy = null;
      }
      alarmSound.stop();
      stopPhoneCall();
      grampaMessage.stop();
      phone3d = null;
      heldPhoneBy = null;
      phoneAnswered = false;
      ctrls.forEach((c) => (c.holdingPhone = false));
      ringing = false;
      clock3d = null;
      clockTouched = false;
      ctrls.forEach((c) => (c.holdingItem = null));
      fridgeItems = [];
      juiceHeldBy = null;
      bathroomItems = [];
      tableItems = [];
      fridgeGroup = null;
      if (heldFrameBy) {
        heldFrameBy = null;
      }

      frame3d?.dispose();
      frame3d = null;
      if (room) {
        scene.remove(room.group);
        room.dispose();
        room = null;
        blockers = [];
        fridgeDoor = null;
        fridgeHandle = null;
        fridgeEdge = null;
        fridgeOpen = false;
      }
      if (finale) {
        scene.remove(finale.group);
        finale.dispose();
        finale = null;
        videoPlaying = false;
        setShowVideo(false);
      }
    };


    const placePlayer = (x: number, z: number, y = 0) => {
      camera.getWorldPosition(camWorld);
      player.position.x += x - camWorld.x;
      player.position.z += z - camWorld.z;
      player.position.y = y;
    };

    const enterBedroom = () => {
      if (level === "bedroom") return;
      clearRoom();
      room = createBedroom();
      level = "bedroom";
      hud.mesh.visible = true;
      scene.add(room.group);
      refreshBlockers();
      menu.visible = false;
      grid.visible = false;
      floor.visible = false;
      // The player wakes up sitting on the bed.
      placePlayer(-1.15, -1.15, 0.52);
      setStatus("Level 1 — Waking Up. The alarm is ringing — grab the clock to stop it.");

      frame3d = createPhotoFrame();
      room.group.add(frame3d.group);
      addItemMask(frame3d.group);

      ["bed", "nightTable", "wardrobe", "desk", "window", "door"].forEach(addStaticMask);

      void loadAlarmClock()
        .then((clock) => {
          if (disposed || level !== "bedroom" || !room) return;
          clock3d = clock;
          room.group.add(clock.group);
          addItemMask(clock.group);
          ringing = true;
          alarmSound.start();
        })
        .catch(() => setStatus("The alarm clock model could not be loaded."));

      void loadPhone()
        .then((phoneGroup) => {
          if (disposed || level !== "bedroom" || !room) return;
          phone3d = phoneGroup;
          room.group.add(phoneGroup);
          addItemMask(phoneGroup);
        })
        .catch(() => setStatus("The telephone model could not be loaded."));
    };

    const enterBathroom = () => {
      if (level === "bathroom") return;
      clearRoom();
      room = createBathroom();
      level = "bathroom";
      hud.mesh.visible = true;
      scene.add(room.group);
      refreshBlockers();
      menu.visible = false;
      grid.visible = false;
      floor.visible = false;
      // Step in through the door, facing into the room (back to the door).
      placePlayer(-0.6, 0.9, 0);
      player.rotation.y = 0; // camera looks toward -Z, away from the front-wall door
      setStatus("Level 2 — The Bathroom.");

      ["sink", "toilet", "cabinet", "door"].forEach(addStaticMask);

      const addBathroomItem = (
        g: THREE.Group,
        rest: THREE.Vector3,
        radius: number,
      ) => {
        if (!room) return;
        const rot = g.rotation.y;
        room.group.add(g);
        addItemMask(g);
        bathroomItems.push({
          group: g,
          radius,
          reset: () => {
            g.position.copy(rest);
            g.rotation.set(0, rot, 0);
            g.scale.setScalar(1);
          },
        });
      };


      void loadToothbrushHolder()
        .then((holder) => {
          if (disposed || !room || level !== "bathroom") return;
          addBathroomItem(holder, HOLDER_REST_POSITION, 0.14);
        })
        .catch(() => setStatus("The toothbrush holder could not be loaded."));

      void Promise.all([loadHairbrush(), loadSunscreen()])
        .then(([brush, cream]) => {
          if (disposed || !room || level !== "bathroom") return;
          addBathroomItem(brush, HAIRBRUSH_REST_POSITION, 0.12);
          addBathroomItem(cream, SUNSCREEN_REST_POSITION, 0.12);
        })
        .catch(() => setStatus("The cabinet items could not be loaded."));
    };

    const enterKitchen = () => {
      if (level === "kitchen") return;
      clearRoom();
      room = createKitchen();
      level = "kitchen";
      hud.mesh.visible = true;
      scene.add(room.group);
      refreshBlockers();
      fridgeDoor = (room.group.getObjectByName("fridgeDoor") as THREE.Group) ?? null;
      fridgeHandle = room.group.getObjectByName("fridgeHandle") ?? null;
      fridgeEdge = room.group.getObjectByName("fridgeEdge") ?? null;
      fridgeOpen = false;
      fridgeGroup = room.group.getObjectByName("fridge") ?? null;
      menu.visible = false;
      grid.visible = false;
      floor.visible = false;
      // Step in through the door, back to the door, facing into the room (-Z).
      placePlayer(0.6, 1.4, 0);
      player.rotation.y = 0;
      setStatus("Level 3 — Breakfast. Welcome to the kitchen.");

      ["stove", "baseCabinets", "wallCabinets", "table", "window", "door"].forEach((n) =>
        addStaticMask(n),
      );
      // Fridge shell only — the door, its handle and the shelf contents stay untouched.
      addStaticMask("fridge", (o) => o.name === "fridgeDoor" || o.name.startsWith("fridge" + "Juice") || o.name.startsWith("fridgeBell") || o.name.startsWith("fridgeEgg"));


      void Promise.all([loadCandle(), loadCoffeeMug()])
        .then((items) => {
          if (disposed || !room || level !== "kitchen") return;
          items.forEach((g) => {
            room!.group.add(g);
            addItemMask(g);
            const rest = g.position.clone();
            const rot = g.rotation.y;
            tableItems.push({
              group: g,
              radius: 0.13,
              reset: () => {
                g.position.copy(rest);
                g.rotation.set(0, rot, 0);
                g.scale.setScalar(1);
              },
            });
          });
        })
        .catch(() => setStatus("The table items could not be loaded."));

      void loadFridgeItems()
        .then((items) => {
          if (disposed || !room || level !== "kitchen" || !fridgeGroup) return;
          items.forEach((i) => {
            fridgeGroup!.add(i.group);
            addItemMask(i.group);
          });
          fridgeItems = items;
        })
        .catch(() => setStatus("The fridge items could not be loaded."));
    };

    /** Level 4: back to the start world, now with the congratulation panel and a TV. */
    const enterFinale = () => {
      if (level === "finale") return;
      clearRoom();
      level = "finale";
      hud.mesh.visible = false;
      resetTasks();
      finale = createFinale();
      scene.add(finale.group);
      menu.visible = true;
      grid.visible = true;
      floor.visible = true;
      // Stand between the start menu (z = -2) and the congratulation panel (z = +2),
      // facing the new text with the back to the menu.
      placePlayer(0, 0, 0);
      player.rotation.y = Math.PI;
      setStatus("Congratulation, you have completed your morning routine!");
    };


    const clockWorld = new THREE.Vector3();
    const frameWorld = new THREE.Vector3();
    const phoneWorld = new THREE.Vector3();
    const handWorld = new THREE.Vector3();

    const distanceToClock = (c: Ctrl) => {
      if (!clock3d) return Infinity;
      clock3d.group.getWorldPosition(clockWorld);
      c.grip.getWorldPosition(handWorld);
      return handWorld.distanceTo(clockWorld);
    };

    const stopRinging = () => {
      if (!ringing) return;
      ringing = false;
      alarmSound.stop();
      if (clock3d) clock3d.group.position.y = CLOCK_REST_POSITION.y;
    };

    const handleWorld = new THREE.Vector3();
    const fridgeWorld = new THREE.Vector3();
    const itemWorld = new THREE.Vector3();
    const distanceToDoorHandle = (c: Ctrl) => {
      if (!room) return Infinity;
      room.doorHandle.getWorldPosition(handleWorld);
      c.grip.getWorldPosition(handWorld);
      return handWorld.distanceTo(handleWorld);
    };

    const onSqueezeStart = (c: Ctrl) => () => {
      if (room && !c.turningHandle && distanceToDoorHandle(c) < 0.29) {
        c.turningHandle = true;
        if (level === "bedroom" && !task2Complete) {
          setStatus("The door is locked — finish task 2 first (answer the phone call).");
          return;
        }
        if (level === "bathroom" && !(task4Complete && task5Complete)) {
          setStatus("The door is locked — finish tasks 4 and 5 first (toothbrush and sunscreen).");
          return;
        }
        if (level === "kitchen" && !task7Complete) {
          setStatus("The door is locked — put the orange juice on the counter first.");
          return;
        }
        if ((level === "bedroom" || level === "bathroom" || level === "kitchen") && !transitioning) {
          const from = level;
          transitioning = true;
          setStatus("You open the door…");
          window.setTimeout(() => {
            transitioning = false;
            if (disposed || level !== from) return;
            ctrls.forEach((x) => (x.turningHandle = false));
            if (from === "bedroom") {
              enterBathroom();
              if (!task3Complete) {
                task3Complete = true;
                setStatus("You enter the bathroom. Task 3 complete.");
              }
              completeTask("door1");
            } else if (from === "bathroom") {
              enterKitchen();
              setStatus("You enter the kitchen. Task 6 complete.");
              completeTask("door2");
            } else {
              enterFinale();
              completeTask("door3");
            }
          }, 600);

        } else {
          setStatus("You turn the door handle down.");
        }
        return;
      }

      // Fridge: grab the handle to open, grab the door edge to close again.
      if (fridgeDoor && fridgeHandle && fridgeEdge) {
        c.grip.getWorldPosition(handWorld);
        const anchor = fridgeOpen ? fridgeEdge : fridgeHandle;
        anchor.getWorldPosition(fridgeWorld);
        if (handWorld.distanceTo(fridgeWorld) < 0.25) {
          fridgeOpen = !fridgeOpen;
          setStatus(fridgeOpen ? "You open the fridge." : "You close the fridge.");
          return;
        }
      }

      // Groceries in the fridge: grab one, release to put it back on the shelf.
      const loose = [...fridgeItems, ...bathroomItems, ...tableItems];
      if (loose.length && !c.holdingItem) {
        c.grip.getWorldPosition(handWorld);
        let best: GrabbableItem | null = null;
        let bestD = Infinity;
        for (const it of loose) {
          if (ctrls.some((o) => o.holdingItem === it)) continue;
          it.group.getWorldPosition(itemWorld);
          const d = handWorld.distanceTo(itemWorld);
          if (d < it.radius + 0.18 && d < bestD) {
            best = it;
            bestD = d;
          }
        }
        if (best) {
          c.holdingItem = best;
          c.grip.attach(best.group);
          const n = best.group.name;
          if (n === "toothbrushHolder" && !task4Complete) {
            task4Complete = true;
            completeTask("toothbrush");
            setStatus("You grab the toothbrush. Task 4 complete.");
          } else if (n === "sunscreen" && !task5Complete) {
            task5Complete = true;
            completeTask("sunscreen");
            setStatus("You grab the sunscreen. Task 5 complete.");
          } else if (n === "fridgeJuiceBottle" && !task7Complete) {
            juiceHeldBy = c;
            setStatus("You are carrying the orange juice — bring it to the kitchen counter.");
          } else {
            setStatus("You picked something up. Release the grip to put it back.");
          }
          return;
        }
      }

      // Picture frame on the desk: grab it, release to put it back.
      if (frame3d && !heldFrameBy) {
        frame3d.group.getWorldPosition(frameWorld);
        c.grip.getWorldPosition(handWorld);
        if (handWorld.distanceTo(frameWorld) < frame3d.radius + 0.21) {
          heldFrameBy = c;
          c.holdingFrame = true;
          c.grip.attach(frame3d.group);
          setStatus("You are holding the family photo. Release the grip to put it back.");
          return;
        }
      }

      // Telephone on the desk: grab it to answer the call (task 2).
      if (phone3d && !heldPhoneBy) {
        phone3d.getWorldPosition(phoneWorld);
        c.grip.getWorldPosition(handWorld);
        if (handWorld.distanceTo(phoneWorld) < 0.28) {
          heldPhoneBy = c;
          c.holdingPhone = true;
          const wasRinging = phoneRing.playing;
          if (wasRinging) phoneAnswered = true;
          stopPhoneCall();
          c.grip.attach(phone3d);
          setStatus(
            wasRinging
              ? "You answer the telephone. Release the grip to put it back."
              : "You are holding the telephone. Release the grip to put it back.",
          );
          return;
        }
      }

      if (!clock3d || heldBy) return;
      if (distanceToClock(c) > clock3d.radius + 0.21) return;
      heldBy = c;
      c.holding = true;
      stopRinging();
      markClockTouched();
      c.grip.attach(clock3d.group);
      setStatus("You are holding the alarm clock. Release the grip to put it back.");
    };

    const onSqueezeEnd = (c: Ctrl) => () => {
      if (c.turningHandle) {
        c.turningHandle = false;
        return;
      }
      if (c.holdingItem) {
        // Task 7: the juice bottle stays in the hand until it reaches the counter.
        if (juiceHeldBy === c) return;
        const it = c.holdingItem;
        c.holdingItem = null;
        const isFridge = fridgeItems.includes(it);
        (isFridge ? (fridgeGroup ?? room?.group) : room?.group)?.add(it.group);
        it.reset();
        setStatus(isFridge ? "You put it back into the fridge." : "You put it back.");
        return;
      }
      if (c.holdingPhone && phone3d) {
        c.holdingPhone = false;
        heldPhoneBy = null;
        room?.group.add(phone3d);
        phone3d.position.copy(PHONE_REST_POSITION);
        phone3d.rotation.set(0, PHONE_REST_ROTATION_Y, 0);
        phone3d.scale.setScalar(1);
        // Task 2 completion: after answering the call, the first release
        // plays the Grampa message exactly once, then task 2 is done.
        if (phoneAnswered && !grampaMessage.played) {
          grampaMessage.playOnce();
          task2Complete = true;
          completeTask("phone");
          setStatus("The telephone is back on the desk. Task 2 complete — the bedroom door is now open.");
        } else {
          setStatus("The telephone is back on the desk.");
        }
        return;
      }
      if (c.holdingFrame && frame3d) {
        c.holdingFrame = false;
        heldFrameBy = null;
        room?.group.add(frame3d.group);
        frame3d.resetToDesk();
        setStatus("The photo frame is back on the desk.");
        return;
      }
      if (!c.holding || !clock3d) return;
      c.holding = false;
      heldBy = null;
      // Put the clock back on the night table.
      room?.group.add(clock3d.group);
      clock3d.resetToTable();
      setStatus("The alarm clock is back on the night table.");
    };

    const activateMenu = (id: string) => {
      if (id === "start") {
        if (selectedLevel === "level-1") {
          enterBedroom();
          return;
        }
        if (selectedLevel === "level-2") {
          enterBathroom();
          return;
        }
        if (selectedLevel === "level-3") {
          enterKitchen();
          return;
        }
        setStatus(`${items.find((i) => i.id === selectedLevel)?.label ?? "Level 1"} is not built yet.`);

      } else {
        selectedLevel = id;
        setStatus(`${items.find((i) => i.id === id)?.label} selected`);
      }
      refreshMenu(hoveredId);
    };

    const onSelectStart = (c: Ctrl) => () => {
      // Menu interaction takes priority when pointing at the menu.
      const hit = pickMenu(c);
      if (hit) {
        activateMenu(hit.id);
        return;
      }
      c.teleporting = true;
    };

    const onSelectEnd = (c: Ctrl) => () => {
      if (!c.teleporting) return;
      c.teleporting = false;
      arc.visible = false;
      marker.visible = false;
      if (teleportTarget) {
        camera.getWorldPosition(camWorld);
        player.position.x += teleportTarget.x - camWorld.x;
        player.position.z += teleportTarget.z - camWorld.z;
        player.position.y = 0; // leaving the bed puts you on the floor
      }
      teleportTarget = null;
    };

    const pickMenu = (c: Ctrl) => {
      if (!menu.visible) return null;
      c.controller.getWorldPosition(tmpPos);
      c.controller.getWorldQuaternion(tmpQuat);
      tmpDir.set(0, 0, -1).applyQuaternion(tmpQuat);
      raycaster.set(tmpPos, tmpDir);
      const hits = raycaster.intersectObjects(items.map((i) => i.mesh), false);
      const first = hits[0];
      if (!first) return null;
      return items.find((i) => i.mesh === first.object) ?? null;
    };

    ctrls.forEach((c) => {
      c.controller.addEventListener("selectstart", onSelectStart(c));
      c.controller.addEventListener("selectend", onSelectEnd(c));
      c.controller.addEventListener("squeezestart", onSqueezeStart(c));
      c.controller.addEventListener("squeezeend", onSqueezeEnd(c));
    });

    // ---------- Snap turn ----------
    let turnReady = true;
    const SNAP = THREE.MathUtils.degToRad(30);

    const handleTurn = () => {
      let axis = 0;
      for (const c of ctrls) {
        const gp = c.source?.gamepad;
        if (!gp) continue;
        const x = gp.axes[2] ?? gp.axes[0] ?? 0;
        if (Math.abs(x) > Math.abs(axis)) axis = x;
      }
      if (Math.abs(axis) < 0.6) {
        turnReady = true;
        return;
      }
      if (!turnReady) return;
      turnReady = false;
      const angle = axis > 0 ? -SNAP : SNAP;
      camera.getWorldPosition(camWorld);
      player.position.sub(camWorld);
      player.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      player.position.add(camWorld);
      player.rotation.y += angle;
    };

    // ---------- Loop ----------
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();
      handleTurn();

      // Teleport aiming
      let aiming = false;
      for (const c of ctrls) {
        if (!c.teleporting) continue;
        aiming = true;
        c.controller.getWorldPosition(tmpPos);
        c.controller.getWorldQuaternion(tmpQuat);
        tmpDir.set(0, 0, -1).applyQuaternion(tmpQuat);
        const hit = computeArc(tmpPos, tmpDir);
        teleportTarget = hit;
        arc.visible = true;
        marker.visible = !!hit;
        if (hit) marker.position.set(hit.x, 0.01 + Math.sin(t * 4) * 0.005, hit.z);
      }
      if (!aiming) {
        arc.visible = false;
        marker.visible = false;
        teleportTarget = null;
      }

      // Door handle: turn down while gripped
      if (room) {
        const turning = ctrls.some((c) => c.turningHandle);
        const target = turning ? -0.7 : 0;
        room.doorHandle.rotation.z += (target - room.doorHandle.rotation.z) * 0.25;
      }

      // Fridge door swing
      if (fridgeDoor) {
        const target = fridgeOpen ? 1.9 : 0;
        fridgeDoor.rotation.y += (target - fridgeDoor.rotation.y) * 0.15;
      }

      // Task 7: carrying the juice near the counter (not the hob) places it down.
      if (juiceHeldBy && room && level === "kitchen") {
        const held = juiceHeldBy.holdingItem;
        if (held) {
          juiceHeldBy.grip.getWorldPosition(handWorld);
          const local = room.group.worldToLocal(handWorld.clone());
          if (
            local.x > COUNTER.minX &&
            local.x < COUNTER.maxX &&
            local.z > COUNTER.minZ &&
            local.z < COUNTER.maxZ &&
            local.y > 0.6 &&
            local.y < 1.6
          ) {
            juiceHeldBy.holdingItem = null;
            juiceHeldBy = null;
            room.group.add(held.group);
            held.group.scale.setScalar(1);
            held.group.rotation.set(0, 0, 0);
            held.group.position.set(
              -1.32,
              COUNTER.surfaceY,
              Math.min(Math.max(local.z, COUNTER.minZ + 0.1), COUNTER.maxZ - 0.1),
            );
            task7Complete = true;
            completeTask("juice");
            // Once placed for good, the juice stays recognisable.
            const jm = itemMasks.find((m) => m.target === held.group);
            if (jm) {
              jm.dispose();
              itemMasks = itemMasks.filter((m) => m !== jm);
            }
            setStatus("You put the orange juice on the counter. Task 7 complete.");
          }
        } else {
          juiceHeldBy = null;
        }
      }

      // ---------- Visual agnosia filter ----------
      if (itemMasks.length || staticMasks.length) {
        const heldObjects = new Set<THREE.Object3D>();
        for (const c of ctrls) {
          if (c.holdingItem) heldObjects.add(c.holdingItem.group);
          if (c.holding && clock3d) heldObjects.add(clock3d.group);
          if (c.holdingPhone && phone3d) heldObjects.add(phone3d);
          if (c.holdingFrame && frame3d) heldObjects.add(frame3d.group);
        }
        for (const m of itemMasks) {
          m.setRevealed(heldObjects.has(m.target));
          if (!m.revealed) m.sync();
        }

        if (staticMasks.length) {
          for (const s of staticMasks) {
            let near = false;
            for (const c of ctrls) {
              c.grip.getWorldPosition(handWorld);
              if (distanceToBox(s.box, handWorld) <= REACH) {
                near = true;
                break;
              }
            }
            s.mask.setRevealed(near);
          }
        }
      }




      // Alarm clock: ringing hop
      if (clock3d && ringing && !heldBy) {
        clock3d.group.position.y = CLOCK_REST_POSITION.y + Math.abs(Math.sin(t * 12)) * 0.01;
      }

      // Alarm clock: touch task + grab feedback
      if (clock3d && !heldBy) {
        for (const c of ctrls) {
          if (distanceToClock(c) < clock3d.radius + 0.13) {
            if (!clockTouched) {
              markClockTouched();
              setStatus("You touched the clock. Grip to pick it up and stop the alarm.");
            }
            break;
          }
        }
      }


      // Menu hover
      let hovered: MenuItem | null = null;
      for (const c of ctrls) {
        if (c.teleporting) continue;
        const hit = pickMenu(c);
        if (hit) {
          hovered = hit;
          break;
        }
      }
      const hid = hovered?.id ?? null;
      if (hid !== hoveredId) {
        hoveredId = hid;
        refreshMenu(hoveredId);
      }

      // Final world: pointing at the TV starts the video.
      if (finale && !videoPlaying) {
        let pointing = false;
        for (const c of ctrls) {
          c.controller.getWorldPosition(tmpPos);
          c.controller.getWorldQuaternion(tmpQuat);
          tmpDir.set(0, 0, -1).applyQuaternion(tmpQuat);
          raycaster.set(tmpPos, tmpDir);
          if (raycaster.intersectObject(finale.screen, false).length) {
            pointing = true;
            break;
          }
        }
        if (!pointing && !renderer.xr.isPresenting) {
          // Desktop fallback: looking at the screen counts as pointing.
          camera.getWorldPosition(tmpPos);
          camera.getWorldDirection(tmpDir);
          raycaster.set(tmpPos, tmpDir);
          pointing = raycaster.intersectObject(finale.screen, false).length > 0;
        }
        if (pointing) {
          videoPlaying = true;
          setShowVideo(true);
          setStatus("Playing the video on the big screen.");
        }
      }

      // Non-VR idle camera drift so desktop preview shows the scene
      if (!renderer.xr.isPresenting) {
        if (level === "kitchen") {
          camera.position.set(0.5 + Math.sin(t * 0.15) * 0.25, 1.6, 1.3);
          camera.lookAt(-0.5, 1.1, -1.7);
        } else if (level === "bathroom") {
          camera.position.set(-0.4 + Math.sin(t * 0.15) * 0.2, 1.6, 0.85);
          camera.lookAt(-0.4, 1.0, -1.3);
        } else if (level === "finale") {
          camera.position.set(Math.sin(t * 0.15) * 0.4, 1.6, -0.2);
          camera.lookAt(0.8, 1.6, 2);
        } else if (room) {
          // Sitting on the bed, looking towards the night table and alarm clock.
          camera.position.set(-1.15 + Math.sin(t * 0.15) * 0.15, 1.25, -1.1);
          camera.lookAt(0.11, 0.6, -2.02);
        } else {
          camera.position.set(Math.sin(t * 0.15) * 0.35, 1.6, 0.4);
          camera.lookAt(0, 1.4, -2);
        }

      }


      renderer.render(scene, camera);
    });

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      renderer.setAnimationLoop(null);
      alarmSound.dispose();
      stopPhoneCall();
      phoneRing.dispose();
      grampaMessage.dispose();
      hud.dispose();
      finale?.dispose();
      room?.dispose();
      renderer.dispose();
      vrButton.remove();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-6 top-6 max-w-sm rounded-xl border border-border/60 bg-card/70 p-4 text-card-foreground backdrop-blur">
        <h1 className="text-lg font-semibold">Virtual Agnosia: Morning Routine</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Put on your headset and press Enter VR. Hold the left trigger to aim a teleport arc, release
          to move. Push a joystick left or right to snap-turn. Point at the menu and pull a trigger to
          choose a level or start. In Level 1 you wake up on the bed: touch the alarm clock, and hold
          the grip button to pick it up — releasing it puts it back on the night table.
        </p>
        {status ? <p className="mt-2 text-sm text-primary">{status}</p> : null}
      </div>

      <aside className="pointer-events-none absolute right-6 top-6 w-64 rounded-xl border border-border/60 bg-card/70 p-4 text-card-foreground backdrop-blur">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Morning Routine</h2>
        <p className="text-xs text-muted-foreground">
          {doneTasks.length} / {TASK_GROUPS.reduce((n, g) => n + g.tasks.length, 0)} done
        </p>
        <div className="mt-3 space-y-3">
          {TASK_GROUPS.map((group) => (
            <div key={group.room}>
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">{group.room}</p>
              <ul className="mt-1 space-y-1">
                {group.tasks.map((task) => {
                  const ok = doneTasks.includes(task.id);
                  return (
                    <li
                      key={task.id}
                      className={`text-xs ${ok ? "text-primary line-through" : "text-card-foreground"}`}
                    >
                      {ok ? "☑" : "☐"} {task.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      {showVideo ? (
        <div className="absolute bottom-6 right-6 w-[420px] max-w-[70vw] overflow-hidden rounded-xl border border-border/60 bg-black shadow-lg">
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube.com/embed/${YOUTUBE_ID}?autoplay=1`}
            title="Visual Agnosia video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}
    </div>

  );
}
