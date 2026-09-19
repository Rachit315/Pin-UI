import {
  barcodePattern,
  barcodeUnits,
  PIN_BODY_PATHS,
  PIN_BOX,
  PIN_STAR_PATH,
  TICKET_BOX,
  TICKET_PATH,
} from "./art";
import { bodyWidth, handleSize, layoutEmail, TICKET } from "./ticketLayout";

/**
 * Renders the waitlist pass to a PNG on a canvas, drawing the same vector paths
 * the on-screen SVG uses.
 *
 * Deliberately not a DOM-to-image library: those have to inline every
 * stylesheet, webfont and SVG the node touches, and fail in ways that are hard
 * to see coming. Drawing the handful of shapes directly is a few more lines and
 * cannot half-work.
 *
 * The printed column is not hand-placed here. It is stacked from the same
 * `lib/ticketLayout.ts` spec the stylesheet is built from, in the same order
 * and with the same gaps, and centred as a block — which is what the screen's
 * flex column does. The two used to be written separately, and that is exactly
 * why the download came out aligned differently from the pass it was a picture
 * of.
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
const TICKET_W = TICKET.width;
const TICKET_H = TICKET.height;
const W = TICKET_W + PAD * 2;
const H = TICKET_H + PAD * 2;

/** Line box heights, matching the stylesheet. */
const LINE = { word: 1, caption: 1.2, email: TICKET.email.leading, handle: 1.3 };

function drawPin(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  height: number,
  body: string,
  star: string,
) {
  const scale = height / PIN_BOX.h;
  ctx.save();
  ctx.translate(x, top);
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
 * Draw one line the way CSS would inside a line box of `lineHeight`: the text
 * sits in the middle of the box, with the leading split above and below it.
 */
function drawLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  boxTop: number,
  size: number,
  lineHeight: number,
) {
  ctx.textBaseline = "top";
  ctx.fillText(text, x, boxTop + (size * lineHeight - size) / 2);
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

  const centre = PAD + TICKET_H / 2;

  /* --- the stub: the barcode, centred in its half of the perforation --- */
  const stubCx = PAD + TICKET_W * (TICKET.split / 2);
  const widths = barcodePattern(art.handle);
  const unit = TICKET.code.width / barcodeUnits(widths);
  const codeX = stubCx - TICKET.code.width / 2;
  const codeY = centre - TICKET.code.height / 2;

  ctx.fillStyle = art.ink;
  let barX = codeX;
  widths.forEach((width, index) => {
    if (index % 2 === 0) {
      ctx.fillRect(barX, codeY, width * unit, TICKET.code.height);
    }
    barX += width * unit;
  });

  /* --- the body, stacked exactly as the flex column is --- */
  const bodyX = PAD + TICKET_W * TICKET.split + TICKET.body.left;
  const bodyMax = bodyWidth(TICKET_W);

  const email = layoutEmail(art.email, bodyMax, art.font);
  const handle = handleSize(email.size);

  const lockupH = Math.max(
    TICKET.lockup.pinHeight,
    TICKET.lockup.word * LINE.word,
  );
  const captionH = TICKET.caption * LINE.caption;
  const emailH = email.lines.length * email.size * LINE.email;
  const handleH = handle * LINE.handle;

  const stackH =
    lockupH +
    TICKET.gaps.lockupToCaption +
    captionH +
    TICKET.gaps.captionToEmail +
    emailH +
    TICKET.gaps.emailToHandle +
    handleH;

  /* the column is centred in the ticket, the same as `justify-content: center` */
  let y = centre - stackH / 2;

  ctx.textAlign = "left";
  ctx.fillStyle = art.ink;

  /* the lockup: pin and wordmark, centred against each other */
  drawPin(
    ctx,
    bodyX,
    y + (lockupH - TICKET.lockup.pinHeight) / 2,
    TICKET.lockup.pinHeight,
    art.ink,
    art.from,
  );
  ctx.font = `500 ${TICKET.lockup.word}px ${art.font}`;
  drawLine(
    ctx,
    "Pin UI",
    bodyX + TICKET.lockup.pinWidth + TICKET.lockup.gap,
    y + (lockupH - TICKET.lockup.word * LINE.word) / 2,
    TICKET.lockup.word,
    LINE.word,
  );
  y += lockupH + TICKET.gaps.lockupToCaption;

  /* the caption, tracked out the way the stylesheet tracks it */
  ctx.font = `500 ${TICKET.caption}px ${art.font}`;
  const tracking = `${TICKET.caption * 0.18}px`;
  const hasTracking = "letterSpacing" in ctx;
  if (hasTracking) ctx.letterSpacing = tracking;
  ctx.globalAlpha = 0.7;
  drawLine(
    ctx,
    hasTracking ? "WAITLIST PASS" : spaced("WAITLIST PASS"),
    bodyX,
    y,
    TICKET.caption,
    LINE.caption,
  );
  ctx.globalAlpha = 1;
  if (hasTracking) ctx.letterSpacing = "0px";
  y += captionH + TICKET.gaps.captionToEmail;

  /* the address, at whatever size and breaks the shared spec settled on */
  ctx.font = `500 ${email.size}px ${art.font}`;
  email.lines.forEach((part, i) => {
    drawLine(
      ctx,
      fitName(part, ctx, bodyMax),
      bodyX,
      y + i * email.size * LINE.email,
      email.size,
      LINE.email,
    );
  });
  y += emailH + TICKET.gaps.emailToHandle;

  /* the handle, trailing it in size */
  ctx.font = `400 ${handle}px ${art.font}`;
  ctx.globalAlpha = 0.85;
  drawLine(ctx, fitName(art.handle, ctx, bodyMax), bodyX, y, handle, LINE.handle);
  ctx.globalAlpha = 1;
}

/** Older canvases have no letter-spacing, so widen the caps by hand. */
function spaced(text: string) {
  return text.split("").join(" ");
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
