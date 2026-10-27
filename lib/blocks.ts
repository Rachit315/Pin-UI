/**
 * Blocx — Pin UI's library of whole page sections.
 *
 * Where the components are single pieces, a block is a section you drop into a
 * page: a hero, a pricing table, a footer. Each one previews live inside a
 * frame you can switch between desktop, tablet and phone widths, and its
 * source sits on the Code tab beside it.
 *
 * Every block lives in components/blocks/demo as a component and its own
 * stylesheet, every class prefixed so a block can sit on any page without its
 * styles reaching anything else. Adding one is an entry here, its component in
 * the preview's list, and its picture in public/blocx/thumbs.
 *
 * Blocks held back from the shelf live in a local, untracked vault and are
 * moved in and out of the two marked places with its script.
 */

/** Every kind of section a block can be, in the order the sidebar lists them. */
export const BLOCK_CATEGORIES = [
  { id: "hero", name: "Hero Section", shelf: "Hero Section" },
  { id: "features", name: "Features", shelf: "Features Section" },
  { id: "contact", name: "Contact", shelf: "Contact Section" },
  { id: "footer", name: "Footer", shelf: "Footer Section" },
  { id: "comparison", name: "Comparison", shelf: "Comparison Section" },
  { id: "navigation", name: "Navigation", shelf: "Navigation" },
  { id: "auth", name: "Auth", shelf: "Auth" },
  { id: "cta", name: "Call To Action", shelf: "Call To Action" },
  { id: "faq", name: "FAQ", shelf: "FAQ Section" },
  { id: "pricing", name: "Pricing", shelf: "Pricing Section" },
  { id: "stats", name: "Stats", shelf: "Stats Section" },
  { id: "not-found", name: "404", shelf: "404 Pages" },
  { id: "profile", name: "Profile", shelf: "Profile" },
  { id: "about", name: "About", shelf: "About Section" },
  { id: "waitlist", name: "Waitlist", shelf: "Waitlist" },
  { id: "showcase", name: "Showcase", shelf: "Showcase" },
  { id: "how-it-works", name: "How It Works", shelf: "How It Works" },
  { id: "testimonials", name: "Testimonials", shelf: "Testimonial Section" },
] as const;

export type BlockCategoryId = (typeof BLOCK_CATEGORIES)[number]["id"];

export type Block = {
  slug: string;
  name: string;
  category: BlockCategoryId;
  /** The card's picture on the shelf: the block itself, captured at a desktop width. */
  thumb: string;
  /** The block's source, as it sits in components/blocks/demo — shown on the Code tab, main file first. */
  files: string[];
  /** One line for the shelf card, under the name. */
  summary: string;
  /** Wears a "New" tag on the shelf — the latest blocks to arrive. */
  isNew?: boolean;
  /** A few lines for the info panel. */
  note: string;
  stack: string;
  /** The block's own background, so the frame never flashes white while it loads. */
  canvas: string;
  /**
   * The Pinterest pin it was drawn from, linked as "Inspiration" in the info
   * panel. Left out, the panel points at the board every Pin UI piece was
   * found on, the way a component without a recorded pin does.
   */
  pin?: string;
};

