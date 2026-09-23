import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — Pin UI",
  description: "The terms you accept by using Pin UI, joining the waitlist, or copying a component.",
  alternates: { canonical: "/terms" },
};

/**
 * The licence section is the one that matters: people come to this site to copy
 * code, and a component library that does not say what you may do with the code
 * is not much use. It says so plainly and near the top.
 */
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="2026-09-22"
      summary="What you can expect from Pin UI, and what Pin UI expects from you. Short, because there is not much to it."
    >
      <h2>Using this site</h2>
      <p>
        Pin UI is a library of user-interface components and a waitlist for its launch. Browsing it,
        joining the waitlist or copying a component means you accept what is on this page. If you do
        not, the honest answer is not to use the site.
      </p>

      <h2>The components are yours to use</h2>
      <div className="legal__card">
        <p>
          Every component published on this site is offered under the{" "}
          <a href="https://opensource.org/license/mit" target="_blank" rel="noopener noreferrer">
            MIT licence
          </a>
          . In plain terms: copy them, change them, ship them in work you sell, and you owe nothing
          and need not ask. Keep a copy of the licence notice with the code if you redistribute the
          components themselves.
        </p>
        <p>
          What is <strong>not</strong> covered by that is the Pin UI name and mark, and any
          photograph or recording used to demonstrate a component. Those stay with their owners.
        </p>
      </div>
      <p>
        The components are given as they are. They have been built with care and they are used on
        this very site, but nobody can promise a piece of code is fit for your particular product.
        Test what you ship. Pin UI is not liable for damage, loss or downtime arising from code you
        copied from here.
      </p>

      <h2>The waitlist</h2>
      <ul>
        <li>
          Joining reserves you a place, nothing more. It is not a purchase, and no money changes
          hands at any point.
        </li>
        <li>
          The signup form asks you to agree that Pin UI may tag you on X at launch. That is the only
          use your handle is put to, and you can withdraw it by asking.
        </li>
        <li>
          One place per person. Signing up repeatedly, with throwaway addresses or with a script, is
          the one thing that will get an entry removed.
        </li>
        <li>
          You can leave at any time by emailing{" "}
          <a href="mailto:rachithakur2006@gmail.com">rachithakur2006@gmail.com</a>.
        </li>
      </ul>

      <h2>What you agree not to do</h2>
      <ul>
        <li>Attempt to reach the waitlist data by any route other than the signup form.</li>
        <li>Probe, scan or overload the site, or work around the rate limit on signups.</li>
        <li>Pass Pin UI off as your own work, or present a copy of this site as the real one.</li>
        <li>Use the site to break the law where you are.</li>
      </ul>

      <h2>Availability</h2>
      <p>
        This is a project run by one person before launch. Pages may change, components may be
        revised, and the site may be down while that happens. Nothing here is offered with an uptime
        guarantee, and a component you copied today may look different here tomorrow — which is
        exactly why you are encouraged to copy the code into your own project rather than link to
        it.
      </p>

      <h2>Ending it</h2>
      <p>
        You can stop using the site whenever you like, and ask for your waitlist entry to be removed.
        Access may be refused to anyone doing the things listed above. Code you have already copied
        under the MIT licence stays yours regardless — that licence cannot be taken back.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        If these terms change, the date at the top moves. Changes that affect people already on the
        waitlist will be emailed rather than quietly edited in.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of India, and the courts there have jurisdiction over
        any dispute arising from them.
      </p>

      <div className="legal__contact">
        <h2>Contact</h2>
        <p>
          Anything unclear on this page, ask:{" "}
          <a href="mailto:rachithakur2006@gmail.com">rachithakur2006@gmail.com</a>. The companion
          page is the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </LegalPage>
  );
}
