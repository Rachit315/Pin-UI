/**
 * The written half of a block's page: when to reach for it, how to use it,
 * its props, and how it behaves for keyboards, motion and small screens.
 *
 * Kept apart from `lib/blocks.ts` so the index the shelf reads stays small.
 * What can be read off the block itself — its files, the packages it imports,
 * the assets it ships — is not written down here; the page works those out
 * from the source at build time, so they cannot drift from the code.
 */

export type BlockProp = {
  name: string;
  type: string;
  fallback?: string;
  note: string;
};

export type BlockDocs = {
  /** The name it is imported under in the usage example. */
  component: string;
  /** The file the component lives in, without its extension. */
  file: string;
  use: string[];
  avoid: string[];
  /** The body of the usage example: what goes inside the page's return. */
  usage: string;
  props: BlockProp[];
  /** Where the copy and data live when the block takes no props for them. */
  customize?: string;
  accessibility: string[];
  motion: string[];
  responsive: string[];
};

export const BLOCK_DOCS: Record<string, BlockDocs> = {
  "storybook-hero": {
    component: "StorybookHero",
    file: "StorybookHero",
    use: [
      "A landing page for a creative, writing or note-taking product that wants to feel warm and handmade",
      "A single-screen hero with one illustration at its centre rather than a product shot",
    ],
    avoid: [
      "Dark sites — the parchment, the grain and the brown ink are drawn for a light page",
      "Products that need a screenshot above the fold; the arch is the only picture here",
    ],
    usage: "<StorybookHero />",
    props: [],
    customize:
      "The links are NAV_LINKS and the headline is HEADLINE (a list of lines, each a list of words) at the top of StorybookHero.tsx; the palette is the custom properties on .sbh in storybook-hero.css. The arch and the logo are served from /blocx/storybook-hero/ — swap the files to change them, and move STARS if your artwork's stars sit elsewhere.",
    accessibility: [
      "The section is labelled by its headline, which keeps its full sentence while its words animate",
      "The nav is a labelled list; on a phone the menu button reports aria-expanded and controls the sheet, which is inert while closed",
      "Escape or a press outside closes the sheet; the illustration and its glows are decorative and hidden from screen readers",
    ],
    motion: [
      "The nav drops in, the headline rises a word at a time out of its mask, and the copy and buttons un-blur after it",
      "The arch lifts into place and floats; the sky breathes, the windows flicker and the stars twinkle, each on its own timing",
      "Everything is CSS animation; reduced motion holds the page still and hides the stars",
    ],
    responsive: [
      "One screen tall: the headline and buttons keep their place and the arch takes the height that is left",
      "Below 820px the links fold into a sheet; below 520px the nav's button goes and the two buttons share the width",
    ],
  },

  "partylabs-hero": {
    component: "PartylabsHero",
    file: "PartylabsHero",
    use: [
      "A launch or landing page for a venue, events or experiences product, where the photos sell the mood",
      "A single-screen hero that has to read as a place, not a feature list",
    ],
    avoid: [
      "Pages that scroll straight into dense content — the field is built to own the first screen",
      "A product with no photography of its own; stock party shots will read as generic",
    ],
    usage: "<PartylabsHero />",
    props: [],
    customize:
      "The copy, nav links and search suggestions are written in the component; the photo layouts are the LAYOUTS table at the top of PartylabsHero.tsx — [x%, y%, depth, rotation, portrait] per card — and the photos are the PHOTOS list beneath it.",
    accessibility: [
      "The photo field is aria-hidden; the headline keeps its full sentence as an aria-label while its words animate",
      "The search has a real label, \"/\" focuses it, and the cycling suggestion is hidden from screen readers",
      "On a phone the menu button reports aria-expanded, and Escape or a press outside closes the sheet",
    ],
    motion: [
      "The photos fly outward from the headline into place, nearest first, then drift on their own slow loops",
      "Pointer parallax moves each photo by its depth — near ones travel furthest — on one shared rAF loop",
      "Reduced motion keeps the field still: no fly-in, no drift, no parallax, no cycling suggestions",
    ],
    responsive: [
      "Three hand-placed layouts — desktop, tablet (or any portrait window) and phone — rather than one scaled down",
      "Card size follows the window's width and height, so the field always fills one viewport",
      "Below 768px the nav folds into a sheet with the search inside it",
    ],
  },

  "luna-hero": {
    component: "LunaHero",
    file: "LunaHero",
    use: [
      "A storefront or catalogue home where the navigation itself is part of the pitch",
      "Products with categories worth browsing straight from the hero, through the mega menu",
    ],
    avoid: [
      "Single-product pages — the category menu and catalog search have nothing to hold",
      "Projects that cannot take Base UI and Phosphor as dependencies",
    ],
    usage: `<LunaHero
  theme="system"
  links={{ store: "/shop", signIn: "/login" }}
/>`,
    props: [
      { name: "theme", type: '"light" | "dark" | "system"', fallback: '"system"', note: "System follows prefers-color-scheme; the explicit themes cover the popups too" },
      { name: "links", type: "Partial<LUNA_LINKS>", note: "Where the nav, the calls to action and the menu's footer point" },
      { name: "categories", type: "LunaCategory[]", fallback: "sample catalog", note: "The two-column category menu" },
      { name: "navLinks", type: "LunaLink[]", fallback: "sample links", note: "The floating navbar's links" },
      { name: "products", type: "LunaProduct[]", fallback: "sample products", note: "What the catalog search looks through" },
      { name: "className", type: "string", note: "Extra class on the hero's root" },
    ],
    accessibility: [
      "The menu, search and mobile navigation are Base UI popovers and dialogs: focus is trapped, restored and labelled",
      "⌘K / Ctrl+K opens the search, announced through aria-keyshortcuts",
      "The pixel backdrop is aria-hidden; the hero is labelled by its own headline",
    ],
    motion: [
      "The backdrop arrives as one layer, then the headline, copy and actions rise in reading order",
      "Reduced motion skips the entrance and shows everything in place",
    ],
    responsive: [
      "The navbar collapses into a full menu dialog on small screens",
      "The stepped pixel backdrop re-steps to the width instead of scaling",
    ],
  },

  "orbit-hero": {
    component: "OrbitHero",
    file: "OrbitHero",
    use: [
      "Space, travel, climate or data products where a live globe earns its weight",
      "A launch page that can afford a WebGL scene for its first impression",
    ],
    avoid: [
      "Pages that must be light on low-end phones — the Earth is a live WebGL render",
      "Light-themed sites; the block is built for a dark sky",
    ],
    usage: "<OrbitHero />",
    props: [],
    customize:
      "The headline, nav links and button label are written in OrbitHero.tsx; the Earth's textures are the images in /blocx/orbit-hero, loaded by orbit-globe.ts.",
    accessibility: [
      "The globe is aria-hidden; the section is labelled by its headline",
      "The bracket nav marks the current link with aria-current, and the mobile menu reports aria-expanded",
      "Escape closes the mobile menu",
    ],
    motion: [
      "The headline blurs in word by word while the Earth turns slowly at the bottom edge",
      "The bracket marks glide between nav links on one shared spring",
    ],
    responsive: [
      "The bracket nav becomes a menu button and sheet on small screens",
      "The globe is sized to the viewport so it always crests the bottom edge",
    ],
  },

  "odometer-pricing": {
    component: "OdometerPricing",
    file: "OdometerPricing",
    use: [
      "A SaaS pricing section with monthly and annual billing",
      "Three plans where one is the clear recommendation",
    ],
    avoid: [
      "More than three plans, or plans that need a feature-comparison table",
      "Usage-based pricing where a fixed monthly figure would mislead",
    ],
    usage: "<OdometerPricing />",
    props: [],
    customize: "The plans, prices and features are the PLANS list at the top of OdometerPricing.tsx; annual is quoted 20% off.",
    accessibility: [
      "The billing switch is a radio group; each price reads as one phrase — \"$99 per month, billed yearly\" — while its digits roll",
      "On phones the plan dots are tabs with labels, and the popular plan opens first",
      "The grain and light trail are decorative and aria-hidden",
    ],
    motion: [
      "Switching billing rolls every price like an odometer, digit by digit",
      "A short, faint light trail follows a mouse across the popular plan — fine pointers only",
      "Reduced motion swaps prices without rolling and turns the trail off",
    ],
    responsive: [
      "Everything is sized from one unit so the stage fits the viewport height",
      "Below 1024px in portrait the plans become a swipeable row that opens on the popular one",
    ],
  },

  "smart-pricing": {
    component: "SmartPricing",
    file: "SmartPricing",
    use: [
      "A pricing section for a finance or B2B product with three tiers",
      "Pages that want a bright, confident pricing block rather than a quiet table",
    ],
    avoid: [
      "Dark pages — the lime cards are drawn for a white page",
      "Plans whose features differ too much to read as three parallel lists",
    ],
    usage: "<SmartPricing />",
    props: [],
    customize: "The plans, prices, features and shapes are the PLANS list at the top of SmartPricing.tsx; yearly is quoted 20% off per month.",
    accessibility: [
      "Monthly and Yearly are buttons with aria-pressed, and the switch between them is a real switch",
      "Each price is announced politely when the billing changes",
      "The corner shapes are decorative images with empty alt text",
    ],
    motion: [
      "The cards rise in on a stagger; the switch's knob moves on a spring and every price rolls to its new figure",
      "Select Plan rolls its label over with an arrow as a deeper green fills it — the cards themselves stay still",
      "Reduced motion keeps the swaps and drops the movement",
    ],
    responsive: [
      "Three across on desktop, sharing the row below 1240px",
      "A single centred column below 900px, with the headline allowed to wrap",
    ],
  },

  "contact-form": {
    component: "ContactForm",
    file: "ContactForm",
    use: [
      "A portfolio or studio contact section with a strong editorial look",
      "Short enquiries: an email, an optional number and a message",
    ],
    avoid: [
      "Forms with many fields or file uploads — the tiles are sized for three",
      "Pages that need the form below the fold; the block is drawn to fill one viewport",
    ],
    usage: `<ContactForm
  onSubmit={async (values) => {
    await fetch("/api/contact", { method: "POST", body: JSON.stringify(values) });
  }}
/>`,
    props: [
      { name: "onSubmit", type: "(values) => Promise<void> | void", note: "Called with { email, contact, message } once they validate; left out, the demo waits a moment and says thanks" },
    ],
    accessibility: [
      "Every field has a real label; errors are tied to their field with aria-describedby and aria-invalid",
      "A failed submit moves focus to the first field that needs fixing",
      "The sending and sent states are announced through a polite live region",
    ],
    motion: [
      "The guides draw themselves across the page, the headline rises word by word, the photo reveals upward and the tiles follow",
      "Wrong fields shake; the button fills white with its label rolling over, shows bouncing dots while sending and draws a check when done",
      "Reduced motion keeps every state change and drops the movement",
    ],
    responsive: [
      "The frame is drawn in its own units and scaled to fit both the window's width and height, so it always sits in one viewport",
      "Portrait tablets get a tighter frame; below 760px it stacks photo over form and scrolls",
    ],
  },

  "caremetric-footer": {
    component: "CaremetricFooter",
    file: "CaremetricFooter",
    use: [
      "A healthcare, wellness or calm B2B site that wants its brand to close the page",
      "Footers with up to four short columns of links",
    ],
    avoid: [
      "Sites that need a newsletter or legal-heavy footer — there is room for neither",
      "Brands without a mark that survives being set huge",
    ],
    usage: "<CaremetricFooter />",
    props: [],
    customize: "The link columns are the COLUMNS list at the top of CaremetricFooter.tsx; the mark's paths are in caremetric-mark.ts.",
    accessibility: [
      "The footer is labelled, and its columns sit in a labelled nav with real headings",
      "The giant mark is aria-hidden; the logo link carries the brand's name",
    ],
    motion: [
      "The panel rises into place, the columns fade in on a stagger and the mark pops in shape by shape",
    ],
    responsive: [
      "Figma's coordinates hold on desktop; below 1200px it becomes a flowing layout",
      "On a phone the links fold into two columns",
    ],
  },

  "synais-footer": {
    component: "SynaisFooter",
    file: "SynaisFooter",
    use: [
      "A finance or SaaS footer that needs a newsletter, socials and four link columns",
      "Dark sites that want the brand name to be the last thing on the page",
    ],
    avoid: [
      "Light pages — the cream wordmark is drawn for near-black",
      "Brand names much longer than six letters; the wordmark is sized to fill the width",
    ],
    usage: `<SynaisFooter
  onSubscribe={async (email) => {
    await fetch("/api/subscribe", { method: "POST", body: JSON.stringify({ email }) });
  }}
/>`,
    props: [
      { name: "onSubscribe", type: "(email) => Promise<void> | void", note: "Called with a valid address; left out, the demo waits a moment and says thanks" },
    ],
    accessibility: [
      "The newsletter field is labelled; its note doubles as a polite live region for errors and the thank-you",
      "Columns sit in a labelled nav with real headings; social links carry their network's name",
      "The wordmark is aria-hidden — the logo link already names the brand",
    ],
    motion: [
      "The brand, newsletter and columns fade in on a stagger; the wordmark rises a letter at a time",
      "The submit arrow spins while sending and turns into a check",
    ],
    responsive: [
      "Four columns on desktop, two on a tablet",
      "Below 720px the newsletter drops under the brand and the fine print stacks",
    ],
  },

  "halo-sign-in": {
    component: "HaloSignIn",
    file: "HaloSignIn",
    use: [
      "A sign-in page for a consumer app — rentals, bookings, a marketplace — that wants to feel soft and trustworthy",
      "Email and password sign-in with three social providers alongside",
    ],
    avoid: [
      "Passwordless or magic-link flows — there is a password field and a show / hide toggle built in",
      "Dark sites; the tray, wells and shadows are drawn for white",
    ],
    usage: `<HaloSignIn
  onSubmit={async ({ email, password }) => {
    await signIn(email, password);
  }}
  onProvider={(provider) => signInWith(provider)}
/>`,
    props: [
      { name: "onSubmit", type: "({ email, password }) => Promise<void> | void", note: "Called with the form once the browser has validated it; throw to put the button back. Left out, the demo waits a moment and says welcome back" },
      { name: "onProvider", type: "(\"google\" | \"facebook\" | \"apple\") => void", note: "Called when a social button is pressed" },
    ],
    customize: "The title, the line under it and the sign-up link are written in HaloSignIn.tsx; the mark is the small house SVG in Halo().",
    accessibility: [
      "The section is labelled by its title; both fields have real labels, visually hidden, and the browser validates them",
      "The show / hide toggle names what it will do and reports aria-pressed",
      "The social buttons are named by their providers, and the submit button's label is a polite live region as it changes",
    ],
    motion: [
      "The tray rises in, the dot field unwinds into place and keeps turning slowly, and the mark springs in and draws its house",
      "Each row rises and un-blurs on a stagger; the button rolls its label through Signing in… and Welcome back",
      "Reduced motion drops the travel and keeps the fades",
    ],
    responsive: [
      "A 392px card centred in the window; below 400px its padding and title come in",
      "On a window shorter than 640px the halo and the gaps tighten so the card still fits without scrolling",
    ],
  },

  "pixelkit-sign-in": {
    component: "PixelkitSignIn",
    file: "PixelkitSignIn",
    use: [
      "Passwordless sign-in: providers first, then a magic link by email",
      "A product with a strong app icon that can carry the page on its own",
    ],
    avoid: [
      "Flows that need a password field — there is none",
      "Dark sites; it is drawn for white",
    ],
    usage: `<PixelkitSignIn
  onSubmit={async (email) => {
    await sendMagicLink(email);
  }}
  onProvider={(provider) => signInWith(provider)}
/>`,
    props: [
      { name: "onSubmit", type: "(email) => Promise<void> | void", note: "Called with a valid address; throw to put the button back. Left out, the demo waits a moment and says to check the inbox" },
      { name: "onProvider", type: "(\"google\" | \"github\" | \"apple\") => void", note: "Called when a provider button is pressed" },
    ],
    customize: "The brand name, the copy and the terms links are written in PixelkitSignIn.tsx; the tile's colour is --pksi-lime and the mark is the four rects in Logo().",
    accessibility: [
      "The section is labelled by its title; the email field has a real label, visually hidden, and the browser validates it",
      "The tile's mark is an image named Pixelkit; the \"or\" rule is hidden from screen readers",
      "The submit button's label is a polite live region as it changes",
    ],
    motion: [
      "The tile drops in on a spring and its four pixels pop in one after another, the rounded last one with a little overshoot",
      "Each row rises and un-blurs on a stagger; the button rolls its label through Sending link… and Check your inbox",
      "Reduced motion drops the travel and keeps the fades",
    ],
    responsive: [
      "One 340px column centred in the window; the three providers share its width on any phone",
      "On a window shorter than 640px the tile shrinks and the gaps tighten so it still fits",
    ],
  },
};