export const BLOCKS: Block[] = [
  {
    slug: "storybook-hero",
    name: "Storybook Hero",
    category: "hero",
    thumb: "/blocx/thumbs/storybook-hero.webp",
    files: ["StorybookHero.tsx", "storybook-hero.css"],
    summary: "A parchment hero with a glowing cottage in an arch.",
    isNew: true,
    note: "A warm parchment hero under a film of paper grain: a small nav with a pill call to action, \"Turn Your Ideas Into Something Magical\" rising a word at a time out of its own mask, and an engraved arch at the foot of the screen with a cottage under a crescent moon. The arch lifts in and floats, the sky behind the moon breathes, the windows flicker like lamplight and the stars twinkle on their own clocks. The primary buttons sweep a band of light on hover and the outlined one fills from the bottom; below 820px the links fold into a sheet. Set in Inter Tight as a free stand-in for the design's Neue Montreal.",
    stack: "Next.js · React · CSS",
    canvas: "#eae1d3",
  },
  {
    slug: "partylabs-hero",
    name: "iPartyLabs Hero",
    category: "hero",
    thumb: "/blocx/thumbs/partylabs-hero.webp",
    files: ["PartylabsHero.tsx", "partylabs-hero.css"],
    summary: "A headline floating in a field of party photos.",
    isNew: true,
    note: "A glass nav with a search pill, a centred thesis and about thirty photos hand-placed at five depths around it. Depth sets each photo's size, blur, saturation, shadow and parallax, so the field reads as space; the photos fly out from the headline into place and keep drifting. The search cycles suggestions and \"/\" focuses it; on a phone the nav folds into a sheet. Photos are Unsplash.",
    stack: "Next.js · React · CSS · Motion",
    canvas: "#f7f5f1",
  },
  {
    slug: "luna-hero",
    name: "Luna Hero",
    category: "hero",
    thumb: "/blocx/thumbs/luna-hero.webp",
    files: ["LunaHero.tsx", "LunaNavbar.tsx", "luna-catalog.ts", "luna-hero.css"],
    summary: "Pixel storefront hero with a floating mega menu.",
    note: "A digital storefront hero with a stepped pixel backdrop, a floating navbar, a two-column category menu and featured card, searchable catalog and mobile navigation. Light, dark and system themes; configurable routes and sample catalog data. Install @base-ui/react and @phosphor-icons/react alongside Motion. The placeholder brand mark is from Logoipsum under its own license.",
    stack: "Next.js · React · CSS · Motion · Base UI · Phosphor",
    canvas: "#ffffff",
  },
  {
    slug: "orbit-hero",
    name: "Orbit Hero",
    category: "hero",
    thumb: "/blocx/thumbs/orbit-hero.webp",
    files: ["OrbitHero.tsx", "orbit-hero.css", "orbit-globe.ts"],
    summary: "Space hero with a live, turning WebGL Earth.",
    note: "A space hero: a bracket nav, a headline that blurs in word by word, a glowing Enter Orbit button and a live WebGL Earth turning at the bottom edge.",
    stack: "React · CSS · Motion · WebGL",
    canvas: "#121317",
  },
  {
    slug: "odometer-pricing",
    name: "Odometer Pricing",
    category: "pricing",
    thumb: "/blocx/thumbs/odometer-pricing.webp",
    files: ["OdometerPricing.tsx", "odometer-pricing.css"],
    summary: "Prices roll like an odometer on billing.",
    note: "Three plans with a billing switch: prices roll like an odometer, the popular plan glows with grain and a light trail follows the cursor; a swipeable row on phones.",
    stack: "React · CSS · Motion",
    canvas: "#ffffff",
  },
  {
    slug: "caremetric-footer",
    name: "CareMetric Footer",
    category: "footer",
    thumb: "/blocx/thumbs/caremetric-footer.webp",
    files: ["CaremetricFooter.tsx", "caremetric-footer.css", "caremetric-mark.ts"],
    summary: "Green link columns over a giant, bleeding mark.",
    note: "A soft green panel with four columns of links and a giant CareMetric mark that pops in and bleeds off the bottom edge.",
    stack: "React · CSS · Motion",
    canvas: "#ffffff",
  },
  {
    slug: "smart-pricing",
    name: "Smart Pricing",
    category: "pricing",
    thumb: "/blocx/thumbs/smart-pricing.webp",
    files: ["SmartPricing.tsx", "smart-pricing.css"],
    summary: "Lime plans with a yearly switch and rolling prices.",
    isNew: true,
    note: "Three lime plans, each with its own dark-green shape in the corner, under a two-line Bricolage headline. The monthly / yearly switch springs its knob across and rolls every price to its yearly figure (20% off); the cards rise in on a stagger and lift on hover. Three across on desktop, one centred column on a phone.",
    stack: "Next.js · React · CSS · Motion",
    canvas: "#ffffff",
  },
  {
    slug: "contact-form",
    name: "Contact Form",
    category: "contact",
    thumb: "/blocx/thumbs/contact-form.webp",
    files: ["ContactForm.tsx", "contact-form.css"],
    summary: "Black tiles, a reaching hand and a real form.",
    isNew: true,
    note: "A \"Wanna Work With Me…\" block on dashed guides: a greyscale hand reaching in beside Email, Contact and Message tiles and a big Contact Me button marked at its corners. The fields validate, the button shows that it is sending and turns to a thank-you; pass onSubmit to send it anywhere. Set in Inter Tight as a free stand-in for the design's Neue Montreal.",
    stack: "Next.js · React · CSS · Motion",
    canvas: "#ffffff",
  },
  {
    slug: "synais-footer",
    name: "Synais Footer",
    category: "footer",
    thumb: "/blocx/thumbs/synais-footer.webp",
    files: ["SynaisFooter.tsx", "synais-footer.css"],
    summary: "Dark link columns over a giant cream wordmark.",
    isNew: true,
    note: "A near-black finance footer: brand, socials and a working newsletter field, four columns of links and a fine-print row, with \"synais.\" set huge in cream, rising a letter at a time and bleeding off the bottom edge. Four columns on desktop, two on a tablet; pass onSubscribe to add the address to your list.",
    stack: "Next.js · React · CSS · Motion",
    canvas: "#0b0b0b",
  },
  {
    slug: "halo-sign-in",
    name: "Halo Sign In",
    category: "auth",
    thumb: "/blocx/thumbs/halo-sign-in.webp",
    files: ["HaloSignIn.tsx", "halo-sign-in.css"],
    summary: "A soft card in a tray, its mark in turning dots.",
    isNew: true,
    note: "A white sign-in card in a pale tray: an app mark in a slowly turning field of dots, email and password with a show / hide toggle, a black Sign In button and Google, Facebook and Apple under a dashed rule, with the sign-up line on the tray's lip. The mark springs in and draws its house; the rows rise and un-blur on a stagger, and the button rolls to \"Signing in…\" and \"Welcome back\". Pass onSubmit to wire it to your own auth.",
    stack: "Next.js · React · CSS · Motion",
    canvas: "#ffffff",
  },
  {
    slug: "pixelkit-sign-in",
    name: "Pixelkit Sign In",
    category: "auth",
    thumb: "/blocx/thumbs/pixelkit-sign-in.webp",
    files: ["PixelkitSignIn.tsx", "pixelkit-sign-in.css"],
    summary: "A lime tile, three providers and a magic link.",
    isNew: true,
    note: "A quiet one-column sign-in with no card: a lime app tile whose four pixels pop in, Google, GitHub and Apple side by side, an \"or\" rule, and an email field with a black Continue button for a magic link, then the terms. The rows rise and un-blur on a stagger, and the button rolls to \"Sending link…\" and \"Check your inbox\". Pass onSubmit to send the link.",
    stack: "Next.js · React · CSS · Motion",
    canvas: "#ffffff",
  },
  /*
   * Waiting on their component files and thumbnails (QuantroHero.tsx, quantro-hero.css, quantro-mark.tsx;
   * ForahHero.tsx): parked so the build stays green. Uncomment once the files are in.
   *
   *   {
   *     slug: "quantro-hero",
   *     name: "Quantro Hero",
   *     category: "hero",
   *     thumb: "/blocx/thumbs/quantro-hero.webp",
   *     files: ["QuantroHero.tsx", "quantro-hero.css", "quantro-mark.tsx"],
   *     summary: "Finance hero with a phone standing in the grass.",
   *     isNew: true,
   *     note: "A finance hero under a deep-blue sky: a floating pill nav, a headline that rises in word by word, and a phone standing on drawn hills with a card wallet and a credit-score gauge that sweeps up to its number. Three stat cards float around it with pointer parallax. The sky, hills and grass are drawn with gradients and SVG, so there are no photographs to ship.",
   *     stack: "Next.js · React · CSS · Motion",
   *     canvas: "#0d57c4",
   *   },
   *   {
   *     slug: "forah-hero",
   *     name: "Fōrah Hero",
   *     category: "hero",
   *     thumb: "/blocx/thumbs/forah-hero.webp",
   *     files: ["ForahHero.tsx", "forah-hero.css"],
   *     summary: "Dark hero rising out of violet pixels.",
   *     isNew: true,
   *     note: "A sponsorship hero on a dark dot grid: a small centred nav, a headline with its 99% in violet, and two clusters growing up out of the bottom corners on one canvas — square pixels on the left, round dots on the right — that build in, twinkle and brighten around the pointer. Seeded, so it is the same picture every load; it pauses off screen and holds still for reduced motion.",
   *     stack: "React · CSS · Motion · Canvas",
   *     canvas: "#161618",
   *   },
   */
  /* blocks-vault: entries */
];

/** The shelves on the index, in the order the index shows them, empty ones left out. */
export const SHELF_ORDER: BlockCategoryId[] = ["hero", "pricing", "contact", "auth", "footer"];

export function blockBySlug(slug: string): Block | undefined {
  return BLOCKS.find((block) => block.slug === slug);
}

export function blocksIn(category: BlockCategoryId): Block[] {
  return BLOCKS.filter((block) => block.category === category);
}

export function categoryName(id: BlockCategoryId): string {
  return BLOCK_CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

export function shelfName(id: BlockCategoryId): string {
  return BLOCK_CATEGORIES.find((c) => c.id === id)?.shelf ?? id;
}
