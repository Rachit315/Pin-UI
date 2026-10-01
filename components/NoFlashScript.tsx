"use client";

/**
 * An inline script that runs once, from the server HTML, before first paint.
 *
 * It is a plain <script> in the document, so the browser runs it the moment
 * the parser reaches it — next/script's beforeInteractive would only queue it
 * until the framework has loaded, which is too late to stop a theme flash.
 *
 * React refuses to run a script it creates on the client, and warns whenever
 * it does — which happens if the root layout re-renders there (a hot reload, a
 * recovered error). By then the script has long since done its work, so on the
 * client it is rendered inert: same element, not executable, nothing to warn
 * about. The server HTML keeps it executable, and hydration leaves that alone.
 */
export default function NoFlashScript({ id, code }: { id: string; code: string }) {
  return (
    <script
      id={id}
      type={typeof window === "undefined" ? undefined : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
