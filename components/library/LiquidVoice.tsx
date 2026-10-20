"use client";

import { useEffect, useRef, useState } from "react";
import { animate, cancelFrame, frame, motionValue } from "motion/react";
import "./liquid-voice.css";

/**
 * Liquid Voice — a voice-input pill made of liquid glass.
 *
 * A drop of glass forms on a moving sky. Tap the mic and it stretches into a
 * recording bar: cancel on the left, send on the right and a speech-shaped
 * waveform between them. Send gathers the bars into the middle, a three-dot
 * spinner takes over while it "processes", a tick draws itself, and the pill
 * melts back into a drop.
 *
 * The glass is real refraction, drawn in WebGL 2 in two passes: the sky at a
 * quarter resolution into a texture (it is a soft gradient), then the glass at
 * full resolution — a rounded-box signed distance field with a circular bevel
 * that bends, blurs and splits that texture by channel, with a fresnel edge,
 * a two-sided glare, a hairline and a soft drop shadow. Its geometry comes from
 * the same Motion values that place the HTML controls on top of it, read in
 * Motion's render step, so the buttons and the glass never drift apart; while
 * the pill is changing width it trades a little height for width, like a
 * liquid. When the theme changes, night spreads across the sky from the pill.
 * Without WebGL 2 it falls back to a CSS gradient and backdrop-filter glass.
 *
 * There is no microphone: the waveform is generated, so it works anywhere.
 */

export type LiquidVoiceProps = {
  theme?: "light" | "dark";
  /** Fill the container edge to edge; otherwise it is a 16:10 box. */
  fill?: boolean;
  /** Called when a take is sent, with how long it was recorded for, in ms. */
  onSend?: (durationMs: number) => void;
  /** Called when a take is cancelled or stopped. */
  onCancel?: () => void;
};

/* the liquid-glass preset, as exported from the tuning tool */
const GLASS = {
  refThickness: 20,
  refDistance: 0.05,
  refFactor: 1.4,
  refDispersion: 7,
  refFresnelRange: 30,
  refFresnelHardness: 20,
  refFresnelFactor: 20,
  glareRange: 30,
  glareHardness: 20,
  glareFactor: 90,
  glareConvergence: 50,
  glareOppositeFactor: 80,
  glareAngle: -45,
  blurRadius: 1,
  blurEdge: true,
  tint: { r: 255, g: 255, b: 255, a: 0 },
  shadowExpand: 25,
  shadowFactor: 15,
  shadowPosition: { x: 0, y: -10 },
  springSizeFactor: 10,
};

const SIZE = { idle: [72, 72], open: [300, 84] } as const;
/* the preset was tuned at 104px tall: its pixel ranges scale with the pill */
const S = SIZE.open[1] / 104;
const BARS = 15;
const PROCESS_MS = 2600;
const REVEAL_FEATHER = 90;

const PILL = { type: "spring", stiffness: 260, damping: 24, mass: 1 } as const;
const SNAPPY = { type: "spring", stiffness: 420, damping: 30 } as const;
const SOFT = { type: "spring", stiffness: 260, damping: 26 } as const;
const EASE = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------------ */
/* shaders                                                                   */
/* ------------------------------------------------------------------------ */

