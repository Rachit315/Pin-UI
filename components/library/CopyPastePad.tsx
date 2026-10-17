"use client";

import { useEffect, useRef, useState } from "react";
import "./copy-paste-pad.css";

/**
 * Copy Paste Pad — a three-key aluminium macro pad, in 3-D, that copies and
 * pastes the theme.
 *
 * A machined plate on a white wedge, with ⌘ · C · V keycaps, a braided cable
 * and a soft contact shadow, rendered with three.js's WebGPU renderer (it
 * falls back to WebGL 2 on its own). ⌘C copies the current theme; switch the
 * theme, then ⌘V pastes the copied one back. The keys travel on springs —
 * pressed by the physical keyboard or by pointer (tap cmd, then C or V) — and
 * click with synthesised sound. When the theme flips, the one key light
 * travels across the back of the pad, from a warm sun at the back-right to a
 * cool moon at the back-left, so the shadow sweeps over the paper.
 *
 * ⌘C and ⌘V are only taken while the pad is hovered or focused, so the rest of
 * the page copies and pastes as normal. three.js is loaded when the pad
 * mounts, never in the page's first bundle.
 */

export type CopyPastePadProps = {
  theme?: "light" | "dark";
  /** Called by ⌘V with the copied theme. Wire it to your theme switch. */
  onThemeChange?: (theme: "light" | "dark") => void;
  /** The key clicks and the switch tick-tock, synthesised at play time. */
  sound?: boolean;
  /** Fill its container (give it a height) instead of keeping its own 16:10 box. */
  fill?: boolean;
};

const LABEL = { light: "Light", dark: "Dark" } as const;

type Api = {
  setTheme: (dark: boolean) => void;
  dispose: () => void;
};

