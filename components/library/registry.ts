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
   */
  clip: string;
  /** The loop's first frame as a still, so a card is never blank while it loads. */
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
  /** The import used on the page and in the copy button. */
  usage: string;
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
  };
};

export const LIBRARY: Entry[] = [
  {
    slug: "session-list",
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
