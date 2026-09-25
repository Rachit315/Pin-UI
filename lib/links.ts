/**
 * Every address the site points at that is not part of the site.
 *
 * They were written out four times over — the masthead, the rail, the
 * component page's bar and the footer all carried their own copy of the
 * GitHub URL — which is how three of them ended up pointing at a profile
 * rather than at this project. One place, so changing one changes all.
 */
export const LINKS = {
  /** The repository this site is built from. */
  github: "https://github.com/Rachit315/Pin-UI",
  x: "https://x.com/RachitThakur146",
  /**
   * The board the components were found on.
   *
   * The full address rather than the `pin.it` short form of it — same
   * destination, but this one says where it goes when it is read aloud or
   * hovered. Used by the preview card, and by any component whose own pin was
   * never recorded; the ones that have a specific pin keep it, because a link
   * to the exact thing is worth more than a link to where it lives.
   */
  pinterest: "https://in.pinterest.com/rachitrampage23/pin-ui/",
  /** Where support mail goes: the footer's mail icon and its small print. */
  email: "pinui.official@gmail.com",

  /** All external profiles, used by Organization schema `sameAs`. */
  profiles: [
    "https://github.com/Rachit315/Pin-UI",
    "https://x.com/RachitThakur146",
    "https://in.pinterest.com/rachitrampage23/pin-ui/",
  ],
} as const;