export default function CopyPastePad({ theme = "light", onThemeChange, sound = true, fill = false }: CopyPastePadProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const [isMac, setIsMac] = useState(true);

  /* the props the scene reads live, without rebuilding it */
  const live = useRef({ theme, onThemeChange, sound });
  live.current = { theme, onThemeChange, sound };

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent));
  }, []);

  /* ---------- build the scene once ---------- */
  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;
    let cancelled = false;
    let toastTimer = 0;
    const say = (text: string) => {
      clearTimeout(toastTimer);
      setToast((t) => ({ text, n: (t?.n ?? 0) + 1 }));
      toastTimer = window.setTimeout(() => setToast(null), 1600);
    };

    (async () => {
      const THREE = await import("three/webgpu");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      if (cancelled) return;

      const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
      const mac = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
      const MOD = mac ? "⌘" : "Ctrl+";

      /* ── dimensions, 1 = 1 cm ── */
      const MARGIN = 0.42;
      const SPLIT = 0.3;
      const CMD_W = 5.2;
      const SQ_W = 3.26;
      const PAD = { w: 2 * MARGIN + CMD_W + 2 * (SPLIT + SQ_W), d: 4.4, r: 0.62 };
      const BASE = { front: 0.18, back: 0.7, inset: 0.05 };
      const PLATE = { t: 0.26, bevel: 0.055 };
      const TILT = Math.atan((BASE.back - BASE.front) / PAD.d);
      const HOLE_R = 0.4;
      const KEY_GAP = 0.085;
      const KEY = { h: 0.56, rise: 0.24, travel: 0.13, r: 0.34, bevel: 0.075 };
      const innerD = PAD.d - 2 * MARGIN;
      type KeyName = "cmd" | "c" | "v";
      const HOLES = {} as Record<KeyName, { w: number; d: number; x: number }>;
      {
        let x = -PAD.w / 2 + MARGIN;
        for (const [name, w] of [["cmd", CMD_W], ["c", SQ_W], ["v", SQ_W]] as [KeyName, number][]) {
          HOLES[name] = { w, d: innerD, x: x + w / 2 };
          x += w + SPLIT;
        }
      }

      /* ── themes: lighting balanced so a lit, upward surface gets ≈1.0 irradiance ── */
      const DAY = {
        floor: new THREE.Color("#f2c300"),
        bg: new THREE.Color("#f2c300"),
        sky: new THREE.Color("#fffdf7"),
        hemi: 0.56,
        key: { intensity: 0.74, color: new THREE.Color(0xfff4e2), phi: 0.68, theta: 2.14, angle: 1.38, penumbra: 0.2, focus: 0.33 },
        env: 0.36,
        metalEnv: 1.05,
        contact: 0.32,
      };
      const NIGHT = {
        floor: new THREE.Color("#34343a"),
        bg: new THREE.Color("#0f0f11"),
        sky: new THREE.Color("#c9d0e6"),
        hemi: 0.03,
        key: { intensity: 1.6, color: new THREE.Color(0xe3e8f6), phi: 0.52, theta: 2 * Math.PI - 1.9, angle: 0.42, penumbra: 1, focus: 1 },
        env: 0.07,
        metalEnv: 0.38,
        contact: 0.6,
      };

      /* ── quality, per device: phones, tablets and low-core machines get a lighter render ── */
      const coarse = matchMedia("(pointer: coarse)").matches;
      const compact = Math.min(screen.width, screen.height) < 768;
      const lowPower = coarse || compact || (navigator.hardwareConcurrency ?? 8) <= 4;
      const MAX_DPR = lowPower ? 1.5 : 2;
      let pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_DPR);

      /* ── renderer ── */
      const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(stage.clientWidth || 1, stage.clientHeight || 1);
      renderer.toneMapping = THREE.LinearToneMapping;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.tabIndex = -1;
      stage.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = DAY.bg.clone();
      scene.fog = new THREE.Fog(DAY.bg.clone(), 70, 170);

      const camera = new THREE.PerspectiveCamera(28, (stage.clientWidth || 1) / (stage.clientHeight || 1), 0.5, 400);
      const target = new THREE.Vector3(0.4, 0.35, 0);
      const viewDir = new THREE.Vector3(3, 22, 24).normalize();
      const placeCamera = (dist: number) => {
        camera.position.copy(target).addScaledVector(viewDir, dist);
        camera.lookAt(target);
      };

      /* ── helpers ── */
      function roundedRect<T extends InstanceType<typeof THREE.Path>>(path: T, w: number, h: number, r: number, cx = 0, cy = 0): T {
        const x = cx - w / 2;
        const y = cy - h / 2;
        path.moveTo(x + r, y);
        path.lineTo(x + w - r, y);
        path.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
        path.lineTo(x + w, y + h - r);
        path.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
        path.lineTo(x + r, y + h);
        path.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
        path.lineTo(x, y + r);
        path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
        return path;
      }
      /* extrude a flat outline upwards: footprint in XZ, y ∈ [0, height], bevel kept inside the outline */
      const slab = (shape: InstanceType<typeof THREE.Shape>, height: number, bevel = 0, segments = 5) => {
        const g = new THREE.ExtrudeGeometry(shape, {
          depth: height - 2 * bevel,
          bevelEnabled: bevel > 0,
          bevelThickness: bevel,
          bevelSize: bevel,
          bevelSegments: segments,
          curveSegments: 28,
        });
        g.rotateX(-Math.PI / 2);
        g.translate(0, bevel, 0);
        return g;
      };
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

      /* ── materials ── */
      const M = {
        aluminium: new THREE.MeshPhysicalMaterial({ color: 0xd8d9dc, metalness: 1, roughness: 0.36 }),
        base: new THREE.MeshPhysicalMaterial({ color: 0xefefec, roughness: 0.34, clearcoat: 0.3, clearcoatRoughness: 0.4 }),
        key: new THREE.MeshPhysicalMaterial({ color: 0xefeee9, roughness: 0.62, specularIntensity: 0.6 }),
        well: new THREE.MeshStandardMaterial({ color: 0x1e1e21, roughness: 0.9 }),
        cable: new THREE.MeshPhysicalMaterial({ color: 0xf5f5f3, roughness: 0.4, clearcoat: 0.25, clearcoatRoughness: 0.5 }),
      };

      /* ── the pad ── */
      const rig = new THREE.Group();
      rig.rotation.y = 0.3;
      scene.add(rig);

      /* the white wedge: flat footprint, top sloping up from front to back */
      {
        const w = PAD.w - 2 * BASE.inset;
        const d = PAD.d - 2 * BASE.inset;
        const g = slab(roundedRect(new THREE.Shape(), w, d, PAD.r - BASE.inset), 1);
        const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          if (pos.getY(i) > 0.5) pos.setY(i, lerp(BASE.front, BASE.back, (PAD.d / 2 - pos.getZ(i)) / PAD.d));
        }
        const base = new THREE.Mesh(g, M.base);
        base.castShadow = base.receiveShadow = true;
        rig.add(base);
      }

      /* the tilted deck: the plate and the keys follow the wedge's slope */
      const deck = new THREE.Group();
      deck.position.y = (BASE.front + BASE.back) / 2;
      deck.rotation.x = TILT;
      rig.add(deck);
      {
        const b = PLATE.bevel;
        const shape = roundedRect(new THREE.Shape(), PAD.w - 2 * b, PAD.d - 2 * b, PAD.r - b);
        for (const h of Object.values(HOLES)) shape.holes.push(roundedRect(new THREE.Path(), h.w + 2 * b, h.d + 2 * b, HOLE_R + b, h.x, 0));
        const plate = new THREE.Mesh(slab(shape, PLATE.t, b, 6), M.aluminium);
        plate.castShadow = plate.receiveShadow = true;
        deck.add(plate);
        for (const h of Object.values(HOLES)) {
          const well = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(new THREE.Shape(), h.w, h.d, HOLE_R, h.x, 0), 16), M.well);
          well.rotation.x = -Math.PI / 2;
          well.position.y = 0.004;
          well.receiveShadow = true;
          deck.add(well);
        }
      }

      /* ── keycap legends, painted on canvases ── */
      const PX = 160;
      const drawCommandGlyph = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, lineWidth: number) => {
        const s = size * 0.17;
        const r = size * 0.16;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          ctx.save();
          ctx.scale(sx, sy);
          ctx.moveTo(0, s);
          ctx.lineTo(s + r, s);
          ctx.arc(s + r, s + r, r, -Math.PI / 2, Math.PI, false);
          ctx.lineTo(s, 0);
          ctx.restore();
        }
        ctx.stroke();
        ctx.restore();
      };
      const letter = (ctx: CanvasRenderingContext2D, w: number, h: number, char: string) => {
        ctx.font = `${Math.round(h * 0.3)}px "Varela Round", "Arial Rounded MT Bold", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(char, w * 0.5, h * 0.5);
      };
      const LEGENDS: Record<KeyName, (ctx: CanvasRenderingContext2D, w: number, h: number) => void> = {
        cmd: (ctx, w, h) => {
          ctx.font = `${Math.round(h * 0.23)}px "Varela Round", "Arial Rounded MT Bold", sans-serif`;
          ctx.textBaseline = "alphabetic";
          ctx.fillText("cmd", w * 0.085, h * 0.82);
          drawCommandGlyph(ctx, w * 0.84, h * 0.3, h * 0.27, h * 0.021);
        },
        c: (ctx, w, h) => letter(ctx, w, h, "C"),
        v: (ctx, w, h) => letter(ctx, w, h, "V"),
      };
      const legendTexture = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * PX);
        canvas.height = Math.round(h * PX);
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = ctx.strokeStyle = "#fff";
        draw(ctx, canvas.width, canvas.height);
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        return tex;
      };

      /* ── keys ── */
      type Key = { mesh: InstanceType<typeof THREE.Mesh>; down: boolean; pos: number; vel: number };
      const keys = {} as Record<KeyName, Key>;
      const keyMeshes: InstanceType<typeof THREE.Mesh>[] = [];
      const restY = PLATE.t + KEY.rise - KEY.h;
      const buildKey = (name: KeyName) => {
        const h = HOLES[name];
        const w = h.w - 2 * KEY_GAP;
        const d = h.d - 2 * KEY_GAP;
        const b = KEY.bevel;
        /* each keycap owns its material, so no two keys share stale per-object render state */
        const mesh = new THREE.Mesh(slab(roundedRect(new THREE.Shape(), w - 2 * b, d - 2 * b, KEY.r - b), KEY.h, b, 6), M.key.clone());
        mesh.position.set(h.x, restY, 0);
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.userData.key = name;
        const face = { w: w - 2 * b, d: d - 2 * b };
        const legend = new THREE.Mesh(
          new THREE.PlaneGeometry(face.w, face.d),
          new THREE.MeshStandardMaterial({
            color: 0x8f8f94,
            map: legendTexture(face.w, face.d, LEGENDS[name]),
            transparent: true,
            roughness: 0.6,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            depthWrite: false,
          }),
        );
        legend.rotation.x = -Math.PI / 2;
        legend.position.y = KEY.h + 0.003;
        mesh.add(legend);
        deck.add(mesh);
        keyMeshes.push(mesh);
        keys[name] = { mesh, down: false, pos: 0, vel: 0 };
      };

      /* ── cable ── */
      {
        const R = 0.2;
        const dx = -PAD.w / 2 + 2.2 + 2.6;
        const curve = new THREE.CatmullRomCurve3(
          [
            [-2.6, 0.42, -1.9],
            [-2.6, 0.4, -2.75],
            [-2.85, 0.26, -3.7],
            [-4.1, R, -4.9],
            [-6.8, R, -5.9],
            [-10.5, R, -6.4],
            [-16, R, -6.7],
            [-34, R, -7.4],
          ].map(([x, y, z]) => new THREE.Vector3(x + dx, y, z)),
          false,
          "centripetal",
        );
        const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 320, R, 24, false), M.cable);
        cable.castShadow = cable.receiveShadow = true;
        rig.add(cable);
        const relief = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.9, 32), M.cable);
        const start = curve.getPointAt(0.012);
        const tangent = curve.getTangentAt(0.012);
        relief.position.copy(start).addScaledVector(tangent, 0.2);
        relief.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        relief.castShadow = true;
        rig.add(relief);
      }

      /* ── floor and contact shadow ── */
      const grainTexture = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const img = ctx.createImageData(size, size);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = 244 + Math.random() * 11;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        for (let i = 0; i < 26; i++) {
          ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.random() * 0.4})`;
          ctx.beginPath();
          ctx.arc(Math.random() * size, Math.random() * size, 0.5 + Math.random() * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(60, 60);
        return tex;
      };
      const floorMat = new THREE.MeshStandardMaterial({ color: DAY.floor.clone(), roughness: 0.93, map: grainTexture() });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      const contactTexture = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 300;
        const ctx = canvas.getContext("2d")!;
        ctx.filter = "blur(18px)";
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.roundRect(70, 70, 372, 160, 30);
        ctx.fill();
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      };
      const contact = new THREE.Mesh(
        new THREE.PlaneGeometry(PAD.w * (512 / 372), PAD.d * (300 / 160)),
        new THREE.MeshBasicMaterial({ map: contactTexture(), transparent: true, depthWrite: false, opacity: DAY.contact, toneMapped: false }),
      );
      contact.rotation.x = -Math.PI / 2;
      contact.position.y = 0.01;
      contact.renderOrder = -1;
      rig.add(contact);

      /* ── lights: one shadow-casting key light that travels with the theme ── */
      const hemi = new THREE.HemisphereLight(DAY.sky.clone(), DAY.floor.clone(), DAY.hemi);
      hemi.position.set(0, 1000, 0);
      scene.add(hemi);
      const keyLight = new THREE.SpotLight(0xffffff, 1, 0, 1, 0.5, 0);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.setScalar(lowPower ? 1024 : 2048);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 60;
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.normalBias = 0.02;
      keyLight.shadow.radius = 5;
      keyLight.target.position.set(0, 0, 0);
      scene.add(keyLight, keyLight.target);
      const KEY_DIST = 21;
      const tmp = new THREE.Color();
      let themeT = live.current.theme === "dark" ? 1 : 0;
      let themeAnim: { from: number; to: number; start: number; dur: number } | null = null;
      const applySceneTheme = (t: number) => {
        tmp.lerpColors(DAY.floor, NIGHT.floor, t);
        floorMat.color.copy(tmp);
        hemi.groundColor.copy(tmp);
        hemi.color.lerpColors(DAY.sky, NIGHT.sky, t);
        hemi.intensity = lerp(DAY.hemi, NIGHT.hemi, t);
        tmp.lerpColors(DAY.bg, NIGHT.bg, t);
        (scene.background as InstanceType<typeof THREE.Color>).copy(tmp);
        scene.fog!.color.copy(tmp);
        const a = DAY.key;
        const b = NIGHT.key;
        /* it rises a little mid-arc so the light passes over the pad, not through it */
        const phi = lerp(a.phi, b.phi, t) - Math.sin(Math.PI * t) * 0.18;
        keyLight.position.setFromSphericalCoords(KEY_DIST, phi, lerp(a.theta, b.theta, t));
        keyLight.color.lerpColors(a.color, b.color, t);
        keyLight.intensity = lerp(a.intensity, b.intensity, t);
        keyLight.angle = lerp(a.angle, b.angle, t);
        keyLight.penumbra = lerp(a.penumbra, b.penumbra, t);
        keyLight.shadow.focus = lerp(a.focus, b.focus, t);
        scene.environmentIntensity = lerp(DAY.env, NIGHT.env, t);
        M.aluminium.envMapIntensity = lerp(DAY.metalEnv, NIGHT.metalEnv, t);
        (contact.material as InstanceType<typeof THREE.MeshBasicMaterial>).opacity = lerp(DAY.contact, NIGHT.contact, t);
      };

      /* ── sound, synthesised ── */
      let audio: AudioContext | null = null;
      const audioCtx = () => {
        try {
          audio ??= new AudioContext();
          if (audio.state === "suspended") void audio.resume();
          return audio;
        } catch {
          return null;
        }
      };
      const click = ({ freq = 2600, gain = 0.45, thump = true, at = 0 } = {}) => {
        if (!live.current.sound) return;
        const ac = audioCtx();
        if (!ac) return;
        const t = ac.currentTime + at;
        const len = Math.floor(ac.sampleRate * 0.03);
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 5);
        const src = ac.createBufferSource();
        src.buffer = buf;
        const bp = ac.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = freq;
        bp.Q.value = 1.1;
        const g = ac.createGain();
        g.gain.value = gain;
        src.connect(bp).connect(g).connect(ac.destination);
        src.start(t);
        if (thump) {
          const o = ac.createOscillator();
          const og = ac.createGain();
          o.frequency.setValueAtTime(180, t);
          o.frequency.exponentialRampToValueAtTime(65, t + 0.05);
          og.gain.setValueAtTime(0.22, t);
          og.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
          o.connect(og).connect(ac.destination);
          o.start(t);
          o.stop(t + 0.08);
        }
      };
      const keyDownSound = () => click({ freq: 2400, gain: 0.5 });
      const keyUpSound = () => click({ freq: 3600, gain: 0.22, thump: false });
      const switchSound = () => {
        click({ freq: 1800, gain: 0.35 });
        click({ freq: 3200, gain: 0.18, thump: false, at: 0.045 });
      };

      /* ── copy and paste the theme ── */
      let copied: "light" | "dark" | null = null;
      const copyTheme = () => {
        copied = live.current.theme;
        say(`Copied · ${LABEL[copied]} theme`);
      };
      const pasteTheme = () => {
        if (!copied) return say(`Nothing copied yet — press ${MOD}C first`);
        if (copied !== live.current.theme) live.current.onThemeChange?.(copied);
        say(`Pasted · ${LABEL[copied]} theme`);
      };
      const ACTIONS: Partial<Record<KeyName, () => void>> = { c: copyTheme, v: pasteTheme };

      /* ── pressing keys ── */
      let cmdLatchUntil = 0;
      const LATCH_MS = 1400;
      const pressKey = (name: KeyName) => {
        const k = keys[name];
        if (!k || k.down) return;
        k.down = true;
        keyDownSound();
      };
      const releaseKey = (name: KeyName) => {
        const k = keys[name];
        if (!k || !k.down) return;
        k.down = false;
        keyUpSound();
      };

      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const canvas = renderer.domElement;
      const pick = (e: PointerEvent): KeyName | null => {
        const rect = canvas.getBoundingClientRect();
        ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        let obj: InstanceType<typeof THREE.Object3D> | null = raycaster.intersectObjects(keyMeshes, true)[0]?.object ?? null;
        while (obj && !obj.userData.key) obj = obj.parent;
        return (obj?.userData.key as KeyName) ?? null;
      };

      let pointerKey: { name: KeyName; id: number } | null = null;
      const onDown = (e: PointerEvent) => {
        const name = pick(e);
        if (!name) return;
        pointerKey = { name, id: e.pointerId };
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {}
        pressKey(name);
        const action = ACTIONS[name];
        if (action) {
          if (performance.now() < cmdLatchUntil || keys.cmd.down) {
            cmdLatchUntil = 0;
            action();
          } else {
            say(`Tap cmd first, then ${name.toUpperCase()}, to ${name === "c" ? "copy" : "paste"} the theme`);
          }
        }
      };
      const endPointer = (e: PointerEvent) => {
        if (!pointerKey || e.pointerId !== pointerKey.id) return;
        releaseKey(pointerKey.name);
        if (pointerKey.name === "cmd") cmdLatchUntil = performance.now() + LATCH_MS;
        pointerKey = null;
      };
      const onMove = (e: PointerEvent) => {
        if (pointerKey) return;
        canvas.style.cursor = pick(e) ? "pointer" : "default";
      };
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointerup", endPointer);
      canvas.addEventListener("pointercancel", endPointer);
      canvas.addEventListener("pointermove", onMove);

      /* the physical keyboard drives the same keys — only while the pad is hovered or focused */
      let hovered = false;
      const armed = () => hovered || root.contains(document.activeElement);
      const onEnter = () => (hovered = true);
      const onLeave = () => (hovered = false);
      root.addEventListener("pointerenter", onEnter);
      root.addEventListener("pointerleave", onLeave);
      const isModifier = (e: KeyboardEvent) => e.key === "Meta" || e.key === "Control";
      const LETTER_CODES: Record<string, KeyName> = { KeyC: "c", KeyV: "v" };
      const onKeyDown = (e: KeyboardEvent) => {
        if (!armed()) return;
        if (isModifier(e)) pressKey("cmd");
        const name = LETTER_CODES[e.code];
        if (!name) return;
        const withMod = e.metaKey || e.ctrlKey;
        if (withMod) e.preventDefault();
        if (e.repeat) return;
        pressKey(name);
        if (withMod) {
          ACTIONS[name]?.();
          /* macOS swallows keyup for keys pressed while ⌘ is held */
          if (e.metaKey) setTimeout(() => releaseKey(name), 150);
        }
      };
      const releaseAll = () => (Object.keys(keys) as KeyName[]).forEach(releaseKey);
      const onKeyUp = (e: KeyboardEvent) => {
        if (isModifier(e)) releaseAll();
        const name = LETTER_CODES[e.code];
        if (name) releaseKey(name);
      };
      addEventListener("keydown", onKeyDown);
      addEventListener("keyup", onKeyUp);
      addEventListener("blur", releaseAll);

      /* ── framing ── */
      const fitDistance = () => {
        const vfov = THREE.MathUtils.degToRad(camera.fov);
        const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
        const scale = PAD.w / 9.6;
        /* landscape: the pad takes about 60% of the width, as in the product shot;
           portrait (a phone): it is framed to about 85%, so it still reads at arm's length */
        const span = camera.aspect < 1 ? PAD.w * 1.18 : 15.5 * scale;
        return Math.max(camera.aspect < 1 ? 0 : 31 * scale, span / 2 / Math.tan(hfov / 2));
      };
      let intro: { start: number; dur: number; from: number; to: number } | null = null;
      /* a frame is only drawn when something changed: an idle pad costs nothing */
      let dirty = true;
      const resize = () => {
        const w = stage.clientWidth;
        const h = stage.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        if (intro) intro.to = fitDistance();
        else placeCamera(fitDistance());
        dirty = true;
      };
      let resizeFrame = 0;
      const ro = new ResizeObserver(() => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(resize);
      });
      ro.observe(stage);

      /* ── the loop ── */
      const clock = new THREE.Clock();
      const SPRING_K = 1500;
      const SPRING_C = 2 * Math.sqrt(SPRING_K) * 0.6;
      /* adaptive resolution: if animated frames run slow, step the pixel ratio down (never back up) */
      let slowSum = 0;
      let slowN = 0;
      const tick = () => {
        const dt = Math.min(clock.getDelta(), 1 / 30);
        const now = performance.now();
        let moving = false;
        for (const [name, k] of Object.entries(keys) as [KeyName, Key][]) {
          const latched = name === "cmd" && now < cmdLatchUntil;
          const goal = k.down ? KEY.travel : latched ? KEY.travel * 0.45 : 0;
          if (Math.abs(goal - k.pos) < 1e-5 && Math.abs(k.vel) < 1e-4) {
            if (k.pos !== goal) {
              k.pos = goal;
              k.vel = 0;
              k.mesh.position.y = restY - k.pos;
              dirty = true;
            }
            continue;
          }
          for (let i = 0; i < 4; i++) {
            const h = dt / 4;
            k.vel += (SPRING_K * (goal - k.pos) - SPRING_C * k.vel) * h;
            k.pos += k.vel * h;
          }
          k.mesh.position.y = restY - k.pos;
          moving = true;
        }
        if (themeAnim) {
          const p = Math.min(1, (now - themeAnim.start) / themeAnim.dur);
          themeT = lerp(themeAnim.from, themeAnim.to, easeInOut(p));
          applySceneTheme(themeT);
          moving = true;
          if (p === 1) themeAnim = null;
        }
        if (intro) {
          const p = Math.min(1, (now - intro.start) / intro.dur);
          placeCamera(lerp(intro.from, intro.to, easeOut(p)));
          moving = true;
          if (p === 1) intro = null;
        }
        if (moving) {
          slowSum += dt;
          if (++slowN === 24) {
            if (slowSum / slowN > 1 / 36 && pixelRatio > 1) {
              pixelRatio = Math.max(1, pixelRatio - 0.25);
              renderer.setPixelRatio(pixelRatio);
              resize();
            }
            slowSum = 0;
            slowN = 0;
          }
        }
        if (!moving && !dirty) return;
        dirty = false;
        renderer.render(scene, camera);
      };

      /* ── run only while it can be seen ── */
      let onScreen = true;
      let running = false;
      const run = () => {
        const should = onScreen && !document.hidden;
        if (should === running) return;
        running = should;
        if (should) {
          clock.getDelta();
          dirty = true;
        }
        renderer.setAnimationLoop(should ? tick : null);
      };
      const io = new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting;
        run();
      });
      const onVisibility = () => run();

      /* ── boot ── */
      try {
        await renderer.init();
      } catch (err) {
        console.error(err);
        if (!cancelled) setFailed(true);
        return;
      }
      if (cancelled) {
        renderer.dispose();
        return;
      }
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      M.aluminium.envMap = scene.environment;

      /* the legends need the rounded face loaded before they are painted */
      try {
        await Promise.race([document.fonts.load('64px "Varela Round"'), new Promise((r) => setTimeout(r, 2500))]);
      } catch {}
      if (cancelled) return;
      (Object.keys(HOLES) as KeyName[]).forEach(buildKey);

      resize();
      /* the theme may have changed while three.js was loading: start in the current one */
      themeT = live.current.theme === "dark" ? 1 : 0;
      applySceneTheme(themeT);
      const dist = fitDistance();
      placeCamera(reduceMotion.matches ? dist : dist * 1.12);
      /* compile every shader up front, off the main thread where the backend allows,
         so the first frames are not a burst of synchronous pipeline builds */
      try {
        await renderer.compileAsync(scene, camera);
      } catch {}
      if (cancelled) return;
      if (!reduceMotion.matches) {
        /* a short dolly-in on the same angle: the shot settles rather than swings */
        intro = { start: performance.now() + 150, dur: 1400, from: dist * 1.12, to: dist };
      }
      io.observe(root);
      document.addEventListener("visibilitychange", onVisibility);
      /* create the audio context in idle time (it starts suspended until a gesture resumes it),
         so the first click or theme change does not pay for it */
      const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 400));
      idle(() => {
        if (cancelled || audio) return;
        try {
          audio = new AudioContext();
        } catch {}
      });
      run();
      requestAnimationFrame(() => !cancelled && setReady(true));

      apiRef.current = {
        setTheme: (dark) => {
          const to = dark ? 1 : 0;
          if (to === (themeAnim ? themeAnim.to : themeT)) return;
          switchSound();
          if (reduceMotion.matches) {
            themeAnim = null;
            themeT = to;
            applySceneTheme(to);
            dirty = true;
          } else {
            themeAnim = { from: themeT, to, start: performance.now(), dur: 1100 };
          }
        },
        dispose: () => {
          renderer.setAnimationLoop(null);
          ro.disconnect();
          io.disconnect();
          cancelAnimationFrame(resizeFrame);
          document.removeEventListener("visibilitychange", onVisibility);
          canvas.removeEventListener("pointerdown", onDown);
          canvas.removeEventListener("pointerup", endPointer);
          canvas.removeEventListener("pointercancel", endPointer);
          canvas.removeEventListener("pointermove", onMove);
          root.removeEventListener("pointerenter", onEnter);
          root.removeEventListener("pointerleave", onLeave);
          removeEventListener("keydown", onKeyDown);
          removeEventListener("keyup", onKeyUp);
          removeEventListener("blur", releaseAll);
          scene.traverse((o) => {
            const mesh = o as InstanceType<typeof THREE.Mesh>;
            mesh.geometry?.dispose?.();
            const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
            mats.forEach((m) => {
              (m as InstanceType<typeof THREE.MeshStandardMaterial>).map?.dispose();
              m.dispose();
            });
          });
          pmrem.dispose();
          renderer.dispose();
          canvas.remove();
          void audio?.close();
        },
      };
    })().catch((err) => {
      console.error(err);
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
      clearTimeout(toastTimer);
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, []);

  /* the site's theme drives the scene: the key light travels from sun to moon */
  useEffect(() => {
    apiRef.current?.setTheme(theme === "dark");
  }, [theme]);

  const mod = isMac ? "⌘" : "Ctrl";

  return (
    <div
      ref={rootRef}
      className="pcpp"
      data-theme={theme}
      data-fill={fill || undefined}
      tabIndex={0}
      role="application"
      aria-label={`3-D macro pad with cmd, C and V keys. Press ${mod} and C to copy the theme, then ${mod} and V to paste it.`}
    >
      <div ref={stageRef} className="pcpp__stage" data-ready={ready || undefined} />

      <div className="pcpp__toast pcpp__glass" data-show={toast ? true : undefined} role="status" aria-live="polite">
        {toast?.text}
      </div>

      {failed && (
        <p className="pcpp__error">
          This browser couldn&rsquo;t start the 3-D renderer (WebGPU or WebGL 2). Try a current Chrome, Edge, Safari or Firefox.
        </p>
      )}
    </div>
  );
}