const VERT = `#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/* the sky; night spreads out from uOrigin as uReveal grows */
const SKY = `#version 300 es
precision highp float;
uniform vec2 uSize;
uniform float uTime, uFrom, uTo, uReveal, uFeather, uScale;
uniform vec2 uOrigin;
out vec4 o;
vec3 day(vec2 uv, float t){
  vec3 c = mix(vec3(0.080, 0.430, 0.800), vec3(0.020, 0.290, 0.690), smoothstep(0.85, 0.05, uv.y + 0.18 * sin(uv.x * 2.4 + t) - 0.1 * uv.x));
  c = mix(c, vec3(0.250, 0.700, 0.900), smoothstep(0.38, 1.05, uv.x + 0.22 * uv.y + 0.04 * sin(t * 1.7 + uv.y * 3.0)));
  c = mix(c, vec3(0.800, 0.890, 0.950), 0.95 * smoothstep(0.62, 0.0, length((uv - vec2(-0.06, 1.08)) * vec2(1.0, 1.25))));
  c = mix(c, vec3(0.62, 0.88, 0.98), 0.55 * smoothstep(0.55, 0.0, length(uv - vec2(1.06, -0.02))));
  c = mix(c, vec3(0.55, 0.85, 0.96), 0.35 * smoothstep(0.5, 0.0, length(uv - vec2(1.0, 1.05))));
  return c;
}
vec3 night(vec2 uv, float t){
  vec3 c = mix(vec3(0.035, 0.075, 0.190), vec3(0.012, 0.030, 0.095), smoothstep(0.85, 0.05, uv.y + 0.18 * sin(uv.x * 2.4 + t) - 0.1 * uv.x));
  c = mix(c, vec3(0.030, 0.230, 0.380), smoothstep(0.42, 1.08, uv.x + 0.22 * uv.y + 0.04 * sin(t * 1.7 + uv.y * 3.0)));
  c = mix(c, vec3(0.140, 0.230, 0.420), 0.80 * smoothstep(0.60, 0.0, length((uv - vec2(-0.06, 1.08)) * vec2(1.0, 1.25))));
  c = mix(c, vec3(0.100, 0.420, 0.620), 0.45 * smoothstep(0.55, 0.0, length(uv - vec2(1.06, -0.02))));
  c = mix(c, vec3(0.360, 0.220, 0.620), 0.18 * smoothstep(0.5, 0.0, length(uv - vec2(0.5, -0.1))));
  return c;
}
void main(){
  vec2 uv = vec2(gl_FragCoord.x / uSize.x, 1.0 - gl_FragCoord.y / uSize.y);
  float t = uTime * 0.06;
  vec2 css = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y) / uScale;
  float m = 1.0 - smoothstep(uReveal - uFeather, uReveal, distance(css, uOrigin));
  float dark = mix(uFrom, uTo, m);
  o = vec4(mix(day(uv, t), night(uv, t), dark), 1.0);
}`;

const GLASS_FS = `#version 300 es
precision highp float;
uniform sampler2D uSky;
uniform vec2  uRes;
uniform float uDpr, uTime, uDark;
uniform vec4  uRect;
uniform float uThick, uRefDist, uRefFactor, uDisp;
uniform float uFresRange, uFresHard, uFresFactor;
uniform float uGlareRange, uGlareHard, uGlareFactor, uGlareConv, uGlareOpp, uGlareAngle;
uniform float uBlur, uBlurEdge;
uniform vec4  uTint;
uniform float uShadowExpand, uShadowFactor;
uniform vec2  uShadowPos;
out vec4 o;

