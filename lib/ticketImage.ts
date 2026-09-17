import {
  barcodePattern,
  barcodeUnits,
  PIN_BODY_PATHS,
  PIN_BOX,
  PIN_STAR_PATH,
  TICKET_BOX,
  TICKET_PATH,
} from "./art";

/**
 * Renders the waitlist ticket to a PNG on a canvas, drawing the same vector
 * paths the on-screen SVG uses.
 *
 * Deliberately not a DOM-to-image library: those have to inline every
 * stylesheet, webfont and SVG the node touches, and fail in ways that are hard
 * to see coming. Drawing the handful of shapes directly is a few more lines and
 * cannot half-work.
 */

export type TicketArt = {
  email: string;
  handle: string;
  /** Ticket gradient, light end first. */
  from: string;
  to: string;
  /** What is printed on the ticket, and the colour behind it. */
  ink: string;
  page: string;
  font: string;
};

const SCALE = 2;
const PAD = 56;
const TICKET_W = 420;
const TICKET_H = 190;
const CODE_W = 100;
const CODE_H = 120;
const W = TICKET_W + PAD * 2;
const H = TICKET_H + PAD * 2;

function drawPin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  body: string,
  star: string,
) {
  const scale = size / PIN_BOX.h;
  ctx.save();
  ctx.translate(cx - (PIN_BOX.w * scale) / 2, cy - (PIN_BOX.h * scale) / 2);
  ctx.scale(scale, scale);
  ctx.fillStyle = body;
  for (const d of PIN_BODY_PATHS) ctx.fill(new Path2D(d));
  ctx.fillStyle = star;
  ctx.fill(new Path2D(PIN_STAR_PATH));
  ctx.restore();
}

/** Trims a line to something that fits the pass. */
export function fitName(name: string, ctx: CanvasRenderingContext2D, max: number) {
  if (ctx.measureText(name).width <= max) return name;
  let cut = name;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > max) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}…`;
}

/**
 * Break a line into at most `maxLines` that each fit `max`.
 *
 * Greedy and character-by-character, because an email has no spaces to break
 * on. Returns null when it cannot be done at this size, which is the fitting
 * loop's signal to go smaller.
 */
export function wrapToLines(
  text: string,
  ctx: CanvasRenderingContext2D,
  max: number,
  maxLines: number,
) {
  const lines: string[] = [];
  let rest = text;

  while (rest.length > 0) {
    if (lines.length === maxLines) return null;

    if (ctx.measureText(rest).width <= max) {
      lines.push(rest);
      break;
    }

    let cut = rest.length;
    while (cut > 1 && ctx.measureText(rest.slice(0, cut)).width > max) cut -= 1;

    lines.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }

  return lines.length > 0 ? lines : [text];
}

/**
 * Set the largest type size at which `text` fits in `maxLines`, and hand back
 * both the size and the broken lines.
 *
 * The screen shrinks the address and wraps it rather than cutting it short, so
 * the export has to do the same or the PNG would not match the pass it was
 * taken from.
 */
export function fitLines(
  text: string,
  ctx: CanvasRenderingContext2D,
  max: number,
  {
    weight,
    from,
    to,
    font,
    maxLines,
  }: {
    weight: number;
    from: number;
    to: number;
    font: string;
    maxLines: number;
  },
) {
  for (let size = from; size > to; size -= 0.5) {
    ctx.font = `${weight} ${size}px ${font}`;
    const lines = wrapToLines(text, ctx, max, maxLines);
    if (lines) return { size, lines };
  }

  /* nothing fits: take the floor and ellipse whatever is left over */
  ctx.font = `${weight} ${to}px ${font}`;
  const lines = wrapToLines(text, ctx, max, maxLines) ?? [text];
  return { size: to, lines: lines.map((l, i) => (i === maxLines - 1 ? fitName(l, ctx, max) : l)) };
}

export function drawTicket(canvas: HTMLCanvasElement, art: TicketArt) {
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable");

  ctx.scale(SCALE, SCALE);

  /* the page behind the ticket, so the PNG is not transparent on X */
  ctx.fillStyle = art.page;
  ctx.fillRect(0, 0, W, H);

  /* the ticket itself, mapped from the artwork's own coordinate space */
  ctx.save();
  ctx.translate(PAD, PAD);
  ctx.scale(TICKET_W / TICKET_BOX.w, TICKET_H / TICKET_BOX.h);
  ctx.translate(-TICKET_BOX.x, -TICKET_BOX.y);

  const gradient = ctx.createLinearGradient(722.48, 250.25, -81.58, 483.08);
  gradient.addColorStop(0, art.from);
  gradient.addColorStop(1, art.to);
  ctx.fillStyle = gradient;
  ctx.fill(new Path2D(TICKET_PATH));
  ctx.restore();

  /* --- the stub: the barcode, same pattern and proportions as the screen --- */
  const stubCx = PAD + TICKET_W * 0.19;
  const centre = PAD + TICKET_H / 2;

  const widths = barcodePattern(art.handle);
  const unit = CODE_W / barcodeUnits(widths);
  const codeX = stubCx - CODE_W / 2;
  const codeY = centre - CODE_H / 2;

  ctx.fillStyle = art.ink;
  let barX = codeX;
  widths.forEach((width, index) => {
    if (index % 2 === 0) ctx.fillRect(barX, codeY, width * unit, CODE_H);
    barX += width * unit;
  });

  ctx.textBaseline = "alphabetic";

  /* --- the body: lockup, then the pass details --- */
  const bodyX = PAD + TICKET_W * 0.38 + 26;
  const bodyMax = TICKET_W - (bodyX - PAD) - 34;

  ctx.textAlign = "left";
  ctx.fillStyle = art.ink;

  const lockupY = centre - 40;
  drawPin(ctx, bodyX + 8.5, lockupY, 20, art.ink, art.from);
  ctx.font = `500 19px ${art.font}`;
  ctx.fillText("Pin UI", bodyX + 24, lockupY + 7);

  ctx.font = `500 10px ${art.font}`;
  ctx.globalAlpha = 0.7;
  ctx.fillText(spaced("WAITLIST PASS"), bodyX, centre + 2);
  ctx.globalAlpha = 1;

  /* the email gives up size, then a second line, before it gives up characters */
  const email = fitLines(art.email, ctx, bodyMax, {
    weight: 500,
    from: 24,
    to: 11,
    font: art.font,
    maxLines: 2,
  });

  const leading = email.size * 1.15;
  email.lines.forEach((line, i) => {
    ctx.fillText(line, bodyX, centre + 28 + i * leading);
  });

  /* The handle sits under whatever the address took, and follows it down in
     size the same way it does on screen: it is the quieter of the two lines and
     must not end up the larger one. */
  const handleY = centre + 28 + (email.lines.length - 1) * leading + 22;
  ctx.font = `400 ${Math.max(10, Math.min(16, email.size - 3))}px ${art.font}`;
  ctx.globalAlpha = 0.85;
  ctx.fillText(fitName(art.handle, ctx, bodyMax), bodyX, handleY);
  ctx.globalAlpha = 1;
}

/** Canvas has no letter-spacing everywhere yet, so widen the caps by hand. */
function spaced(text: string) {
  return text.split("").join(" ");
}

export async function ticketBlob(art: TicketArt): Promise<Blob> {
  const canvas = document.createElement("canvas");
  drawTicket(canvas, art);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not encode the ticket")),
      "image/png",
    );
  });
}
