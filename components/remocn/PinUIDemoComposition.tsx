/**
 * Pin UI Product Demo Video Composition
 * Built with Remocn & Remotion conventions
 *
 * Showcases:
 *  - Liquid Tabs (Gooey tab strip with overflow menu)
 *  - Thermal Dial (Travelling wave ticks, dynamic heat wash)
 *  - Lamp Switch (Hanging pendant lamp physics & liquid toggle)
 *
 * To render:
 *  npx remotion render components/remocn/PinUIDemoComposition.tsx PinUIDemo out/pin-ui-demo.mp4
 */

export interface PinUIDemoProps {
  title?: string;
  subtitle?: string;
  accentColor?: string;
}

export const PinUIDemoConfig = {
  id: "PinUIDemo",
  fps: 30,
  durationInFrames: 810, // 27 seconds @ 30fps
  width: 1920,
  height: 1080,
  defaultProps: {
    title: "PIN UI",
    subtitle: "We take pins off that board and finish them.",
    accentColor: "#e01e0b",
  },
};

export const DEMO_BEATS = [
  {
    id: "hook",
    title: "PIN UI",
    claim: "We take pins off that board and finish them.",
    durationInFrames: 150,
  },
  {
    id: "liquid-tabs",
    title: "Liquid Tabs",
    tagline: "Gooey sliding pill that flows between tabs and category dropdowns",
    slug: "liquid-tabs",
    command: 'npx shadcn@latest add "https://pinui.xyz/r/liquid-tabs"',
    durationInFrames: 210,
  },
  {
    id: "thermal-dial",
    title: "Thermal Dial",
    tagline: "Hardware-inspired thermal instrument with travelling wave ticks & dynamic heat wash",
    slug: "thermal-dial",
    command: 'npx shadcn@latest add "https://pinui.xyz/r/thermal-dial"',
    durationInFrames: 210,
  },
  {
    id: "lamp-switch",
    title: "Lamp Switch",
    tagline: "Hanging ceramic pendant lamp with physics swing, pull-chain detent & liquid toggle",
    slug: "lamp-switch",
    command: 'npx shadcn@latest add "https://pinui.xyz/r/lamp-switch"',
    durationInFrames: 210,
  },
  {
    id: "cta",
    title: "Pin UI",
    claim: "Production-ready components with real springs and synthesised audio.",
    domain: "pinui.xyz",
    durationInFrames: 120,
  },
];
