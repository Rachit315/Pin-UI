/**
 * What people said about Pin UI, word for word, from the replies on X.
 *
 * The photos are each person's own X avatar, saved into `public/testimonials`
 * rather than hotlinked: a profile picture URL on X changes whenever its owner
 * changes the picture, and a broken image in a row of faces is worse than a
 * slightly out-of-date one.
 */
export type Testimonial = {
  name: string;
  /** without the @ */
  handle: string;
  verified?: boolean;
  quote: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Jakob",
    handle: "DristJakob",
    quote:
      "Just want to say you’re doing amazing work with these components. Keep building. I genuinely think they’re going to get a lot of attention. Such a great contribution to the open-source community. Keep it up!",
  },
  {
    name: "App Launcher",
    handle: "AppLauncher_App",
    verified: true,
    quote:
      "clean component library with a polished footer is such a good sign. the details at the edges of a site are what separate pro tools from hobby projects",
  },
  { name: "KASUN", handle: "kasuncfdo", verified: true, quote: "Soo good UIs, crafted so premium 🔥" },
  { name: "OrcDev", handle: "orcdev", verified: true, quote: "looks amazing! well done!" },
  {
    name: "Chakravarthi Chintapatla",
    handle: "Chakravart64245",
    quote: "Looks sexy, might use it sometime in my website. keep em coming man <3",
  },
  { name: "Abdur Razzak", handle: "AbdurRazzaak", verified: true, quote: "you nailed it" },
  { name: "Saman Pandey", handle: "WarBornePhoenix", quote: "This is nuts!! Great work🔥" },
  { name: "Dhruv", handle: "dhruvtwt_", verified: true, quote: "🫂 pinui is so good" },
  { name: "Yeasin Arafat", handle: "UiuxYeasin", quote: "Fantastic project! Keep creating!" },
  { name: "Harsshh aka Chole bhature", handle: "Choley_Bhature", quote: "sooo sickkk damnnn" },
  { name: "Aniket Pawar", handle: "alaymanguy", verified: true, quote: "so fresh 🍓" },
  { name: "Dhruv Sahoo ☄️", handle: "10xdhruv", quote: "Really cool 😂😂" },
  { name: "LI Productions", handle: "LIProductions_", quote: "this looks very cool 🙂" },
];
