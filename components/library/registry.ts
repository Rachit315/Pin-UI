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
  /**
   * Who made it, shown as a small colour-cycling dot after the name — in the
   * sidebar and on the shelf — with a tooltip that links to their X profile.
   */
  creator?: { handle: string; url: string };
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
    slug: "chips",
    name: "Chips",
    isNew: true,
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
    name: "Egg OTP",
    isNew: true,
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
    name: "Add Member",
    isNew: true,
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
