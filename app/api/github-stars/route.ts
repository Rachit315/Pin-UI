import { NextResponse } from "next/server";
import { LINKS } from "@/lib/links";

/**
 * The repository's star count, for the GitHub button in the masthead.
 *
 * Fetched here rather than from the browser for three reasons: GitHub allows
 * an unauthenticated caller sixty requests an hour, which one busy visitor
 * reloading could spend; a server fetch is cached and shared by everyone, so
 * the site asks at most once an hour however many people arrive; and an
 * optional `GITHUB_TOKEN` stays on the server where it belongs.
 */
export const revalidate = 3600;

/* "https://github.com/Owner/Repo" → "Owner/Repo" */
const REPO = new URL(LINKS.github).pathname.replace(/^\/|\/$/g, "");

export async function GET() {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "pinui.xyz",
    };
    const token = process.env.GITHUB_TOKEN?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers,
      next: { revalidate },
    });
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);

    const data = (await response.json()) as { stargazers_count?: unknown };
    const stars = typeof data.stargazers_count === "number" ? data.stargazers_count : null;

    return NextResponse.json(
      { stars },
      /* browsers hold it five minutes, the CDN an hour — stated, not left to heuristics */
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch {
    /* no count is better than a wrong one: the button falls back to a label */
    return NextResponse.json(
      { stars: null },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
    );
  }
}
