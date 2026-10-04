/**
 * "Requested by @handle" — the chip at the top of the stage for a component
 * somebody asked for.
 *
 * It is the toolbar's twin, on the same surface with the same hairline, so it
 * reads as part of the workbench rather than of the component under it. The
 * whole chip is the link to their X profile; pointing at it (or tabbing to it)
 * slides the address out beside the name, so you can see where it goes before
 * you go.
 */
export default function RequestChip({ handle, url }: { handle: string; url: string }) {
  const address = url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  return (
    <a
      className="wbreq"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Requested by @${handle} — open their X profile in a new tab`}
    >
      <span className="wbreq__text">
        Requested by <span className="wbreq__handle">@{handle}</span>
      </span>
      {/* the address, folded away until the chip is pointed at */}
      <span className="wbreq__more" aria-hidden="true">
        <span className="wbreq__moreInner">
          <span className="wbreq__rule" />
          <span className="wbreq__url">{address}</span>
          <svg className="wbreq__arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
            <path d="M3.5 8.5l5-5M4.5 3.5h4v4" />
          </svg>
        </span>
      </span>
    </a>
  );
}