float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 sky(vec2 p){ vec2 uv = p / uRes; return texture(uSky, vec2(uv.x, 1.0 - uv.y)).rgb; }
vec3 blurred(vec2 p, float r){
  vec3 s = sky(p) * 4.0;
  s += (sky(p + vec2(r, 0.0)) + sky(p - vec2(r, 0.0)) + sky(p + vec2(0.0, r)) + sky(p - vec2(0.0, r))) * 2.0;
  s += sky(p + vec2(r, r)) + sky(p + vec2(-r, r)) + sky(p + vec2(r, -r)) + sky(p - vec2(r, r));
  return s * 0.0625;
}
float sdBox(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float shape(vec2 lp){ return sdBox(lp, uRect.zw, min(uRect.z, uRect.w)); }

void main(){
  vec2 p  = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 lp = p - uRect.xy;
  float d = shape(lp);
  vec3 col = sky(p);

  // a soft drop shadow (the preset's y is "up", so flip it), deeper at night
  float ds = shape(lp - vec2(uShadowPos.x, -uShadowPos.y));
  float sh = 1.0 - smoothstep(-uShadowExpand * 0.35, uShadowExpand, ds);
  col *= 1.0 - sh * uShadowFactor * 0.01 * mix(1.0, 2.2, uDark) * step(0.0, d);

  if (d < 1.0) {
    vec2 e = vec2(0.75, 0.0);
    vec2 n = normalize(vec2(shape(lp + e.xy) - shape(lp - e.xy), shape(lp + e.yx) - shape(lp - e.yx)) + 1e-5);

    float x    = clamp(-d / uThick, 0.0, 1.0);
    float rim  = 1.0 - sqrt(1.0 - (1.0 - x) * (1.0 - x));        // a circular bevel
    vec2 base  = uRect.xy + lp * (1.0 - uRefDist);                // gentle magnification
    vec2 off   = -n * rim * uThick * (uRefFactor - 1.0) * 2.2;     // the rim pulls the scene inward
    float disp = uDisp * 0.02;
    float rad  = uBlur * (1.0 + uBlurEdge * rim * 3.0) * 1.5;

    vec3 g = vec3(blurred(base + off * (1.0 - disp), rad).r,
                  blurred(base + off,                rad).g,
                  blurred(base + off * (1.0 + disp), rad).b);

    g = mix(g, uTint.rgb, uTint.a);
    g = mix(g, mix(vec3(0.70, 0.88, 1.0), vec3(0.42, 0.58, 0.85), uDark), mix(0.30, 0.16, uDark)) * 1.02;   // frosted body

    float fe = pow(clamp(1.0 + d / uFresRange, 0.0, 1.0), 1.0 + uFresHard * 0.12);
    g += fe * uFresFactor * 0.01 * mix(0.85, 0.6, uDark);

    float a  = radians(uGlareAngle);
    vec2  L  = vec2(cos(a), sin(a));
    float ge = pow(clamp(1.0 + d / uGlareRange, 0.0, 1.0), 1.0 + uGlareHard * 0.12);
    float cv = mix(1.0, 9.0, uGlareConv * 0.01);
    float glare = pow(max(dot(n, L), 0.0), cv) + pow(max(dot(n, -L), 0.0), cv) * uGlareOpp * 0.01;
    g += glare * ge * uGlareFactor * 0.01 * mix(0.55, 0.45, uDark);

    g = mix(g, vec3(1.0), smoothstep(1.6, 0.0, abs(d + 0.6)) * mix(0.22, 0.16, uDark));   // hairline
    col = mix(col, g, clamp(0.5 - d, 0.0, 1.0));
  }

  col += (hash(floor(gl_FragCoord.xy) + fract(uTime) * 17.0) - 0.5) * mix(0.035, 0.025, uDark);   // grain
  o = vec4(col, 1.0);
}`;

type Frame = {
  w: number; // the root's size, in CSS px
  h: number;
  rect: { cx: number; cy: number; hw: number; hh: number };
  time: number;
  /* the theme reveal: night (or day) spreads out from the pill */
  from: number;
  to: number;
  reveal: number;
  maxR: number;
  glassDark: number;
};

function createRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  const program = (fs: string) => {
    const p = gl.createProgram()!;
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "program");
    const cache = new Map<string, WebGLUniformLocation | null>();
    const u = (n: string) => {
      if (!cache.has(n)) cache.set(n, gl.getUniformLocation(p, n));
      return cache.get(n)!;
    };
    return { p, u };
  };

  const sky = program(SKY);
  const glass = program(GLASS_FS);
  gl.bindVertexArray(gl.createVertexArray()); // an attribute-less fullscreen triangle

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();

  let skyW = 1;
  let skyH = 1;
  const resize = (w: number, h: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(1, Math.round(w * dpr));
    const ch = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    skyW = Math.max(16, Math.ceil(cw / 4));
    skyH = Math.max(16, Math.ceil(ch / 4));
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, skyW, skyH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  /* the preset's uniforms never change: set them once */
  gl.useProgram(glass.p);
  const u = glass.u;
  gl.uniform1f(u("uThick"), GLASS.refThickness * S);
  gl.uniform1f(u("uRefDist"), GLASS.refDistance);
  gl.uniform1f(u("uRefFactor"), GLASS.refFactor);
  gl.uniform1f(u("uDisp"), GLASS.refDispersion);
  gl.uniform1f(u("uFresRange"), GLASS.refFresnelRange * S);
  gl.uniform1f(u("uFresHard"), GLASS.refFresnelHardness);
  gl.uniform1f(u("uFresFactor"), GLASS.refFresnelFactor);
  gl.uniform1f(u("uGlareRange"), GLASS.glareRange * S);
  gl.uniform1f(u("uGlareHard"), GLASS.glareHardness);
  gl.uniform1f(u("uGlareFactor"), GLASS.glareFactor);
  gl.uniform1f(u("uGlareConv"), GLASS.glareConvergence);
  gl.uniform1f(u("uGlareOpp"), GLASS.glareOppositeFactor);
  gl.uniform1f(u("uGlareAngle"), GLASS.glareAngle);
  gl.uniform1f(u("uBlur"), GLASS.blurRadius);
  gl.uniform1f(u("uBlurEdge"), GLASS.blurEdge ? 1 : 0);
  const ta = GLASS.tint.a > 1 ? GLASS.tint.a / 255 : GLASS.tint.a;
  gl.uniform4f(u("uTint"), GLASS.tint.r / 255, GLASS.tint.g / 255, GLASS.tint.b / 255, ta);
  gl.uniform1f(u("uShadowExpand"), GLASS.shadowExpand * S);
  gl.uniform1f(u("uShadowFactor"), GLASS.shadowFactor);
  gl.uniform2f(u("uShadowPos"), GLASS.shadowPosition.x * S, GLASS.shadowPosition.y * S);
  gl.uniform1i(u("uSky"), 0);

  const draw = (f: Frame) => {
    if (gl.isContextLost()) return;
    /* pass 1: the sky, into the texture */
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, skyW, skyH);
    gl.useProgram(sky.p);
    gl.uniform2f(sky.u("uSize"), skyW, skyH);
    gl.uniform1f(sky.u("uTime"), f.time);
    gl.uniform1f(sky.u("uFrom"), f.from);
    gl.uniform1f(sky.u("uTo"), f.to);
    gl.uniform1f(sky.u("uReveal"), f.reveal);
    gl.uniform1f(sky.u("uFeather"), REVEAL_FEATHER);
    gl.uniform1f(sky.u("uScale"), skyW / f.w);
    gl.uniform2f(sky.u("uOrigin"), f.rect.cx, f.rect.cy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    /* pass 2: the glass, to the screen */
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(glass.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform2f(u("uRes"), f.w, f.h);
    gl.uniform1f(u("uDpr"), canvas.width / f.w);
    gl.uniform1f(u("uTime"), f.time);
    gl.uniform1f(u("uDark"), f.glassDark);
    gl.uniform4f(u("uRect"), f.rect.cx, f.rect.cy, f.rect.hw, f.rect.hh);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const dispose = () => {
    gl.deleteTexture(tex);
    gl.deleteFramebuffer(fbo);
    gl.deleteProgram(sky.p);
    gl.deleteProgram(glass.p);
  };

  return { draw, resize, dispose };
}

/* ------------------------------------------------------------------------ */

/* the waveform's envelope: louder in the middle */
const ENVELOPE = Array.from({ length: BARS }, (_, i) => 0.45 + 0.55 * Math.sin((Math.PI * (i + 0.5)) / BARS));
const fromCentre = (i: number) => Math.abs(i - (BARS - 1) / 2);
/* the processing spinner: three dots on an arc */
const DOTS = [
  [0, 4.4],
  [42, 3.7],
  [84, 4.4],
].map(([a, s]) => {
  const rad = ((a - 120) * Math.PI) / 180;
  return { s, left: 12 + Math.cos(rad) * 6.6 - s / 2, top: 12 + Math.sin(rad) * 6.6 - s / 2 };
});

type State = "idle" | "recording" | "processing" | "done";
type Api = {
  setTheme: (dark: boolean) => void;
};

export default function LiquidVoice({ theme = "light", fill = false, onSend, onCancel }: LiquidVoiceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const micRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<SVGPathElement>(null);
  const sendIcoRef = useRef<SVGSVGElement>(null);
  const stopIcoRef = useRef<SVGSVGElement>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const apiRef = useRef<Api | null>(null);
  const live = useRef({ theme, onSend, onCancel });
  live.current = { theme, onSend, onCancel };
  const [status, setStatus] = useState("Ready to record");
  const [gl, setGl] = useState<"pending" | "ready" | "none">("pending");

  useEffect(() => {
    const root = rootRef.current!;
    const canvas = canvasRef.current!;
    const pill = pillRef.current!;
    const mic = micRef.current!;
    const cancel = cancelRef.current!;
    const action = actionRef.current!;
    const dots = dotsRef.current!;
    const spin = spinRef.current!;
    const done = doneRef.current!;
    const check = checkRef.current!;
    const icoSend = sendIcoRef.current!;
    const icoStop = stopIcoRef.current!;
    const bars = barRefs.current.filter(Boolean) as HTMLDivElement[];

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const anims = new Set<{ stop: () => void }>();
    const track = <T extends { stop: () => void; then: (a: () => void, b: () => void) => unknown }>(a: T) => {
      anims.add(a);
      a.then(
        () => anims.delete(a),
        () => anims.delete(a),
      );
      return a;
    };
    const timers = new Set<number>();
    const wait = (ms: number) =>
      new Promise<void>((res) => {
        const t = window.setTimeout(() => {
          timers.delete(t);
          res();
        }, ms);
        timers.add(t);
      });

    /* ── geometry, as Motion values ── */
    const W = motionValue<number>(SIZE.idle[0]);
    const Hh = motionValue<number>(SIZE.idle[1]);
    const Y = motionValue(0);
    const dark0 = live.current.theme === "dark" ? 1 : 0;
    const reveal = { from: dark0, to: dark0, r: motionValue(0) };
    const f: Frame = { w: 1, h: 1, rect: { cx: 0, cy: 0, hw: 36, hh: 36 }, time: 0, from: dark0, to: dark0, reveal: 0, maxR: 1, glassDark: dark0 };
    let lastBox = "";

    const layout = () => {
      /* jelly: trade a little height for width while the pill is changing size */
      const k = GLASS.springSizeFactor / 10;
      const squash = Math.max(-0.14, Math.min(0.14, (W.getVelocity() / 5200) * k));
      const w = W.get() * (1 + squash * 0.25);
      const h = Hh.get() * (1 - squash);
      f.rect = { cx: f.w / 2, cy: f.h / 2 + Y.get(), hw: w / 2, hh: h / 2 };
      const box = `${w.toFixed(2)}|${h.toFixed(2)}`;
      if (box !== lastBox) {
        pill.style.width = `${w}px`;
        pill.style.height = `${h}px`;
        lastBox = box;
      }
      pill.style.transform = `translate3d(${f.rect.cx - f.rect.hw}px, ${f.rect.cy - f.rect.hh}px, 0)`;
    };

    /* ── the renderer ── */
    let renderer: ReturnType<typeof createRenderer> = null;
    const measure = () => {
      const r = root.getBoundingClientRect();
      f.w = Math.max(1, r.width);
      f.h = Math.max(1, r.height);
      f.maxR = Math.hypot(f.w, f.h) / 2 + REVEAL_FEATHER;
    };
    const start = () => {
      try {
        renderer = createRenderer(canvas);
      } catch (err) {
        console.warn("[LiquidVoice] WebGL 2 glass unavailable, using CSS glass.", err);
        renderer = null;
      }
      measure();
      renderer?.resize(f.w, f.h);
      setGl(renderer ? "ready" : "none");
    };
    const onLost = (e: Event) => {
      e.preventDefault();
      renderer = null;
      setGl("none");
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", start);
    start();

    const ro = new ResizeObserver(() => {
      measure();
      renderer?.resize(f.w, f.h);
      layout();
    });
    ro.observe(root);

    /* ── the frame loop: Motion's render step, after every value has updated, so the
       HTML layer and the glass always draw the same geometry. It only runs while the
       scene can be seen. ── */
    const t0 = performance.now();
    const BAR_LEVELS = new Float32Array(BARS);
    const barIn = Array.from({ length: BARS }, () => motionValue(0));
    let waveLive = false;
    const renderBars = (t: number) => {
      if (!waveLive) return;
      const syll = 0.55 + 0.45 * Math.sin(t * 5.3) * Math.sin(t * 1.7 + 1);
      const pause = Math.sin(t * 0.9) > 0.82 ? 0.25 : 1;
      for (let i = 0; i < bars.length; i++) {
        const n = 0.5 + 0.5 * Math.sin(t * 9 + i * 1.9) * Math.cos(t * 4.1 - i * 0.7);
        const v = Math.max(0.12, syll * pause * (0.35 + 0.65 * n));
        BAR_LEVELS[i] += (v - BAR_LEVELS[i]) * 0.22;
        const k = barIn[i].get();
        bars[i].style.height = `${(3.5 + ENVELOPE[i] * BAR_LEVELS[i] * 24 * k).toFixed(1)}px`;
        bars[i].style.opacity = Math.min(1, k * 1.4).toFixed(2);
      }
    };
    const loop = () => {
      const now = performance.now();
      layout();
      renderBars(now / 1000);
      f.time = reduced ? 0 : (now - t0) / 1000;
      f.from = reveal.from;
      f.to = reveal.to;
      f.reveal = reveal.r.get();
      /* the glass body follows the sky under it */
      f.glassDark = reveal.from + (reveal.to - reveal.from) * Math.min(1, Math.max(0, f.reveal / (REVEAL_FEATHER * 2)));
      renderer?.draw(f);
    };
    let running = false;
    let onScreen = true;
    const run = () => {
      const should = onScreen && !document.hidden;
      if (should === running) return;
      running = should;
      if (should) frame.render(loop, true);
      else cancelFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      run();
    });
    io.observe(root);
    const onVisibility = () => run();
    document.addEventListener("visibilitychange", onVisibility);
    run();

    /* ── the controls ── */
    const shown = new WeakSet<Element>([mic]);
    const show = (el: HTMLElement | SVGElement, on: boolean, opts: Record<string, unknown> = SNAPPY, extra: Record<string, unknown> = {}) => {
      if (on) shown.add(el);
      else shown.delete(el);
      if (el instanceof HTMLButtonElement) {
        el.style.pointerEvents = on ? "auto" : "none";
        el.tabIndex = on ? 0 : -1;
        el.setAttribute("aria-hidden", on ? "false" : "true");
      }
      const delay = (opts.delay as number | undefined) ?? 0;
      if (reduced) {
        track(animate(el, { opacity: on ? 1 : 0, scale: 1, x: 0 }, { duration: 0.12, delay }));
        return;
      }
      /* springs overshoot — fine for scale and position, but a blur or an opacity
         must never pass its target, so those get a clamped tween */
      track(animate(el, { opacity: on ? 1 : 0, filter: on ? "blur(0px)" : "blur(4px)" }, { duration: on ? 0.22 : 0.14, ease: on ? EASE : "easeIn", delay }));
      track(animate(el, { scale: on ? 1 : 0.6, ...extra }, opts));
    };
    const breathe = () => !reduced && track(animate(Y, [0, 2.5, 0], { duration: 0.45, ease: EASE }));

    let state: State = "idle";
    let token = 0;
    let startedAt = 0;
    let viaKeyboard = false;
    let spinAnim: { stop: () => void } | null = null;
    const onKeyCapture = () => (viaKeyboard = true);
    const onPointerCapture = () => (viaKeyboard = false);
    root.addEventListener("keydown", onKeyCapture, true);
    root.addEventListener("pointerdown", onPointerCapture, true);

    const open = async () => {
      if (state !== "idle") return;
      const t = ++token;
      state = "recording";
      startedAt = performance.now();
      setStatus("Recording");
      show(mic, false, { duration: 0.16 });
      /* on a narrow screen the bar gives up a little width, never below what its controls need */
      track(animate(W, Math.max(260, Math.min(SIZE.open[0], f.w - 24)), reduced ? { duration: 0 } : PILL));
      track(animate(Hh, SIZE.open[1], reduced ? { duration: 0 } : PILL));
      animate(icoSend, { opacity: 1, rotate: 0, scale: 1 }, { duration: 0 });
      animate(icoStop, { opacity: 0, scale: 0.5 }, { duration: 0 });
      action.setAttribute("aria-label", "Send");
      BAR_LEVELS.fill(0.2);
      waveLive = true;
      show(cancel, true, { ...SOFT, delay: 0.12 }, { x: [-12, 0] });
      show(action, true, { ...SOFT, delay: 0.18 }, { x: [12, 0] });
      barIn.forEach((mv, i) => track(animate(mv, 1, reduced ? { duration: 0.15 } : { ...SOFT, delay: 0.16 + fromCentre(i) * 0.02 })));
      if (viaKeyboard) {
        await wait(200);
        if (t === token) cancel.focus({ preventScroll: true });
      }
    };

    const close = (cancelled = true) => {
      if (state === "idle") return;
      const hadFocus = pill.contains(document.activeElement);
      ++token;
      spinAnim?.stop();
      if (cancelled) live.current.onCancel?.();
      state = "idle";
      [cancel, action, dots, done].forEach((el) => show(el, false, { duration: 0.16 }));
      barIn.forEach((mv) => track(animate(mv, 0, { duration: 0.14 })));
      wait(160).then(() => {
        if (state === "idle") waveLive = false;
      });
      animate(check, { strokeDashoffset: 1 }, { duration: 0 });
      track(animate(W, SIZE.idle[0], reduced ? { duration: 0 } : { ...PILL, delay: 0.06 }));
      track(animate(Hh, SIZE.idle[1], reduced ? { duration: 0 } : { ...PILL, delay: 0.06 }));
      show(mic, true, { ...SOFT, delay: 0.18 });
      if (hadFocus) mic.focus({ preventScroll: true });
      setStatus("Ready to record");
    };

    const send = async () => {
      if (state !== "recording") return;
      const t = ++token;
      state = "processing";
      setStatus("Sending");
      live.current.onSend?.(Math.round(performance.now() - startedAt));
      breathe();
      /* the bars gather into the middle, then the dots take over */
      const max = (BARS - 1) / 2;
      await Promise.all(barIn.map((mv, i) => track(animate(mv, 0, { duration: 0.22, ease: "easeIn", delay: (max - fromCentre(i)) * 0.012 }))));
      if (t !== token) return;
      waveLive = false;
      show(dots, true, SOFT);
      if (!reduced) spinAnim = track(animate(spin, { rotate: [0, 360] }, { duration: 0.9, ease: "linear", repeat: Infinity }));
      track(animate(icoSend, { opacity: 0, rotate: 90, scale: 0.5 }, { duration: 0.18 }));
      track(animate(icoStop, { opacity: 1 }, { duration: 0.18, delay: 0.08 }));
      track(animate(icoStop, { scale: [0.5, 1] }, { ...SNAPPY, delay: 0.08 }));
      action.setAttribute("aria-label", "Stop");

      await wait(PROCESS_MS);
      if (t !== token) return;
      state = "done";
      spinAnim?.stop();
      show(dots, false, { duration: 0.18 });
      show(done, true, SOFT);
      track(animate(check, { strokeDashoffset: [1, 0] }, { duration: reduced ? 0 : 0.4, ease: EASE, delay: 0.08 }));
      setStatus("Sent");
      await wait(900);
      if (t !== token) return;
      close(false);
    };

    const onMic = () => void open();
    const onCancelClick = () => close(true);
    const onAction = () => (state === "recording" ? void send() : state === "processing" ? close(true) : undefined);
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state !== "idle") {
        e.stopPropagation();
        close(true);
      }
    };
    mic.addEventListener("click", onMic);
    cancel.addEventListener("click", onCancelClick);
    action.addEventListener("click", onAction);
    root.addEventListener("keydown", onEscape);

    /* a tactile press, only on a button that is showing */
    const pressOffs = [mic, cancel, action].map((b) => {
      const down = () => shown.has(b) && !reduced && track(animate(b, { scale: 0.92 }, { type: "spring", stiffness: 600, damping: 30 }));
      const up = () => shown.has(b) && !reduced && track(animate(b, { scale: 1 }, { type: "spring", stiffness: 500, damping: 18 }));
      b.addEventListener("pointerdown", down);
      b.addEventListener("pointerup", up);
      b.addEventListener("pointerleave", up);
      b.addEventListener("pointercancel", up);
      return () => {
        b.removeEventListener("pointerdown", down);
        b.removeEventListener("pointerup", up);
        b.removeEventListener("pointerleave", up);
        b.removeEventListener("pointercancel", up);
      };
    });

    /* ── the theme: night spreads out across the sky from the pill ── */
    apiRef.current = {
      setTheme: (isDark) => {
        const target = isDark ? 1 : 0;
        if (target === reveal.to) return;
        /* a change mid-reveal starts from about where the last one had got to */
        const p = Math.min(1, reveal.r.get() / f.maxR);
        reveal.from = reveal.from + (reveal.to - reveal.from) * p;
        reveal.to = target;
        if (reduced) {
          reveal.r.jump(f.maxR);
          return;
        }
        reveal.r.jump(0);
        track(animate(reveal.r, f.maxR, { duration: 0.9, ease: [0.65, 0, 0.35, 1] }));
      },
    };
    reveal.r.jump(1e6);

    /* ── the entrance: the drop of glass forms and settles ── */
    layout();
    pill.style.opacity = "1";
    if (reduced) {
      animate(mic, { opacity: 1, scale: 1 }, { duration: 0 });
    } else {
      track(animate(W, [16, SIZE.idle[0]], { type: "spring", stiffness: 180, damping: 14 }));
      track(animate(Hh, [16, SIZE.idle[1]], { type: "spring", stiffness: 180, damping: 16 }));
      track(animate(mic, { opacity: [0, 1] }, { duration: 0.25, delay: 0.2 }));
      track(animate(mic, { scale: [0.4, 1] }, { ...SOFT, delay: 0.2 }));
    }

    return () => {
      apiRef.current = null;
      ++token;
      cancelFrame(loop);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", start);
      root.removeEventListener("keydown", onKeyCapture, true);
      root.removeEventListener("pointerdown", onPointerCapture, true);
      root.removeEventListener("keydown", onEscape);
      mic.removeEventListener("click", onMic);
      cancel.removeEventListener("click", onCancelClick);
      action.removeEventListener("click", onAction);
      pressOffs.forEach((off) => off());
      timers.forEach((t) => clearTimeout(t));
      anims.forEach((a) => a.stop());
      [W, Hh, Y, reveal.r, ...barIn].forEach((mv) => mv.destroy());
      renderer?.dispose();
    };
  }, []);

  /* the theme drives the sky: night spreads out from the pill */
  useEffect(() => {
    apiRef.current?.setTheme(theme === "dark");
  }, [theme]);

  return (
    <div ref={rootRef} className="plvoice" data-theme={theme} data-fill={fill || undefined} data-gl={gl}>
      <canvas ref={canvasRef} className="plvoice__gl" aria-hidden="true" />

      {/* the interactive layer sits exactly on top of the glass the shader draws */}
      <div ref={pillRef} className="plvoice__pill" role="group" aria-label="Voice input">
        <div className="plvoice__clip">
          <button ref={micRef} type="button" className="plvoice__btn plvoice__x plvoice__mic" aria-label="Start recording">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="2.5" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" />
            </svg>
          </button>

          <button ref={cancelRef} type="button" className="plvoice__btn plvoice__x plvoice__cancel" aria-label="Cancel" tabIndex={-1} aria-hidden="true">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <div className="plvoice__wave" aria-hidden="true">
            {Array.from({ length: BARS }, (_, i) => (
              <div
                key={i}
                ref={(el) => {
                  barRefs.current[i] = el;
                }}
                className="plvoice__bar"
              />
            ))}
          </div>

          <div ref={dotsRef} className="plvoice__dots" aria-hidden="true">
            <div ref={spinRef} className="plvoice__spin">
              {DOTS.map((d, i) => (
                <span key={i} className="plvoice__dot" style={{ width: d.s, height: d.s, left: d.left, top: d.top }} />
              ))}
            </div>
          </div>

          <div ref={doneRef} className="plvoice__done" aria-hidden="true">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path ref={checkRef} d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} strokeDasharray="1" strokeDashoffset="1" />
            </svg>
          </div>

          <button ref={actionRef} type="button" className="plvoice__btn plvoice__act" aria-label="Send" tabIndex={-1} aria-hidden="true">
            <svg ref={sendIcoRef} className="plvoice__ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
            <svg ref={stopIcoRef} className="plvoice__ico" style={{ opacity: 0 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
              <rect x="5.5" y="5.5" width="13" height="13" rx="2.5" />
            </svg>
          </button>
        </div>
      </div>

      <p className="plvoice__sr" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
