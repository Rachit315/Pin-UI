import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/legal/LegalPage";
import {
  faqPageJsonLd,
  breadcrumbJsonLd,
  safeJsonLd,
} from "@/lib/jsonld";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "FAQ — Pin UI",
  description:
    "Frequently asked questions about Pin UI — what it is, how to use it, what components are included, and when it launches.",
  alternates: { canonical: "/faq" },
};

/**
 * AEO-optimised FAQ content.
 *
 * Each answer leads with a direct, self-contained sentence — the one an AI
 * engine will quote — followed by two or three supporting sentences. The page
 * doubles as a FAQPage schema source, so the visible text and the structured
 * data always agree.
 */
const FAQS = [
  {
    question: "What is Pin UI?",
    answer:
      "Pin UI is a free, open-source React component library that turns Pinterest-inspired designs into production-ready, copy-paste components for modern web apps. Every component starts as a Pinterest pin and ends as something you can paste straight into your project. It is built with TypeScript, React, and CSS — no external dependencies beyond Motion for animations.",
  },
  {
    question: "Is Pin UI free to use?",
    answer:
      "Yes, Pin UI is completely free and open-source. All components are released under the MIT licence, which means you can use them in personal and commercial projects without any cost or attribution requirements.",
  },
  {
    question: "What framework does Pin UI work with?",
    answer:
      "Pin UI components are built with React and TypeScript. They work with any React-based framework, including Next.js, Vite, Remix, and Create React App. The styling is plain CSS — no Tailwind or CSS-in-JS dependency — so the components are easy to customise and integrate into any design system.",
  },
  {
    question: "How do I install a Pin UI component?",
    answer:
      "You copy and paste the component's source code directly into your project. Each component page shows the full source — a TypeScript file and a CSS file — along with an install command for the one animation dependency (Motion). There is no npm package to install; the code is yours to own and modify.",
  },
  {
    question: "What components does Pin UI have?",
    answer:
      "Pin UI currently includes six components: Count down (a session timer with real-time countdown and keyboard control), Balance Card (a finance card with a gooey currency selector, counter animation, and synthesised sound cues), Add To Cart (a product card with drag-to-confirm, quantity picker, and a gooey heart burst), Chips (a selection list of 3D chips with a real press and synthesised clicks), Egg OTP (a one-time-code field whose eggs crack on a wrong code) and Add Member (a paged people picker with gooey toggles and faces that fly into a stack). Chips, Egg OTP and Add Member come in light and dark. Three new components are added every week.",
  },
  {
    question: "How is Pin UI different from other UI libraries?",
    answer:
      "Pin UI focuses on unique, interaction-heavy components inspired by Pinterest designs — not generic buttons and inputs. Every component includes animations, sound cues, and micro-interactions out of the box. The code is copy-paste rather than installed from a package, so you own it entirely and can modify it without fighting an API.",
  },
  {
    question: "When is Pin UI launching?",
    answer:
      "Pin UI is currently in early access with a limited waitlist. The component library is live and browsable right now — you can preview, interact with, and copy the source code for every component. Join the waitlist to be notified when the full library launches with new components every week.",
  },
];

export default function FaqPage() {
  const faqSchema = faqPageJsonLd(FAQS);
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "FAQ", url: `${SITE_URL}/faq` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbs) }}
      />
      <LegalPage
        title="Frequently Asked Questions"
        updated="2026-09-23"
        summary="Everything you need to know about Pin UI — what it is, how to use it, and what makes it different."
      >
        {FAQS.map((faq, i) => (
          <section key={i}>
            <h2>{faq.question}</h2>
            <p>{faq.answer}</p>
          </section>
        ))}

        <h2>Still have questions?</h2>
        <p>
          Reach out at{" "}
          <a href="mailto:rachithakur2006@gmail.com">rachithakur2006@gmail.com</a>{" "}
          or DM on{" "}
          <a href="https://x.com/RachitThakur146" target="_blank" rel="noopener noreferrer">
            X (Twitter)
          </a>
          . You can also{" "}
          <Link href="/waitlist">join the waitlist</Link> to be first in line
          when the full library launches.
        </p>
      </LegalPage>
    </>
  );
}
