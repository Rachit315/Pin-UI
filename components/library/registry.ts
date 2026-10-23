/**
 * The library index.
 *
 * One entry per component, holding everything both the shelf card and the
 * component page need. Deliberately free of React and of `node:fs`, so the
 * same object can be read from a server component, a client component and the
 * sitemap without any of them pulling the others in.
 *
 * `files` names the real files. The component page reads them off disk at build
 * time rather than keeping a second copy of the code in a string, so what is
 * shown on the page cannot drift from what is running above it.
 */

export type SourceFile = {
  /**
   * The file's name inside `components/library`. It is both what the tab is
   * called and what is read off disk at build time — the two cannot drift,
   * because there is only one of them.
   */
  name: string;
  /** Highlighting hint for the code panel. */
  lang: "tsx" | "css";
};

export type PropSpec = {
  name: string;
  type: string;
  required?: boolean;
  fallback?: string;
  note: string;
};

/**
 * The shelves the library is sorted onto — the sections of the index page and
 * of the sidebar, in the order they are read. A component's place within its
 * shelf is its place in LIBRARY, newest first.
 */
export const CATEGORIES = [
  { id: "controls", name: "Inputs & controls" },
  { id: "cards", name: "Cards & widgets" },
  { id: "media", name: "Audio & media" },
  { id: "lists", name: "Lists & pickers" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export type Entry = {
  slug: string;
  /** The name on the shelf card. */
  name: string;
  /** One line, under the title on the component page. */
  tagline: string;
  /** Two or three sentences on what makes it worth taking. */
  blurb: string;
  /** Short claims, shown as a row of chips. */
  highlights: string[];
  /**
   * The preview loop: a few seconds of the recording, cut to start on its most
   * alive moment, at 960px and 30fps with no audio — about 80KB. The full
   * 1080p60 recordings are 1–2MB each and used to be seeked 9–15 seconds in
   * before a card could show anything, which is what made the hero band sit
   * empty for seconds after every reload.
   *
   * Left out for a component that has not been recorded yet: its card shows
   * the poster instead, and it stays out of the hero band until it has a loop.
   */
  clip?: string;
  /**
   * Set false to keep a recorded component's loop on the shelf only, out of
   * the hero band and the Pinterest peek.
   */
  hero?: boolean;
  /**
   * The loop's first frame as a still, so a card is never blank while it
   * loads — or, for a component without a loop yet, a screenshot of it.
   */
  poster: string;
  /**
   * Whether the component makes any sound. The workbench only offers its
   * speaker control for the ones that do — a mute button on a silent
   * component is a control that does nothing.
   */
  sound: boolean;
  /**
   * How much to zoom the clip inside the card frame. The three were recorded at
   * 1920×1080 with the component centred at different sizes; this brings them
   * all to about the same presence on the shelf.
   */
  zoom: number;
  /**
   * The field the component was designed to sit on. Each one carries its own
   * dark or light backdrop, so the preview shows it the way it is meant to be
   * seen rather than dropping it onto the page's own paper.
   */
  stage: string;
  /**
   * Set only for components drawn in both a light and a dark theme. The stage
   * shows the dark one, on this field, whenever the site is switched to its
   * crimson state; the others keep the one field they were designed on.
   */
  stageDark?: string;
  /**
   * Wider than a card. The stage normally holds a component to a card's width;
   * these get the room they were laid out in.
   */
  wide?: boolean;
  /**
   * A scene rather than an object: it fills the whole stage, edge to edge, with
   * no padding or width cap — the 3-D pad is drawn into the frame itself.
   */
  fill?: boolean;
  /**
   * Its animation runs past its own box — the Egg OTP's eggs break and fall. The
   * stage lets that spill show instead of scrolling to it; the frame around
   * the stage still clips it. Only for components too short to ever need to
   * scroll inside the stage.
   */
  spill?: boolean;
  /**
   * The field behind the shelf and carousel loop, when the loop was recorded
   * on a different field from the stage's light one — the Egg OTP loop is
   * recorded in its dark theme.
   */
  clipStage?: string;
  /** Recently added: flagged with a "New" tag in the sidebar and on the shelf. */
  isNew?: boolean;
  /** Which shelf it sits on, in the sidebar and on the index page. */
  category: CategoryId;
  /**
   * Who made it, shown as a small colour-cycling dot after the name — in the
   * sidebar and on the shelf — with a tooltip that links to their X profile.
   */
  creator?: { handle: string; url: string };
  /**
   * Who asked for it, shown as a "Requested by @handle" chip at the top of its
   * stage that links to their X profile.
   */
  requestedBy?: { handle: string; url: string };
  /** The import used on the page and in the copy button. */
  usage: string;
  /** npm packages it needs at runtime, when that is more than Motion. */
  dependencies?: string[];
  props: PropSpec[];
  files: SourceFile[];
  /** Where the original standalone project came from. */
  origin: { label: string; href?: string };
  /**
   * What is read under the stage once it is shrunk. A couple of paragraphs on
   * how the thing actually behaves, and the pin it was drawn from.
   */
  info: {
    paragraphs: string[];
    /** The Pinterest pin it came from, when the original recorded one. */
    pin?: string;
    /** The designer's own site, credited after the pin. */
    credit?: { label: string; href: string };
  };
};

export const LIBRARY: Entry[] = [
  {
    slug: "desk-computer",
    category: "controls",
    name: "Desk Computer",
    isNew: true,
    tagline: "A late-90s desk computer in true isometric that you can actually use.",
    blurb:
      "A beige CRT, a mid-tower, a 104-key keyboard, a ball mouse and a CD-R, drawn as one isometric SVG. Type and the keys go down while the text lands in the search box on the screen; drag the mouse and its cable follows while the cursor moves on the CRT; click the jewel case and the disc flies into the drive and AutoPlay opens. It assembles itself piece by piece, and when nobody is touching it, it uses itself.",
    highlights: ["Type on a real keyboard", "Drag the mouse, the cable follows", "CD flies into the drive", "Assembles itself"],
    /* recorded in light: a remocn edit of a frame-exact recording of the live figure — it assembles,
       the mouse is dragged, a search is typed, and the CD flies into the drive as AutoPlay opens */
    clip: "/clips/loop/desk-computer.mp4",
    poster: "/clips/loop/desk-computer.jpg",
    sound: true,
    zoom: 1,
    stage: "#ffffff",
    clipStage: "#ffffff",
    stageDark: "#0f1013",
    /* a scene: it fills the stage and fits the drawing to it */
    fill: true,
    usage: `import DeskComputer from "@/components/library/DeskComputer";

<DeskComputer theme={theme} sound />`,
    props: [
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "Beige plastic on white, or the same machine in a dark room. Every colour is a token with a value for each; changing it assembles the system again." },
      { name: "sound", type: "boolean", fallback: "true", note: "Key clicks and thocks, the CRT's power-on hum and power-off zap — synthesised, and only ever for your own input." },
      { name: "fill", type: "boolean", fallback: "false", note: "Take the container's whole box, fitting the drawing to it. Without it the component keeps the drawing's own 1000:760 shape." },
      { name: "src", type: "string", fallback: "\"/library/desk-computer.svg\"", note: "Where the ~480KB drawing is served from; it is fetched at mount rather than bundled." },
    ],
    files: [
      { name: "DeskComputer.tsx", lang: "tsx" },
      { name: "desk-computer-engine.ts", lang: "tsx" },
      { name: "desk-computer.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "The whole machine is one SVG in true isometric — monitor, tower, keyboard, mouse and pad, speaker, CD-R and floppy disks, and the cables between them — built and audited with the Anatomy skill's kit, so every part is a solid with its own faces, shading and depth order. The drawing is fetched when the component mounts and the engine runs on it in place: keys and the mouse move along the projection's own axes, and the CD's tray and disc are redrawn as true isometric solids frame by frame.",
        "Focus it and type: each key goes down on a spring and the text lands in the search box on the CRT, scrolling when it overflows; Enter searches and the tower's hard-drive LED flickers. Drag the mouse around its pad and its cable re-routes over the pad's edge while an arrow moves on the screen — an I-beam over the search box — and a click on the mouse clicks the screen. Click the jewel case: the tray slides out, the disc flies over on an arc and drops in, the tray shuts, the drive LED reads and AutoPlay opens. Click the drive to eject it and the disc flies home.",
        "Escape or the monitor's power button collapses the picture to a line and then a dot, and turns it back on. On arrival and on every theme change the system assembles itself — shadows first, then each piece drops in, a wave runs across the keys and the cables come last — and the CRT warms up. Every sound is synthesised with Web Audio and answers only your own input; left alone, it aims the mouse, types, searches and loads the CD by itself, and gives way the moment you touch it.",
      ],
      credit: { label: "built with Anatomy", href: "https://github.com/wheresryan22/anatomy" },
    },
    origin: { label: "Port · desk computer" },
  },
  {
    slug: "liquid-voice",
    category: "media",
    name: "Liquid Voice",
    isNew: true,
    tagline: "A voice-input pill of real liquid glass that stretches into a recorder.",
    blurb:
      "A drop of glass on a moving sky. Tap the mic and it stretches into a recording bar — cancel, a live waveform, send — then gathers the waveform up, spins while it sends, ticks and melts back into a drop. The glass is drawn in WebGL 2: it bends, blurs and splits the sky behind it, and night spreads out from the pill when the theme changes.",
    highlights: ["WebGL 2 liquid glass", "Jelly stretch", "Record, send, done", "Night spreads from the pill"],
    /* a remocn edit of a frame-exact recording of the live pill: record and send by day, night spreads from the pill, record and cancel, day comes back */
    clip: "/clips/loop/liquid-voice.mp4",
    poster: "/clips/loop/liquid-voice.jpg",
    sound: false,
    zoom: 1,
    stage: "#0d5bb5",
    clipStage: "#0d5bb5",
    stageDark: "#060b1c",
    /* a scene, not a card: the sky fills the stage edge to edge */
    fill: true,
    usage: `import LiquidVoice from "@/components/library/LiquidVoice";

<LiquidVoice theme={theme} onSend={(ms) => console.log("sent", ms)} onCancel={() => console.log("cancelled")} />`,
    props: [
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "A blue day sky with a dark ink waveform, or a night sky with a pale one. Changing it spreads the new sky out from the pill." },
      { name: "fill", type: "boolean", fallback: "false", note: "Take the container's whole box. Without it the scene is a 16:10 box with rounded corners." },
      { name: "onSend", type: "(durationMs) => void", note: "Called when a take is sent, with how long it was recorded for." },
      { name: "onCancel", type: "() => void", note: "Called when a take is cancelled, or stopped while it is sending." },
    ],
    files: [
      { name: "LiquidVoice.tsx", lang: "tsx" },
      { name: "liquid-voice.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "The glass is drawn in two WebGL 2 passes: the sky at a quarter of the resolution into a texture, since it is a soft gradient, then the glass at full resolution — a rounded box's signed distance field with a circular bevel that bends, blurs and splits that texture channel by channel, with a fresnel edge, a two-sided glare, a hairline and a soft drop shadow. The look is an exported liquid-glass preset, scaled with the pill.",
        "The pill's width and height are Motion values, read in Motion's render step by both the shader and the HTML controls laid over it, so the buttons and the glass can never drift apart; while it changes width it trades a little height for it, like a liquid. Send gathers the waveform into the middle, a three-dot spinner takes over, a tick draws itself and the pill melts back into a drop. Escape cancels, and focus follows the controls when you use the keyboard.",
        "A theme change does not cross-fade: night spreads across the sky from the pill. The loop only runs while the scene is on screen, and without WebGL 2 it falls back to a CSS gradient and a backdrop-filter glass by itself. There is no microphone — the waveform is generated, so it works anywhere.",
      ],
    },
    origin: { label: "Folder · voice-record" },
  },
  {
    slug: "file-box",
    category: "cards",
    name: "File Box",
    isNew: true,
    tagline: "A cardboard file box whose folders lift out by their tabs.",
    blurb:
      "Five colourful folders standing in a cardboard file box, drawn as one SVG. Hover one and it is pulled up by its tab, the flap falls open a beat later and its sheets of paper trail behind on looser springs while its neighbours give way; click for a tug. The whole scene tilts with the pointer, and a theme change cross-fades every face and shadow.",
    highlights: ["Pulled up by the tab", "Trailing paper springs", "Neighbours give way", "Cross-fading theme"],
    /* a remocn edit of a frame-exact recording of the live box: the folders file in, lift one by one, and the pink one is tugged */
    clip: "/clips/loop/file-box.mp4",
    poster: "/clips/loop/file-box.jpg",
    sound: false,
    zoom: 1,
    stage: "#fbe9d2",
    clipStage: "#fbe9d2",
    stageDark: "#17130f",
    /* a scene on its own grained paper: it fills the stage and centres itself */
    fill: true,
    usage: `import FileBox from "@/components/library/FileBox";

<FileBox theme="light" onPull={({ color, position }) => console.log(color, position)} />`,
    props: [
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "Warm cardboard on cream paper, or the same box in a dim room. Every colour cross-fades when it changes." },
      { name: "fill", type: "boolean", fallback: "false", note: "Take the container's whole box, with the scene centred in the largest square that fits. Without it the box is square." },
      { name: "onPull", type: "({ color, position }) => void", note: "Called when a folder is tugged, with its colour and its place counted from the front (1–5)." },
    ],
    files: [
      { name: "FileBox.tsx", lang: "tsx" },
      { name: "file-box.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "The box is drawn in an oblique projection as a single SVG: its hollow back, then the folders standing in it back to front, then the front and side faces over them, so a lifted folder rises out of the box rather than through it. Each folder is a back panel with its tab, three sheets of paper and a front flap, and the rim's shadow is fixed to the box, so a folder slides out of it as it lifts.",
        "Hover or focus a folder and it is pulled up by its tab, tipping a hair toward that side; the flap swings open a beat later and the sheets trail behind on lighter, underdamped springs, while the neighbours give way a little — less the further away they are. Click, Enter or Space gives it a tug. Every transform is a Motion value, so sweeping across the folders hands one target to the next with its velocity intact rather than restarting from rest.",
        "On arrival the box settles onto the table, the folders are filed in back to front and the box gives a little as the last one lands. The scene tilts a few degrees with the pointer and its shadow answers it. Its colours are typed custom properties, so a theme change cross-fades every face, gradient and shadow together; R replays the arrival while it has focus.",
      ],
    },
    origin: { label: "Folder · file box" },
  },
  {
    slug: "copy-paste-pad",
    category: "controls",
    name: "Copy Paste Pad",
    isNew: true,
    tagline: "A 3-D aluminium macro pad whose ⌘C and ⌘V copy and paste the theme.",
    blurb:
      "Three keys — cmd, C and V — on a machined aluminium plate, rendered live with three.js's WebGPU renderer. ⌘C copies the current theme; switch it, and ⌘V pastes the copied one back. The keys travel on springs and click, and when the theme flips the one key light sweeps across the back of the pad from a warm sun to a cool moon, dragging the shadow with it.",
    highlights: ["Live WebGPU render", "Copy and paste the theme", "Spring key travel", "Sun-to-moon light sweep"],
    /* a remocn edit of a frame-exact recording of the live pad: ⌘C, flip to dark, ⌘V back to light */
    clip: "/clips/loop/copy-paste-pad.mp4",
    poster: "/clips/loop/copy-paste-pad.jpg",
    hero: false,
    sound: true,
    zoom: 1,
    stage: "#f2c300",
    clipStage: "#f2c300",
    stageDark: "#0f0f11",
    /* a scene, not a card: it fills the stage edge to edge */
    fill: true,
    dependencies: ["three@^0.186.1"],
    usage: `import CopyPastePad from "@/components/library/CopyPastePad";

<CopyPastePad theme={theme} onThemeChange={setTheme} sound />`,
    props: [
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "Lights the scene: a warm sun on yellow paper, or a cool moon on graphite. Changing it sweeps the key light across." },
      { name: "onThemeChange", type: "(theme) => void", note: "Called by ⌘V with the copied theme. Wire it to your theme switch so pasting actually changes it." },
      { name: "sound", type: "boolean", fallback: "true", note: "The key clicks and the theme switch's tick-tock, synthesised at play time." },
    ],
    files: [
      { name: "CopyPastePad.tsx", lang: "tsx" },
      { name: "copy-paste-pad.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "The pad is modelled in centimetres: a white wedge raised at the back, an aluminium top plate with three openings milled through it, a dark well under each, and ⌘ · C · V keycaps whose legends are painted onto canvases in a rounded face. A braided cable leaves the back-left and runs off across the paper, and a blurred contact shadow sits under the base. It renders with three.js's WebGPU renderer and falls back to WebGL 2 by itself.",
        "⌘C copies the current theme and ⌘V pastes the copied one — so copy, flip the theme with your switch, and paste to flip it back. The keys work from the keyboard or the pointer (tap cmd, then C or V within a moment), travel on stiff springs and click with synthesised sound. ⌘C and ⌘V are only taken while the pad is hovered or focused, so copying text anywhere else on the page still works.",
        "Light and shadow are one key light that moves with the theme rather than two lights crossfading: from a broad warm sun at the back-right to a narrow cool moon at the back-left, rising a little mid-arc so it passes over the pad, while the paper, sky and contact shadow ease across with it. three.js is imported when the pad mounts, so it never lands in a page's first bundle.",
      ],
    },
    origin: { label: "keyboard" },
  },
  {
    slug: "task-card",
    category: "cards",
    name: "Task Card",
    isNew: true,
    tagline: "A task with subtasks on a connector tree, progress, priority and status.",
    blurb:
      "A task card with its subtasks hung off one pixel-crisp connector tree. Tick one and its ring fills on a spring while the progress pill counts up and its bar fills; finish them all and the status turns to Done by itself. Priority and Status are coloured pills whose labels roll over as their width follows, and the ⋯ menu completes or resets everything.",
    highlights: ["Pixel-crisp connector tree", "Spring checkboxes", "Status follows progress", "Rolling pill labels"],
    /* recorded in dark: a remocn edit of a frame-exact recording of the live card */
    clip: "/clips/loop/task-card.mp4",
    poster: "/clips/loop/task-card.jpg",
    hero: false,
    sound: false,
    zoom: 1.3,
    stage: "#f6f6f7",
    clipStage: "#0a0a0b",
    stageDark: "#0a0a0b",
    /* the menus open past the card's edge */
    spill: true,
    usage: `import TaskCard from "@/components/library/TaskCard";

<TaskCard theme="light" onChange={({ subtasks, priority, status }) => console.log(subtasks, priority, status)} />`,
    props: [
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "A white card on soft grey, or graphite on near-black; every surface cross-fades when it changes." },
      { name: "title", type: "string", fallback: "\"Design System\"", note: "The task's name in the header." },
      { name: "subtasks", type: "{ label, done }[]", fallback: "four design tasks", note: "The subtasks; Reset in the ⋯ menu returns to these." },
      { name: "priority", type: "string", fallback: "\"Urgent\"", note: "Urgent, High, Medium or Low." },
      { name: "status", type: "string", fallback: "\"In Progress\"", note: "To Do, In Progress, In Review or Done; it follows the subtasks as they are ticked." },
      { name: "people", type: "{ name, avatar?, color? }[]", fallback: "three people", note: "The assignees; without an avatar, or if it fails to load, the initial shows." },
      { name: "onChange", type: "({ subtasks, priority, status }) => void", note: "Fired whenever anything on the card changes." },
    ],
    files: [
      { name: "TaskCard.tsx", lang: "tsx" },
      { name: "task-card.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "The subtasks hang off a single SVG tree — a trunk that curves into the last row and a branch to every checkbox — drawn from the same geometry as the checkboxes, so each branch ends exactly under its ring's stroke and the join is seamless. Every stroke is snapped to whole device pixels and re-snapped when the window or the display's scaling changes, so at 125% or 150% no segment paints heavier than the others. On arrival the trunk draws down and the branches reach out on a stagger.",
        "Ticking a subtask fills its ring on a spring and draws the tick; the progress pill counts up a number at a time, its bar fills, and its icon turns green once everything is done. Status follows along: complete every subtask and it becomes Done; reopen one and it goes back to In Progress.",
        "Priority and Status are pills tinted by their value, with their own light and dark tones. Each opens a small menu that takes the arrow keys and Escape and closes on a press outside; picking an option slides the old label up and out and the new one in while the pill's width follows on the same spring. The ⋯ menu marks every subtask complete or resets them.",
      ],
    },
    origin: { label: "tab" },
  },
  {
    slug: "magnify",
    category: "cards",
    name: "Magnify",
    isNew: true,
    tagline: "A type specimen you inspect with a real magnifying glass.",
    blurb:
      "One huge letter on a paper poster — and under the glass it turns out to be printed from rows of tiny characters. The lens carries its own copy of the poster at the zoom you set, so the magnification is real, not a blurred scale. It tilts with its own speed, floats at rest, and its shadow lifts when you hold it; click to push the zoom further.",
    highlights: ["Real magnification", "Micro-type letter", "Outline-trace intro", "Light and dark"],
    /* recorded in dark: a remocn edit of the real component, its springs replayed frame by frame */
    clip: "/clips/loop/magnify.mp4",
    poster: "/clips/loop/magnify.jpg",
    hero: false,
    sound: false,
    zoom: 1,
    stage: "#ffffff",
    /* the loop is the dark face, so its frame is the dark field */
    clipStage: "#0b0b0c",
    stageDark: "#0b0b0c",
    /* the poster's long shadow and the lens's handle run past the paper */
    spill: true,
    usage: `import Magnify from "@/components/library/Magnify";

<Magnify theme="light" glyph="A" micro="a" onZoomChange={(zoomed) => console.log(zoomed)} />`,
    props: [
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "Cream paper with black ink, or graphite with cream; the colours cross-fade when it changes." },
      { name: "glyph", type: "string", fallback: "\"A\"", note: "The big letter on the poster." },
      { name: "micro", type: "string", fallback: "\"a\"", note: "The tiny characters it is printed from, seen through the lens." },
      { name: "zoom", type: "number", fallback: "2.6", note: "Magnification at rest." },
      { name: "zoomMax", type: "number", fallback: "4.2", note: "Magnification after a click or Enter." },
      { name: "lensRadius", type: "number", fallback: "50", note: "The glass's radius, in poster units (the poster is 500 wide)." },
      { name: "size", type: "number", fallback: "380", note: "The poster's width in px; it never grows past its container." },
      { name: "intro", type: "boolean", fallback: "true", note: "The outline trace and the lens dropping in on arrival." },
      { name: "hint", type: "boolean", fallback: "true", note: "The \"Move to inspect · Click to zoom\" line under the poster." },
      { name: "onZoomChange", type: "(zoomed) => void", note: "Fired when the zoom toggles." },
    ],
    files: [
      { name: "Magnify.tsx", lang: "tsx" },
      { name: "magnify.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "The poster is drawn in a fixed 500 × 680 space and scaled to its width, so the letter, the lens and the micro-type keep their proportions at any size. Up close the letter is not ink at all: it is rows of tiny characters, each row nudged a fraction so the texture never lines up into stripes, clipped to the letter's own shape.",
        "The glass carries its own copy of that micro-type at the zoom you ask for, positioned so the point under the centre of the lens is exactly the point on the poster below it — so what you see is a true magnification, sharp at any zoom, rather than a blurred enlargement. The lens drawing scales by its radius and the inner zoom is divided by the same amount, so the magnification you set is the one you get.",
        "The lens follows the pointer on a spring, tilts with its own sideways speed, floats very slightly at rest, and its cast shadow drifts further and softens when it is held, as if lifted off the paper. Click or press Enter to push the zoom further; the arrow keys move it (Shift for bigger steps) and Escape puts it back. On arrival the letter's outline traces itself, the ink floods in, and the glass drops into place.",
      ],
    },
    origin: { label: "magnify-a" },
  },
  {
    slug: "progress-image",
    category: "controls",
    name: "Progress Image",
    isNew: true,
    tagline: "A rollout card whose photograph is the progress bar.",
    blurb:
      "The rollout percentage is how far the picture has resolved: drag the slider and the photograph builds itself up — or falls back apart — under your finger. Pick the look of the resolve from the bar under the card: a pixel quadtree, fog, a pencil sketch, a halftone print, a grain dissolve or bleeding ink. The presets share one liquid indicator that stretches into a drop between them.",
    highlights: ["Photo as progress bar", "Six resolve looks", "Liquid preset pill", "1:1 drag, full keyboard"],
    /* a remocn edit of the real component, rendered from the same reveal engine */
    clip: "/clips/loop/progress-image.mp4",
    poster: "/clips/loop/progress-image.jpg",
    hero: false,
    sound: false,
    zoom: 1,
    stage: "#f4f4f4",
    clipStage: "#f4f4f4",
    stageDark: "#0e0e0f",
    /* the card's long soft shadow and the switcher's offset shadow run past their boxes */
    spill: true,
    usage: `import ProgressImage from "@/components/library/ProgressImage";

<ProgressImage theme="light" src="/your-photo.jpg" onChange={(value) => console.log(value)} />`,
    props: [
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "A pale card with a graphite active pill, or graphite with a white one." },
      { name: "src", type: "string", fallback: "a picsum fjord", note: "The photograph that resolves. Serve it with CORS headers: every look but Pixel reads its pixels." },
      { name: "alt", type: "string", note: "What the photograph shows, for screen readers." },
      { name: "defaultValue", type: "number", fallback: "75", note: "Where the rollout lands once the photograph has loaded." },
      { name: "defaultTransition", type: "\"pixel\" | \"fog\" | \"sketch\" | \"halftone\" | \"dissolve\" | \"ink\"", fallback: "\"pixel\"", note: "The look it opens in; the bar under the card changes it." },
      { name: "onChange", type: "(value) => void", note: "Fired with the committed whole-number percentage whenever it changes." },
    ],
    files: [
      { name: "ProgressImage.tsx", lang: "tsx" },
      { name: "progress-image.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "The slider and the photograph are one value. At 0% there is only a skeleton with a shimmer passing over it; as the rollout rises the picture arrives, and at 100% it is whole. Every look is a pure function of that value, so dragging back down takes the picture apart again the same way, frame for frame. The drag is 1:1 — no spring between the pointer and the fill — and on release it settles on the whole number, or snaps to a preset when it lands within two of one.",
        "Pixel is a quadtree: 48px tiles split into four sharper tiles, then 24, 12 and 6px and finally full detail, each split at its own seeded threshold with outer tiles a little later than the middle, while the colour blooms in with the detail. The other five are per-pixel reveals — a fog that clears in drifting patches, a pencil sketch coloured in from the shadows up, a halftone print resolving outward from the centre, 2px grains snapping in one by one, and ink blots spreading across paper with a dark wet edge. Each is one pass through a 256-entry table, and they are built in idle time, so switching is instant and replays the resolve in the new look.",
        "The presets share one indicator drawn as two blobs under a goo filter: the lead snaps to the new pill while the trail lags behind on a softer spring, so the two stretch into a single liquid drop and merge again when the trail lands. The fill slides by transform alone, the percentage fades in once there is room for it, and the track is a full keyboard slider — arrows, Shift for steps of ten, Page Up and Down, Home and End.",
      ],
    },
    origin: { label: "rollout-card" },
  },
  {
    slug: "prompt-composer",
    category: "controls",
    name: "Prompt Composer",
    isNew: true,
    tagline: "An assistant's field with its quick actions fanned out behind it.",
    blurb:
      "Five tilted cards stand behind an Ask anything field — create an image, add a note, create an event, voice mode, analyse docs. Hover one and it lifts and straightens while its neighbours lean away; pick it and the fan sinks behind the field as the action arrives inside it as a chip. Voice turns the field into a recorder with a live, scrolling waveform.",
    highlights: ["Fanned quick actions", "Card to chip", "Voice recorder demo", "Gliding model list"],
    /* recorded in dark, in 4K: a remocn edit of the real component */
    clip: "/clips/loop/prompt-composer.mp4",
    poster: "/clips/loop/prompt-composer.jpg",
    hero: false,
    sound: false,
    zoom: 1,
    stage: "#f3f3f3",
    /* the loop is the dark face, so its frame is the dark stage */
    clipStage: "#0b0b0c",
    stageDark: "#0b0b0c",
    /* laid out as a wide row — pill, field, send — not a card */
    wide: true,
    /* the cards' and the field's soft shadows run past their boxes */
    spill: true,
    usage: `import PromptComposer from "@/components/library/PromptComposer";

<PromptComposer theme="light" onSend={({ text, action, model }) => console.log(text, action, model)} />`,
    props: [
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "A white field and paper cards on pale grey, or the same in graphite." },
      { name: "onSend", type: "({ text, action, model }) => void", note: "Fired on Enter or the send button, with the text, the action picked (or null) and the model's name." },
    ],
    files: [
      { name: "PromptComposer.tsx", lang: "tsx" },
      { name: "prompt-composer.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "Five quick actions stand up behind the field, each leaning its own way, the way cards sit when they are pushed into a holder: an image, a note with a yellow top, an event with a red one, voice with its record button, and documents with its corner folded down. Hover one and it lifts and straightens on a spring while the cards either side lean out of its way, and its drawing comes to life — the sparkle turns, the note's lines write themselves in, the date rises, the record button pulses, the dog-ear folds further back.",
        "The fan rises out of the field itself — below the field's middle it is clipped, so a card is never seen hanging under it. Pick one and the fan sinks back into the field, the picked card last, while the action arrives inside the field as a chip and the placeholder changes to suit through a blur. Tap the chip, press Escape, or Backspace on an empty field to let it go and bring the fan back. The plus folds the fan away and back.",
        "Voice — the card or the microphone — turns the field into a recorder: a red dot, a running clock and a waveform that scrolls in from the right like a voice memo, syllables swelling and falling with pauses between words. It is a demo, so nothing is listened to: stop it and a sample transcript types itself in, ready to send, or cancel it to go back. Send — Enter, or the arrow inside the field — and the composer starts over: the field clears and the cards come up out of it again.",
        "The model pill opens a short list: one grey square, shared through a layout id, follows the pointer from row to row, and the check marks the model in use. One spring drives every morph, as in Bencho's SelectionList, so all the pieces land together.",
      ],
    },
    origin: { label: "prompt composer" },
  },
  {
    slug: "calendar-card",
    category: "cards",
    name: "Calendar",
    isNew: true,
    tagline: "A month card where the selected day glides from date to date.",
    blurb:
      "A soft, double-walled month card that opens on today, by the visitor's own clock. The selected day is one red square that glides to whichever date you pick, the big number above rolls a digit at a time, the month name swaps through a blur and the bar fills to how far through the month you are. Tap the month to pick any month and year, or press the little calendar in the corner to tear a page off to the next month.",
    highlights: ["Opens on today", "Gliding selected day", "Month and year picker", "Tear-off month turn"],
    clip: "/clips/loop/calendar-card.mp4?v=2",
    poster: "/clips/loop/calendar-card.jpg?v=2",
    hero: false,
    sound: false,
    zoom: 1,
    stage: "#f4f4f4",
    clipStage: "#f4f4f4",
    /* the card's long soft shadow runs past its box */
    spill: true,
    stageDark: "#0b0b0c",
    usage: `import CalendarCard from "@/components/library/CalendarCard";

<CalendarCard theme="light" onChange={(date) => console.log(date)} />`,
    props: [
      { name: "defaultDate", type: "Date", fallback: "today", note: "The date it opens on. Left out, it is today by the visitor's clock, read on the client so it is their date in their timezone." },
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "A pale double-walled card, or the same card in graphite with a brighter red." },
      { name: "onChange", type: "(date) => void", note: "Fired whenever the selected date changes — by a click, a key or a month turn." },
    ],
    files: [
      { name: "CalendarCard.tsx", lang: "tsx" },
      { name: "calendar-card.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "It opens on today. The date comes from the visitor's own clock, not the server's, so it is their day wherever they are — the card holds its footprint for the one frame before that is known, then arrives with the date already set, and nothing on the page moves. Today stays marked in red as you browse — in the grid and in the month picker. Left open past midnight, the card moves on to the new day by itself, as long as it was still sitting on the old one.",
        "The selected day is a single red square shared through a layout id, so picking another date glides it there on a spring instead of switching a highlight off in one place and on in another; a soft grey square follows the pointer between days the same way. The big number rolls a digit at a time, the month name swaps through a blur toward the way the page turned, and the four-part bar fills to how far through the month the date falls.",
        "Tap the month line — the month and the year — and the days give way to a picker: the year between two arrows, rolling a digit at a time as it changes, over the twelve months, where the same red square marks the one you are in. Pick a month and the days come back, turned to it. Page Up and Page Down change the year there, and Escape closes it.",
        "The little calendar in the corner is a button. Press it and its page tears off — a red leaf flips up and away while the dots ripple back in — and the card turns to the next month, keeping the day number (clamped to the new month's length) with the grid sliding over through a blur. Right-click it to go back. The grid is a keyboard calendar too: the arrows move a day or a week, Page Up and Page Down a month, Home and End to the month's ends.",
      ],
    },
    origin: { label: "calendar" },
  },
  {
    slug: "chat-room",
    requestedBy: { handle: "hrstwt", url: "https://x.com/hrstwt" },
    category: "lists",
    name: "Chat Room",
    isNew: true,
    tagline: "A stack of faces that morphs into a voice chat card, and back.",
    blurb:
      "A pill of faces that grows into a voice chat card. The faces fly to their seats, the hidden ones rise into the grid after them, the live badge parks in the corner and the count dissolves on the way in — then the whole thing folds back into the pill. One spring drives every piece, so they all land together, each step with its own soft synthesised sound.",
    highlights: ["Shared-surface morph", "Faces fly to their seats", "Live equaliser badges", "Synthesised UI sounds"],
    clip: "/clips/loop/chat-room.mp4",
    poster: "/clips/loop/chat-room.jpg",
    hero: false,
    sound: true,
    zoom: 1,
    stage: "#f5f5f6",
    clipStage: "#f5f5f6",
    /* the card's soft shadow runs past its box; clipped there it draws a line */
    spill: true,
    stageDark: "#0c0c0d",
    usage: `import ChatRoom from "@/components/library/ChatRoom";

<ChatRoom corner={20} rows={4} theme="light" onJoinChange={(joined) => console.log(joined)} />`,
    props: [
      { name: "corner", type: "number", fallback: "20", note: "The open card's corner radius, clamped to 0–40px." },
      { name: "rows", type: "2 | 3 | 4", fallback: "4", note: "How many faces the closed pill shows; the rest are counted as \"+3\"." },
      { name: "people", type: "ChatRoomPerson[]", fallback: "seven people", note: "Who is in the room — id, name, portrait URL and whether they are speaking. Up to eight sit on the card." },
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "A white card on soft grey, or graphite on near-black." },
      { name: "sound", type: "boolean", fallback: "true", note: "The opening and closing pops and the join and leave chimes, synthesised at play time." },
      { name: "onJoinChange", type: "(joined) => void", note: "Fired when the join button is pressed, with whether you are now in." },
    ],
    files: [
      { name: "ChatRoom.tsx", lang: "tsx" },
      { name: "chat-room.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "The pill and the card are one surface, shared through a layout id, inside a fixed stage — so the card grows out of the pill's own centre and nothing around it moves. The faces on the pill fly to their seats on the card, the hidden ones rise into the grid after them on a short stagger, the live badge parks in the header corner and the \"+3\" travels in and dissolves.",
        "Closing runs it backwards: the card's contents fade out first, then the surface folds back into the pill and focus returns to it. Escape or a press outside closes it. Every equaliser bar animates by transform only, so nothing touches layout, and the sounds — a rising pop to open, a falling one to close, a two-note chime to join and its mirror to leave — are synthesised with Web Audio, with no files to load.",
      ],
    },
    origin: { label: "chat-room" },
  },
  {
    slug: "dynamic-drop-zone",
    requestedBy: { handle: "hrstwt", url: "https://x.com/hrstwt" },
    category: "controls",
    name: "Dynamic Drop Zone",
    isNew: true,
    tagline: "A file drop zone that turns into a magnetic black hole.",
    blurb:
      "Carry a file over it and the paper dims into ink: eight dashed rings fall into a tunnel that bends toward your pointer while debris spirals in from the rim. Drop it and the hole swallows the file, flashes back to paper and stacks its rings into an upload pill, with a spinner that turns into a drawn check.",
    highlights: ["Magnetic ring tunnel", "Debris spiralling in", "Rings stack into a pill", "Real files or a demo file"],
    clip: "/clips/loop/dynamic-drop-zone.mp4?v=3",
    poster: "/clips/loop/dynamic-drop-zone.jpg?v=3",
    hero: false,
    sound: false,
    zoom: 1,
    stage: "#e6e8ee",
    clipStage: "#e6e8ee",
    /* the zone's soft shadow, and the hole's swelling, run past its box */
    spill: true,
    stageDark: "#050506",
    usage: `import DynamicDropZone from "@/components/library/DynamicDropZone";

<DynamicDropZone theme="light" onDrop={(files) => console.log(files)} />`,
    props: [
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "A paper zone with pale dashed rings, or a graphite one with faint ones." },
      { name: "corner", type: "number", fallback: "28", note: "The zone's corner radius, clamped to 0–40px. The rings step in from it." },
      { name: "uploadMs", type: "number", fallback: "3400", note: "How long the spinner runs before the check lands, in ms." },
      { name: "demoFile", type: "boolean", fallback: "true", note: "The draggable demo file under the zone, so it can be tried without a file to hand." },
      { name: "onDrop", type: "(files) => void", note: "Fired with the files dropped from the desktop. The demo file sends none." },
    ],
    files: [
      { name: "DynamicDropZone.tsx", lang: "tsx" },
      { name: "dynamic-drop-zone.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "Carry a file over the zone and it dims from paper through grey into ink. Its eight dashed rings blink out and come back as a tunnel, bunched toward the centre, and the tunnel bends toward the pointer — the inner rings lean furthest — while squares and dots of debris spiral in from the rim on a quarter-turn swirl and shrink to nothing at the core.",
        "Drop it and the hole pulls itself in and swallows the file, then flashes back out to paper: the innermost ring becomes an upload pill and the others stack behind it like drawers spilling off the bottom edge. The spinner shrinks to a point and a check is drawn in its place before everything resets. It takes real files from the desktop, and carries a demo file of its own — drag it with a mouse, pen or finger, or focus it and press Enter to watch the drag played for you.",
      ],
    },
    origin: { label: "dynamic-drop-zone" },
  },
  {
    slug: "swap-card",
    category: "cards",
    name: "Swap Card",
    isNew: true,
    tagline: "A token swap card where every number rolls and the button is liquid.",
    blurb:
      "Swap, Buy and Stake on one card. The quote rolls in like an odometer, flipping the pair sends the two token pills gliding past each other, and the token list opens out of its pill through a blur. The button is liquid: light drifts across it, it ripples where you press, shakes when it can't swap and bursts when a swap lands.",
    highlights: ["Odometer quotes", "Pills trade panels on flip", "Liquid button", "Light and dark"],
    clip: "/clips/loop/swap-card.mp4",
    poster: "/clips/loop/swap-card.jpg",
    hero: false,
    sound: false,
    zoom: 1,
    stage: "#eaecef",
    clipStage: "#eaecef",
    /* the token list and the swap burst open past the card's box */
    spill: true,
    stageDark: "#0e0f12",
    usage: `import SwapCard from "@/components/library/SwapCard";

<SwapCard theme="light" onSwap={(trade) => console.log(trade)} />`,
    props: [
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "White panels on cool grey, or graphite on near-black with a softer blue." },
      { name: "onSwap", type: "(trade) => void", note: "Fired when a swap, buy or stake lands, with the mode, the pair, the amount paid and the amount received." },
    ],
    files: [
      { name: "SwapCard.tsx", lang: "tsx" },
      { name: "swap-card.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "Swap, Buy and Stake share one card, and the tab pill slides between them. Type an amount and the quote rolls in like an odometer — each character that changes slides out the top while its replacement rises from below. Flip the pair and the two token pills, each with its own layout id, glide past each other to trade panels while the arrow turns half a circle; flipping back restores what you typed rather than compounding the rounding.",
        "The token list opens out of its pill through a blur with the current token centred, the rate line rolls over when the pair changes, and the details drawer unfolds on the same spring as everything else. The button is liquid: pools of light drift across it and glints twinkle on its surface, it ripples from wherever it is pressed, shakes \"no\" when there is nothing to swap, sweeps while the swap is in flight and throws a ring of specks when it lands.",
      ],
    },
    origin: { label: "swap-card" },
  },
  {
    slug: "liquid-tabs",
    category: "lists",
    name: "Liquid Tabs",
    isNew: true,
    tagline: "A notifications card whose active tab is liquid, flowing from tab to tab.",
    blurb:
      "The card and its active tab are one liquid shape: switch tabs and the tab slides under the next label, flowing into the card on the way. Rows leave toward where you came from and arrive from where you went, through a blur; the selected row's avatar inverts with a bounce, and the chevron swaps the third tab from an overflow menu.",
    highlights: ["Liquid folder tab", "Direction-aware rows", "Overflow tab menu", "Light and dark"],
    clip: "/clips/loop/liquid-tabs.mp4?v=2",
    poster: "/clips/loop/liquid-tabs.jpg?v=2",
    hero: false,
    sound: false,
    zoom: 1,
    stage: "#e9e9eb",
    clipStage: "#e8e8e8",
    /* the card's soft shadow runs past its box; clipped there it draws a line on a short stage */
    spill: true,
    stageDark: "#0c0c0e",
    usage: `import LiquidTabs from "@/components/library/LiquidTabs";

<LiquidTabs corner={20} rows={4} theme="light" onSelect={(item, tab) => console.log(tab, item)} />`,
    props: [
      { name: "corner", type: "number", fallback: "20", note: "The card's corner radius, clamped to 0–40px. The tab and the menu follow it." },
      { name: "rows", type: "2 | 3 | 4", fallback: "4", note: "How many rows each tab shows; the card is exactly that tall." },
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "A white card on a grey strip, or graphite on near-black." },
      { name: "onSelect", type: "(item, tab) => void", note: "Fired when a row is selected, with the tab it is on." },
    ],
    files: [
      { name: "LiquidTabs.tsx", lang: "tsx" },
      { name: "liquid-tabs.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "The card's body and the active tab are drawn as two shapes under one goo filter, so the tab reads as part of the card — a folder tab — and when you switch, it slides under the next label on a spring and the two run together on the way. The grey strip behind the other tabs sits outside the filter, so they stay flat.",
        "The rows know which way you went: they leave toward the tab you came from and arrive from the one you went to, through a blur, on a short stagger. Hovering slides one highlight between rows, the selected row's avatar inverts with a small bounce, and the chevron opens an overflow menu whose pick replaces the third tab — its label rolling over as the tab slides to it. Arrow keys move between tabs.",
      ],
    },
    origin: { label: "tab" },
  },
  {
    slug: "thermal-dial",
    category: "cards",
    name: "Thermal Dial",
    isNew: true,
    tagline: "A thermal dial that undulates with heat and rolls through the seasons.",
    blurb:
      "Grab the dial and drag: 96 radial ticks undulate with a travelling wave and trailing comet while the needle sweeps. The season title staggers through a blur, the numbers roll per digit, and the ambient wash breathes with dynamic temperature gradient colors.",
    highlights: ["Travelling wave ticks", "Seasons blur swap", "Dynamic heat wash", "Drag or scroll to dial"],
    clip: "/clips/loop/thermal-dial.mp4?v=2",
    poster: "/clips/loop/thermal-dial.jpg?v=2",
    hero: false,
    sound: false,
    zoom: 1,
    stage: "#ebe9e5",
    clipStage: "#050706",
    /* the glow under the dial runs past its box; clipped there it draws a hard line on a short stage */
    spill: true,
    stageDark: "#060606",
    usage: `import ThermalDial from "@/components/library/ThermalDial";

<ThermalDial defaultValue={38} theme="dark" onChange={(value, season) => console.log(value, season)} />`,
    props: [
      { name: "defaultValue", type: "number", fallback: "38", note: "The reading it sweeps up to and settles on when it first appears." },
      { name: "min", type: "number", fallback: "-9", note: "The bottom of the scale." },
      { name: "max", type: "number", fallback: "70", note: "The top of the scale." },
      { name: "size", type: "number", fallback: "340", note: "How wide the card is drawn, in px. Everything on it scales with it; it never exceeds 80% of the viewport." },
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"dark\"", note: "Obsidian with an ember glow, or the same card in daylight porcelain." },
      { name: "hint", type: "boolean", fallback: "true", note: "The line under the card saying how to use it." },
      { name: "onChange", type: "(value, season) => void", note: "Fired whenever the reading is set, with the season it falls in." },
    ],
    files: [
      { name: "ThermalDial.tsx", lang: "tsx" },
      { name: "thermal-dial.css", lang: "css" },
    ],
    info: {
      credit: { label: "bencho.dev", href: "https://bencho.dev/" },
      paragraphs: [
        "A hardware-inspired thermal dial. Grab the card and drag along its circumference to set the reading; the needle tracks your pointer on a damped spring that overshoots and settles with natural inertia, while mouse wheel and arrow keys step through whole degrees.",
        "The radial ring is 96 ticks that carry an undulating wave and a brighter comet at the head. The digits roll individually with blur transitions, the season name changes with staggered letter-by-letter blurs, and the bottom heat wash blends through five dynamic color stops from deep arctic blue to scorching crimson.",
      ],
    },
    origin: { label: "Temp" },
  },
  {
    slug: "lamp-switch",
    category: "controls",
    name: "Lamp Switch",
    isNew: true,
    tagline: "A hanging ceramic lamp that swings on a cord and toggles with a liquid switch.",
    blurb:
      "A ceramic pendant lamp that drops in on its cord, lands into a stretch and a swing, and switches itself on. Pull the lamp down past the detent to click the light like a pull-chain, or drag the liquid switch with elastic rubber-banding. Turning it on flickers the bulb to life, casting a warm beam and ambient glow.",
    highlights: ["Physics pendulum swing", "Pull-cord chain detent", "Liquid gooey switch", "Bulb warm-up flicker"],
    clip: "/clips/loop/lamp-switch.mp4?v=2",
    poster: "/clips/loop/lamp-switch.jpg?v=2",
    hero: false,
    sound: false,
    zoom: 1,
    stage: "#e4dfd6",
    clipStage: "#e0ddd4",
    stageDark: "#313539",
    usage: `import LampSwitch from "@/components/library/LampSwitch";

<LampSwitch theme="dark" onToggle={(on) => console.log(on)} />`,
    props: [
      { name: "autoOn", type: "boolean", fallback: "true", note: "Switch the light on by itself once the lamp has dropped in and landed." },
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"dark\"", note: "A dim room with a warm bulb, or the same lamp in a daylit parchment room." },
      { name: "size", type: "number", fallback: "354", note: "The card's size in px at most. It shrinks to fit a narrow container, and the physics scales with it." },
      { name: "onToggle", type: "(on) => void", note: "Fired whenever the light turns on or off — by the switch, or by pulling the lamp." },
    ],
    files: [
      { name: "LampSwitch.tsx", lang: "tsx" },
      { name: "lamp-switch.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "A suspended pendant lamp drawn inside an architectural shadow box. The lamp hangs on a flexible cord governed by semi-implicit Euler integration: drag it sideways to set it swinging on a pendulum, or tug it down past the detent to click the pull-chain mechanism and toggle the light.",
        "The toggle switch at the base uses an SVG gooey filter: dragging the knob stretches a trailing drop that snaps with velocity projection. Turning it on runs a realistic bulb warm-up flicker sequence, illuminating the room with a radial beam and glowing ambient halo.",
      ],
    },
    origin: { label: "On,off" },
  },
  {
    slug: "joystick",
    category: "controls",
    name: "Joystick",
    tagline: "A pixel-art arcade stick you can grab, push to the gate and let snap back.",
    blurb:
      "A real arcade stick, drawn a pixel at a time. Grab the ball and it follows your hand through an octagonal gate; let go and the return spring overshoots and settles. Four microswitches click as it crosses into each direction, the shaft knocks on the gate, and the spring twangs on release — all synthesised, with haptics on phones and rumble on a gamepad.",
    highlights: ["Rasterised every frame", "Octagonal gate", "Microswitch clicks", "Keys and gamepad"],
    clip: "/clips/loop/joystick.mp4",
    poster: "/clips/loop/joystick.jpg",
    hero: false,
    sound: true,
    zoom: 0.9,
    stage: "#9ab5d3",
    stageDark: "#1f2638",
    wide: true,
    usage: `import Joystick from "@/components/library/Joystick";

<Joystick theme="light" onSwitch={(direction, on) => console.log(direction, on)} />`,
    props: [
      { name: "pixel", type: "number", fallback: "8", note: "The size of one art pixel, in CSS pixels. It steps down by whole pixels to fit a narrow container." },
      { name: "sound", type: "boolean", fallback: "true", note: "Microswitch clicks, the gate's knock and the spring's twang, synthesised at play time." },
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "Arcade blue by day, navy at night. The stick itself is the same red ball in both." },
      { name: "autoFocus", type: "boolean", fallback: "false", note: "Take focus on mount, so the arrow keys and WASD drive it straight away." },
      { name: "onMove", type: "(x, y) => void", note: "Fired as the stick moves, with x and y in −1…1; +y is toward the player." },
      { name: "onSwitch", type: "(direction, on) => void", note: "Fired as each of the four microswitches makes and breaks — the events a game would read." },
    ],
    files: [
      { name: "Joystick.tsx", lang: "tsx" },
      { name: "joystick.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "Drag the red ball and the stick leans after it, tracking your hand on a stiff spring with a little mass; push it to the edge and it stops on an octagonal restrictor gate, flat sides facing the eight directions, with a knock and a nudge of the whole stick. Let go and the return spring throws it back past the centre and lets it settle. Focused, the arrow keys and WASD drive it, and a connected gamepad's stick or d-pad does too.",
        "Nothing here is a sprite. The plate, the shaft and the ball are rasterised every frame onto a 64 × 52 canvas — outlined, banded and dithered like hand-made pixel art — from the stick's real 3D tilt, so every angle stays crisp, and the canvas is then scaled up by whole pixels. Four microswitches make and break with a little hysteresis so they never chatter, each with its own click.",
      ],
    },
    origin: { label: "Joystick" },
  },
  {
    slug: "weather",
    category: "cards",
    name: "Weather",
    tagline: "A weather square that opens out into a five-day forecast.",
    blurb:
      "One card, two states. Tap the square and it springs open into a black shell with the forecast sliding out beside it; pick a day and the panel takes its colour while the temperature rolls to the new reading, digit by digit. Every dimension is a custom property, so a tap mid-flight retargets from wherever the card has got to.",
    highlights: ["Square to forecast", "Rolling odometer", "Recolours by day", "Light and dark"],
    clip: "/clips/loop/weather.mp4",
    poster: "/clips/loop/weather.jpg",
    hero: false,
    sound: false,
    zoom: 1.15,
    stage: "#ebebeb",
    stageDark: "#0e0e0f",
    wide: true,
    usage: `import Weather from "@/components/library/Weather";

<Weather city="Los Angeles" theme="light" onSelect={(day) => console.log(day)} />`,
    props: [
      { name: "city", type: "string", fallback: "\"Los Angeles\"", note: "The city on the square, compact card." },
      { name: "forecastCity", type: "string", fallback: "\"Amsterdam\"", note: "The city once the card has opened into the forecast." },
      { name: "days", type: "WeatherDay[]", fallback: "Mon–Fri", note: "Day, condition, label, low and high. The first is shown on arrival." },
      { name: "defaultExpanded", type: "boolean", fallback: "false", note: "Start opened out rather than as the square." },
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "A black shell for a pale page, or a graphite one with a hairline edge for a dark page." },
      { name: "onSelect", type: "(day, index) => void", note: "Fired when a day is picked from the forecast." },
    ],
    files: [
      { name: "Weather.tsx", lang: "tsx" },
      { name: "weather.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "Shut, it is a yellow square: the condition, the temperature and the city. Tap it and the card widens into a black shell, the panel shrinks into its left side, and a dark five-day forecast slides out beside it, its rows arriving forty milliseconds apart. On a phone there is no room to go sideways, so the forecast stacks underneath and slides up instead — the same transitions with different numbers.",
        "Pick a day and the panel takes its colour — yellow for sun, pale blue for cloud, slate for rain — while the condition swaps through a blur and the temperature rolls. Each digit is a strip of 0 to 9 behind a clipping box, so a new reading only slides the strips, and a second pick mid-roll carries on from wherever they are. Everything is a CSS transition on custom properties, so nothing ever snaps back to start.",
      ],
    },
    origin: { label: "Weather-UI", href: "https://github.com/Rachit315/Weather-UI" },
  },
  {
    slug: "recorder",
    category: "media",
    name: "Recorder",
    tagline: "A voice recorder with a waveform that scrolls under the playhead.",
    blurb:
      "Record, pause, save, play back and scrub, on a dark card with a superellipse outline. The waveform is a fixed pool of bars driven by one frame loop, fading into progressive glass at both edges, and every key presses with real travel and a synthesised click. No microphone: the signal is generated, so it works anywhere.",
    highlights: ["Scrub by drag or scroll", "Hold to clear", "Rolling timer", "Light and dark"],
    clip: "/clips/loop/recorder.mp4",
    poster: "/clips/loop/recorder.jpg",
    hero: false,
    sound: true,
    zoom: 1.1,
    stage: "#e2e2e1",
    stageDark: "#363636",
    clipStage: "#363636",
    usage: `import Recorder from "@/components/library/Recorder";

<Recorder size={360} theme="dark" onSave={(seconds) => console.log(seconds)} />`,
    props: [
      { name: "size", type: "number", fallback: "360", note: "How wide the card is drawn. It shrinks further to fit a small screen." },
      { name: "sound", type: "boolean", fallback: "true", note: "A tactile click on every press and a tick as you scrub, synthesised at play time." },
      { name: "autoFocus", type: "boolean", fallback: "false", note: "Take the keyboard on mount, so Space and S work straight away." },
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"dark\"", note: "Graphite with white bars, or porcelain with graphite bars. The red key is the same in both." },
      { name: "onSave", type: "(seconds) => void", note: "Fired when a take is saved, with its length." },
    ],
    files: [
      { name: "Recorder.tsx", lang: "tsx" },
      { name: "recorder.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "The red key records, pauses and resumes; the side key stops and saves the take, which ripples through the waveform as it lands. On a saved take the red key plays it back, the bars ahead of the playhead dimmed, and the side key turns into hold-to-clear: a ring draws itself around it, and letting go early cancels. Drag the waveform, scroll over the card or use the arrow keys to scrub — Space and S work too.",
        "The waveform is one pool of bars that scroll under a fixed playhead, all drawn from a single frame loop, so nothing is made or thrown away while it runs. Each bar springs up as it is born, and the edges dissolve through six stacked backdrop blurs that grow stronger toward the rim. The timer's digits roll through a blur, the glyphs on the keys morph with a twist, and there is no microphone: the signal is generated speech-shaped noise, so the card works anywhere.",
      ],
    },
    origin: { label: "Recorder" },
  },
  {
    slug: "taxi",
    category: "cards",
    name: "Taxi",
    tagline: "Hail a cab in one tap, and ride the whole trip on one card.",
    blurb:
      "One tap runs the ride: hailing, a driver found, the cab at the curb, the trip counting down, and a rating at the end. The corner glyph morphs point for point from a waving person to the cab to a check, gooey blobs burst off the panel at every milestone, and each beat has its own sound — the horn, the door, the engine.",
    highlights: ["Point-for-point morphs", "Gooey milestones", "A cue for every beat", "Light and dark"],
    clip: "/clips/loop/taxi.mp4",
    poster: "/clips/loop/taxi.jpg",
    hero: false,
    sound: true,
    zoom: 1.3,
    stage: "#f2f2f2",
    stageDark: "#0f0e0b",
    spill: true,
    usage: `import Taxi from "@/components/library/Taxi";

<Taxi width={300} theme="light" onRate={(stars) => console.log(stars)} />`,
    props: [
      { name: "width", type: "number", fallback: "300", note: "How wide the card is drawn. Everything on it scales with it." },
      { name: "sound", type: "boolean", fallback: "true", note: "The ride's cues: tap, horn, door, engine, ticks and the rest." },
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "The yellow cab by day, or at night: a dark card with the glyph and panel lit in cab yellow." },
      { name: "soundBase", type: "string", fallback: "\"/sounds/taxi\"", note: "Where the twelve .wav cues are served from." },
      { name: "onRate", type: "(stars) => void", note: "Fired with the stars given once the ride is rated." },
    ],
    files: [
      { name: "Taxi.tsx", lang: "tsx" },
      { name: "taxi.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "Tap Taxi! and the ride runs itself. The panel pinches in while it hails, liquid bumps travelling along its top edge and the pin pulsing; a driver is found and the person in the corner morphs into the cab, a track fills under the minutes counting down; the cab arrives with a horn and a hop; you get in, the door shuts and the engine starts, and the trip counts down to a check and five stars to rate it.",
        "The glyph is five shapes that morph pairwise, each sampled into a ring of two hundred points and rotated to line up with the last, so nothing twists on the way. Letters roll out and back in, changing only the ones that differ, and the gooey filter behind the blobs is only switched on while they move — it is the most expensive thing on the card to paint. Every beat has its own cue, from Kenney's interface sounds and Mixkit's horn, door and engine.",
      ],
      pin: "https://in.pinterest.com/pin/1056657131344553887/",
    },
    origin: { label: "Taxi" },
  },
  {
    slug: "chips",
    category: "controls",
    name: "Chips",
    tagline: "A selection list of 3D chips that press into the surface.",
    blurb:
      "Every chip is extruded: its lip is a hard shadow as deep as the chip travels, and a press drives it down by exactly that much while the lip shrinks to match, so it lands on its own edge instead of just shrinking. The selected chip stays pressed in, inverted, a pixel proud of the surface.",
    highlights: ["A real press, not a scale", "Light and dark", "Synthesised clicks", "Arrow-key navigation"],
    clip: "/clips/loop/chips.mp4",
    poster: "/clips/loop/chips.jpg",
    sound: true,
    zoom: 0.94,
    stage: "#edeae4",
    stageDark: "#121211",
    wide: true,
    usage: `import Chips from "@/components/library/Chips";

<Chips corner={20} shadow={50} rows={2} theme="light" />`,
    props: [
      { name: "corner", type: "number", fallback: "20", note: "Chip radius, clamped to 0–40px." },
      { name: "shadow", type: "number", fallback: "50", note: "How far the cast shadow is thrown, 0–100." },
      { name: "rows", type: "2 | 3 | 4", fallback: "2", note: "Rows of four chips. Changing it drops the new set in." },
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "Paper chips, or graphite. The selected chip is the inverse in both." },
      { name: "sound", type: "boolean", fallback: "true", note: "Press, release, select and hover clicks, synthesised at play time." },
      { name: "defaultValue", type: "string | null", fallback: "\"start\"", note: "The chip selected on first render." },
      { name: "onChange", type: "(value) => void", note: "Fired with the selected chip's id, or null once it is deselected." },
    ],
    files: [
      { name: "Chips.tsx", lang: "tsx" },
      { name: "chips.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "Each chip is a little block with depth. Its lip is a hard shadow exactly as deep as the chip can travel, so pressing it drives the chip down onto its own edge while the lip shrinks to match — the soft ground shadow squashes with it. Hover lifts the chip a few pixels and tips its icon; letting go springs it back up with a pop.",
        "Selecting a chip leaves it pressed in and inverted; selecting it again lets it back up. Every click is synthesised — a noise transient through a bandpass for the plastic, and a pitched body that drops fast for the travel — so there is nothing to download, and no two clicks are quite the same. The component sizes itself off its own width, so the same chips work on a stage, in a sidebar or on a phone.",
      ],
    },
    origin: { label: "Chips" },
  },
  {
    slug: "otp-input",
    category: "controls",
    name: "Egg OTP",
    creator: { handle: "RachitThakur146", url: "https://x.com/RachitThakur146" },
    tagline: "A one-time-code field made of eggs that crack on a wrong code.",
    blurb:
      "Each egg is two clipped copies of one shape, split along a single jagged line that is also the crack's stroke, so an egg always breaks exactly where it cracked. A right code makes the row hop; a wrong one is refused with a shake, the crack draws itself down every shell, and the halves hinge open and tumble away before coming back together, empty.",
    highlights: ["Crack, hinge and tumble", "Light and dark", "One-time-code autofill", "Your own verify"],
    clip: "/clips/loop/otp-input-dark.mp4",
    poster: "/clips/loop/otp-input-dark.jpg",
    sound: false,
    zoom: 1.65,
    stage: "#ffffff",
    stageDark: "#0b0b0b",
    clipStage: "#0b0b0b",
    spill: true,
    usage: `import OtpInput from "@/components/library/OtpInput";

<OtpInput length={6} verify={(code) => check(code)} theme="light" />`,
    props: [
      { name: "length", type: "number", fallback: "6", note: "How many digits. A dash splits the row in half." },
      { name: "code", type: "string", fallback: "\"123456\"", note: "The code that passes, for demos. Ignored when verify is given." },
      { name: "verify", type: "(value) => boolean | Promise<boolean>", note: "Your own check, e.g. a request to your server." },
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "Pale eggs on white, or charcoal eggs on black." },
      { name: "hint", type: "ReactNode | false", fallback: "\"Enter 123456 to pass.\"", note: "The line under the row; false hides it." },
      { name: "autoFocus", type: "boolean", fallback: "false", note: "Take the keyboard as soon as it mounts." },
      { name: "caret", type: "boolean", fallback: "true", note: "A softly blinking caret in the egg the next digit goes into." },
      { name: "onSuccess", type: "(value) => void", note: "Fired once a full code has passed." },
    ],
    files: [
      { name: "OtpInput.tsx", lang: "tsx" },
      { name: "otp-input.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "Digits rise into the even eggs and drop into the odd ones, blurring in as they land, and the egg you are on is outlined. One invisible input owns the keyboard, so paste, backspace and the phone's one-time-code autofill all just work; the eggs only draw what it holds.",
        "A right code turns the row green and makes it hop, egg by egg. A wrong one is refused with a heavy shake. Then the crack draws itself down each shell, the shells quiver as it widens, hinge open along it, and break away along crossing diagonals before gravity takes them — and the row comes back together, empty, ready for another try. Pass verify to check the code against your own server.",
      ],
    },
    origin: { label: "Egg OTP" },
  },
  {
    slug: "add-member",
    category: "lists",
    name: "Add Member",
    tagline: "Pick people for a project, and watch their faces fly into the stack.",
    blurb:
      "The header springs the list open. Each row's toggle fills with a gooey drop that turns its plus into a minus, and the face flies from the row into the stack above Add to Project. Every sequence writes its end state down once it has had its time, so a background tab can never leave the card half-open.",
    highlights: ["Gooey plus-to-minus", "Faces fly to the stack", "Paged list", "Light and dark"],
    clip: "/clips/loop/add-member.mp4",
    poster: "/clips/loop/add-member.jpg",
    sound: false,
    zoom: 1.2,
    stage: "#f1f1f1",
    stageDark: "#08080a",
    usage: `import AddMember from "@/components/library/AddMember";

<AddMember corner={20} rows={4} theme="light" onAdd={(names) => invite(names)} />`,
    props: [
      { name: "corner", type: "number", fallback: "20", note: "Card radius, clamped to 0–40px. The blue shell adds 12 to it." },
      { name: "rows", type: "2 | 3 | 4", fallback: "4", note: "People per page. The pager turns the rest." },
      { name: "theme", type: "\"light\" | \"dark\"", fallback: "\"light\"", note: "The card and its type invert; the blue shell stays blue." },
      { name: "open", type: "boolean", fallback: "false", note: "Start expanded rather than as a single header." },
      { name: "members", type: "Member[]", fallback: "eight people", note: "Name, role, portrait, status and an optional ring." },
      { name: "onAdd", type: "(names) => void", note: "Fired with the chosen names when Add to Project is pressed." },
    ],
    files: [
      { name: "AddMember.tsx", lang: "tsx" },
      { name: "add-member.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "Shut, the card is a single header. Press it and the list springs open, its rows sliding in one after another. The toggle on each row is drawn through an SVG goo filter: choosing someone floods it with a drop that splits and merges back as the plus folds into a minus, and their face lifts off the row and arcs into the stack of chosen people.",
        "Add to Project confirms the lot — the stack hops, the button turns green with a tick and the count of people added — and then every row springs back to a plus and the bar folds away. The arrows and View All Members turn the list a page at a time, from the side you turned toward.",
      ],
    },
    origin: { label: "Add member" },
  },
  {
    slug: "session-list",
    category: "lists",
    name: "Count down",
    tagline: "A session broken into blocks, counting down in real time.",
    blurb:
      "One number drives the whole card. The live block, the time left on it, the playhead and every block's state are read back out of the seconds elapsed, so they cannot disagree — the clock lands on 00:00 on the same tick the playhead reaches the end of its block, and that is what hands over to the next one.",
    highlights: ["Real time by default", "Blocks scaled to length", "Keyboard driven", "Survives a background tab"],
    clip: "/clips/loop/session-list.mp4",
    poster: "/clips/loop/session-list.jpg",
    sound: false,
    zoom: 1.3,
    stage: "#2d8cff",
    usage: `import SessionList from "@/components/library/SessionList";

<SessionList corner={32} rows={4} />`,
    props: [
      { name: "corner", type: "number", fallback: "40", note: "Card radius, clamped to 0–40px. The blocks take 30% of it." },
      { name: "rows", type: "2 | 3 | 4", fallback: "4", note: "How many blocks of the plan are listed. The string form, rows=\"4\", works too." },
      { name: "plan", type: "SessionBlock[]", fallback: "four blocks", note: "Your own session. Each block is as wide on the track as it is long." },
      { name: "speedControl", type: "boolean", fallback: "true", note: "The fast-forward buttons under the card." },
      { name: "onBlockChange", type: "(i, block) => void", note: "Fired when one block hands over to the next." },
    ],
    files: [
      { name: "SessionList.tsx", lang: "tsx" },
      { name: "session-list.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "A session is a run of blocks, and the card counts down through them. Each block is drawn as wide on the track as it is long, so the row reads as a timeline rather than as four tabs — Preparation takes the most room because it takes the most time.",
        "One number drives all of it. The live block, the time left on it, the playhead and every block's state are read back out of the seconds elapsed, so they cannot disagree: the clock lands on 00:00 on the same tick the playhead reaches the end of its block, and that is what hands over to the next one. Hover a block to peek at it without disturbing the session, click one to replay from there, or press the check to finish the live block early. Space pauses, the arrow keys step.",
        "The clock runs in real time by default, so the countdown never skips a number; the speed control fast-forwards the same model without lying about the time.",
      ],
    },
    origin: { label: "Progress" },
  },
  {
    slug: "balance-card",
    category: "cards",
    name: "Balance Card",
    tagline: "A counting balance, a liquid currency selector and a drawer that settles.",
    blurb:
      "The balance is held once, in USD. The figure on screen, the preset amounts and the toast are all derived from it through the current rate, so a currency swap can never leave two numbers disagreeing about what the account holds. The selector's blobs are two pills blurred into one by an SVG filter: the head snaps to the row and the tail trails after it.",
    highlights: ["Gooey selection list", "Counter that never skips", "Synthesised cues", "Pointer-tracked glow"],
    clip: "/clips/loop/balance-card.mp4",
    poster: "/clips/loop/balance-card.jpg",
    sound: true,
    zoom: 1.25,
    stage: "#232323",
    usage: `import BalanceCard from "@/components/library/BalanceCard";

<BalanceCard balance={3400089.23} currency="USD" />`,
    props: [
      { name: "balance", type: "number", fallback: "3400089.23", note: "Opening balance, always held in USD whatever is on display." },
      { name: "currency", type: "\"USD\" | \"EUR\" | \"GBP\" | \"INR\"", fallback: "\"USD\"", note: "Which currency the card opens on." },
      { name: "presets", type: "number[]", fallback: "[500, 1000, 5000, 25000]", note: "The four quick amounts, in USD." },
      { name: "sound", type: "boolean", fallback: "true", note: "Deposit and withdraw cues, synthesised at play time." },
      { name: "credit", type: "boolean", fallback: "true", note: "The credit line under the card, with the control that mutes the cues." },
      { name: "onSettle", type: "(change) => void", note: "Fired once a deposit or withdrawal has landed." },
    ],
    files: [
      { name: "BalanceCard.tsx", lang: "tsx" },
      { name: "balance-card.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "The balance is held once, in USD. The figure on screen, the four preset amounts and the toast are all derived from it through the current rate, so switching currency can never leave two numbers disagreeing about what the account holds.",
        "The currency list is the part worth stealing. Two white pills sit under the rows and are blurred into a single shape by an SVG filter; the head snaps to the row under the cursor while the tail lags behind, so the two stretch apart and pull back together like something liquid. Deposit and withdraw open the same drawer, and every cue — the till, the coins, the tick — is synthesised at play time, so the component ships no audio and fetches nothing.",
      ],
      pin: "https://in.pinterest.com/pin/1056657131344579045/",
    },
    origin: { label: "Balance-Card", href: "https://github.com/Rachit315/Balance-Card" },
  },
  {
    slug: "cart-card",
    category: "cards",
    name: "Add To Cart",
    tagline: "A product card that is only a photo until you open it.",
    blurb:
      "Both growing regions are measured at their natural height and then sprung to it, so neither can be outgrown by its own content. The knob's transform is owned by the drag rather than by a spring, so the pointer is tracked exactly and nothing ever fights over the same property.",
    highlights: ["Measured, not hard-coded", "Drag, or arrow keys", "Gooey heart burst", "A cue for every beat"],
    clip: "/clips/loop/cart-card.mp4",
    poster: "/clips/loop/cart-card.jpg",
    sound: true,
    zoom: 1,
    stage: "#ececec",
    usage: `import CartCard from "@/components/library/CartCard";

<CartCard title="Air Force 1 Low Supr…" brand="Nike" price={59} />`,
    props: [
      { name: "title", type: "string", fallback: "\"Air Force 1 Low Supr…\"", note: "Clipped to one line, so anything fits." },
      { name: "brand", type: "string", fallback: "\"Nike\"", note: "The line under the title." },
      { name: "price", type: "number", fallback: "59", note: "Unit price. The figure rolls to price × quantity." },
      { name: "image", type: "string", fallback: "\"/library/shoe.jpg\"", note: "Multiplied onto the tile, so a white backdrop melts away." },
      { name: "sound", type: "boolean", fallback: "true", note: "A synthesised cue for every interaction." },
      { name: "onConfirm", type: "(order) => void", note: "Fired once the slider is taken all the way across." },
    ],
    files: [
      { name: "CartCard.tsx", lang: "tsx" },
      { name: "cart-card.css", lang: "css" },
    ],
    info: {
      paragraphs: [
        "Shut, the card is only a photograph. Click the tile and the detail opens out of it: title, price, the bag, and a track you drag to confirm. Both growing regions are measured at their natural height and then sprung to it, so neither can ever be outgrown by its own content.",
        "The knob's transform belongs to the drag rather than to a spring, so the pointer is tracked exactly and nothing fights over the same property — and if dragging is not for you, the track takes Enter and the arrow keys. Take it past nine tenths and the order lands: the card drops back to its small shape and the confirmation arrives underneath it.",
      ],
    },
    origin: { label: "Cart" },
  },
];


export const bySlug = (slug: string) => LIBRARY.find((entry) => entry.slug === slug);

/** The library sorted onto its shelves, empty shelves left out. */
export function byCategory() {
  return CATEGORIES.map((category) => ({
    ...category,
    entries: LIBRARY.filter((entry) => entry.category === category.id),
  })).filter((group) => group.entries.length > 0);
}
