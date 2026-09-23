import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Pin UI",
  description: "What Pin UI collects when you join the waitlist, why, and how to have it removed.",
  alternates: { canonical: "/privacy" },
};

/**
 * Written against what the code actually does rather than from a template: the
 * fields listed here are the columns that exist in the waitlist table, and the
 * storage described is the storage the site uses.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="2026-09-22"
      summary="Pin UI is a waitlist and a component library. It collects the little it needs to run those two things, and nothing else."
    >
      <h2>The short version</h2>
      <p>
        If you join the waitlist, Pin UI keeps your email address and your X handle so it can tell
        you when the library launches and tag you as promised. It does not sell that, share it with
        advertisers, or send anything that is not about Pin UI. If you browse without signing up,
        nothing about you is stored on our side at all.
      </p>

      <h2>What is stored when you join the waitlist</h2>
      <div className="legal__card">
        <ul>
          <li>
            <strong>Your email address.</strong> Lower-cased and trimmed, so that one person cannot
            take two places on the list. It is how you will be told about the launch.
          </li>
          <li>
            <strong>Your X handle.</strong> Stored because the signup form asks you to agree that we
            may tag you on X at launch. That agreement is the only reason we hold it.
          </li>
          <li>
            <strong>The time you joined.</strong> This is what your place in the queue is worked out
            from.
          </li>
          <li>
            <strong>Your IP address and browser user-agent string.</strong> Kept so that the signup
            form can refuse more than five attempts from one address in ten minutes. Without it the
            form is trivially scriptable.
          </li>
        </ul>
      </div>
      <p>
        That is the whole record. There is no name field, no phone number, no address, no payment
        details, and no profile built out of your browsing.
      </p>

      <h2>Where it is kept, and who can reach it</h2>
      <p>
        The waitlist lives in a Postgres database hosted by{" "}
        <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
          Supabase
        </a>
        . The table has row-level security switched on with no policies attached, which means the
        key the website carries cannot read, change or delete a single row. The only way in is one
        narrow database function that accepts a signup and returns your position — so even if the
        website&rsquo;s key leaked, the list could not be downloaded with it.
      </p>
      <p>
        The site itself is served by{" "}
        <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
          Vercel
        </a>
        , who process requests on our behalf and keep their own short-lived operational logs.
      </p>

      <h2>Analytics</h2>
      <p>
        Pin UI uses Vercel Analytics to count page views. It does not set advertising cookies, does
        not follow you between sites, and reports visits in aggregate rather than as individuals.
        There is no Google Analytics, no advertising pixel, and no third-party tracker on this site.
      </p>

      <h2>What is kept in your own browser</h2>
      <p>
        One thing: whether you chose the light or the crimson theme, saved under{" "}
        <strong>pin-ui-theme</strong> so the site does not forget between visits. It never leaves
        your device and is not readable by us. Clearing your site data removes it.
      </p>
      <p>
        The component demos on this site run entirely in your browser. Nothing you do with them —
        opening a card, dragging a slider, changing a currency — is sent anywhere or recorded.
      </p>

      <h2>How long it is kept</h2>
      <p>
        Waitlist entries are kept until the library launches and the launch announcements have gone
        out, or until you ask for yours to be removed — whichever comes first. Ask and it is deleted;
        there is no retention period we hold you to.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Ask what is held about you, and we will send you the row.</li>
        <li>Ask for it to be corrected if the email or handle is wrong.</li>
        <li>Ask for it to be deleted, and it is deleted rather than flagged.</li>
      </ul>
      <p>
        Email{" "}
        <a href="mailto:rachithakur2006@gmail.com">rachithakur2006@gmail.com</a> from the address you
        signed up with, and say which of the three you want.
      </p>

      <h2>Children</h2>
      <p>
        Pin UI is a tool for people who build websites and is not aimed at children. Please do not
        sign up if you are under 13.
      </p>

      <h2>Changes</h2>
      <p>
        If what the site collects ever changes, this page changes with it and the date at the top
        moves. Anything that materially affects people already on the list will be emailed rather
        than quietly edited in.
      </p>

      <div className="legal__contact">
        <h2>Contact</h2>
        <p>
          Pin UI is run by one person. Questions about any of the above go to{" "}
          <a href="mailto:rachithakur2006@gmail.com">rachithakur2006@gmail.com</a> and are answered
          by that same person. The companion page is the{" "}
          <Link href="/terms">Terms of Service</Link>.
        </p>
      </div>
    </LegalPage>
  );
}
