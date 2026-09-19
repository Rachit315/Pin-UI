/**
 * The pass, specified once.
 *
 * Both the on-screen ticket and the downloaded PNG are laid out from these
 * numbers. They used to be written twice — CSS for the screen, hand-placed
 * baselines for the canvas — which is exactly how the two drifted apart and the
 * download ended up aligned differently from what it was a picture of.
 *
 * Everything is given at the reference width below and scaled from there, so
 * one ratio drives every size: the screen scales by the ticket's rendered
 * width, the export by its own.
 */

/** The size everything else is quoted against. */
export const TICKET = {
  width: 540,
  height: 245,

  /** Where the perforation sits in the artwork, as a fraction of the width. */
  split: 0.38,

  /** The barcode block on the stub. */
  code: { width: 128, height: 155 },

  /** The printed column, right of the perforation. */
  body: { left: 28, right: 34 },

  lockup: { pinWidth: 17, pinHeight: 20, gap: 7, word: 19 },
  caption: 10,

  /**
   * The address.
   *
   * `oneLineMin` is the point below which a single line stops being worth it:
   * a long address squeezed onto one line gets smaller than the same address
   * broken after its `@`, and two readable lines beat one unreadable one.
   */
  email: { max: 24, min: 11, oneLineMin: 15, leading: 1.18 },

  /** The handle trails the address in size; it is the quieter of the two. */
  handle: { max: 16, below: 3 },

  /** Vertical rhythm down the printed column. */
  gaps: { lockupToCaption: 14, captionToEmail: 7, emailToHandle: 7 },
} as const;

/** The printed column's usable width at a given ticket width. */
export function bodyWidth(ticketWidth: number) {
  const scale = ticketWidth / TICKET.width;
  return (
    ticketWidth * (1 - TICKET.split) -
    (TICKET.body.left + TICKET.body.right) * scale
  );
}

let scratch: CanvasRenderingContext2D | null = null;

/** One offscreen context, reused — both callers measure through the same one. */
function measurer() {
  if (!scratch) {
    scratch = document.createElement("canvas").getContext("2d");
  }
  return scratch;
}

export type EmailLayout = { size: number; lines: string[] };

/**
 * Work out how to set an address inside `maxWidth`.
 *
 * One line is always preferred. If the address will not hold a readable size on
 * one line, it breaks after the `@` — the only seam an address actually has,
 * and the reason this is not left to the browser, which would happily break
 * `galgotiasuniversity` in half.
 *
 * Measured on a canvas rather than by growing and shrinking a DOM node: it is
 * deterministic, costs no layout, and is the identical code path the PNG uses,
 * so the two cannot disagree.
 */
export function layoutEmail(
  email: string,
  maxWidth: number,
  font: string,
  scale = 1,
): EmailLayout {
  const ctx = measurer();
  const max = TICKET.email.max * scale;
  const min = TICKET.email.min * scale;
  const oneLineMin = TICKET.email.oneLineMin * scale;

  if (!ctx) return { size: max, lines: [email] };

  const widthAt = (text: string, size: number) => {
    ctx.font = `500 ${size}px ${font}`;
    return ctx.measureText(text).width;
  };

  const largestThatFits = (parts: string[]) => {
    for (let size = max; size > min; size -= 0.5) {
      if (parts.every((part) => widthAt(part, size) <= maxWidth)) return size;
    }
    return min;
  };

  const one = largestThatFits([email]);
  if (one >= oneLineMin) return { size: one, lines: [email] };

  const at = email.indexOf("@");
  if (at > 0) {
    /* the @ stays with the name, so the second line reads as the domain */
    const parts = [email.slice(0, at + 1), email.slice(at + 1)];
    const two = largestThatFits(parts);
    if (two > one) return { size: two, lines: parts };
  }

  return { size: one, lines: [email] };
}

/** The handle's size, given whatever the address settled on. */
export function handleSize(emailSize: number, scale = 1) {
  return Math.max(
    10 * scale,
    Math.min(TICKET.handle.max * scale, emailSize - TICKET.handle.below * scale),
  );
}
