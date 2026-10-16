"use client";

import { useState } from "react";
import { AnimatePresence, motion, MotionConfig, type Variants } from "motion/react";
import { Bricolage_Grotesque, Inter, Urbanist } from "next/font/google";
import "./smart-pricing.css";

/**
 * Smart Pricing — three lime plans and a monthly / yearly switch.
 *
 * Built from the Figma frame (Pricing, 1440 wide): a two-line Bricolage
 * headline, a lime switch with a "Sale 20%" tag, and three
 * lime cards, each carrying its own dark-green shape in the top-right corner.
 * The switch moves its knob on a spring and every price rolls to its yearly
 * figure (20% off, shown per month); the cards rise in on a stagger, and the
 * Select Plan buttons roll their label over on hover. Three across on desktop, a single centred column on a phone.
 */

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--sp-bricolage",
  display: "swap",
});
const urbanist = Urbanist({ subsets: ["latin"], weight: "500", variable: "--sp-urbanist", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--sp-inter", display: "swap" });

const ASSETS = "/blocx/smart-pricing";
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
/* yearly billing is 20% off, quoted as the effective monthly price */
const YEARLY_DISCOUNT = 0.2;

type Billing = "monthly" | "yearly";

type Plan = {
  id: string;
  name: string;
  monthly: number;
  blurb: string;
  features: string[];
  shape: { src: string; width: number; height: number; flip?: boolean };
  popular?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    monthly: 12,
    blurb: "For early-stage teams building financial discipline",
    features: [
      "Live cash flow dashboard",
      "3-month runway projection",
      "Revenue & expense tracking",
      "Up to 3 integrations",
      "Standard forecasting model",
      "Email support",
    ],
    shape: { src: `${ASSETS}/union-basic.svg`, width: 123.703, height: 118.266 },
  },
  {
    id: "growth",
    name: "Growth",
    monthly: 49,
    blurb: "For scaling companies optimizing burn and runway",
    features: [
      "12-month forecasting horizon",
      "Burn rate analytics",
      "Multi-channel revenue tracking",
      "Scenario modeling (hiring & pricing)",
      "Up to 10 integrations",
      "Team access controls",
      "Priority support",
    ],
    shape: { src: `${ASSETS}/union-growth.svg`, width: 123.703, height: 174 },
    popular: true,
  },
  {
    id: "scale",
    name: "Scale",
    monthly: 199,
    blurb: "For advanced financial operations and enterprise reporting",
    features: [
      "18-month predictive forecasting",
      "Unlimited integrations",
      "Advanced multi-scenario modeling",
      "Department-level reporting",
      "Audit logs & advanced permissions",
      "Dedicated account manager",
      "SLA-backed support",
    ],
    /* Figma draws this one mirrored */
    shape: { src: `${ASSETS}/union-scale.svg`, width: 139.305, height: 175.684, flip: true },
  },
];

const priceFor = (plan: Plan, billing: Billing) =>
  billing === "monthly" ? plan.monthly : Math.round(plan.monthly * (1 - YEARLY_DISCOUNT));

const rise: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: EASE_OUT, delay },
  }),
};

export default function SmartPricing() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const yearly = billing === "yearly";

  return (
    <MotionConfig reducedMotion="user">
      <main className={`sp-page ${bricolage.variable} ${urbanist.variable} ${inter.variable}`}>
        <section className="sp" aria-labelledby="sp-title">
          <header className="sp__head">
            <motion.h2 id="sp-title" className="sp__title" variants={rise} initial="hidden" animate="show" custom={0.08}>
              Make the Smart Choice for <br className="sp__break" />
              Your Business
            </motion.h2>
          </header>

          <motion.div className="sp__billing" variants={rise} initial="hidden" animate="show" custom={0.18}>
            <button
              type="button"
              className={`sp__period${yearly ? "" : " is-on"}`}
              onClick={() => setBilling("monthly")}
              aria-pressed={!yearly}
            >
              Monthly
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={yearly}
              aria-label="Bill yearly"
              className="sp__switch"
              onClick={() => setBilling(yearly ? "monthly" : "yearly")}
            >
              <motion.img
                className="sp__knob"
                src={`${ASSETS}/knob.svg`}
                alt=""
                width={24}
                height={24}
                animate={{ x: yearly ? 32 : 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 34 }}
              />
            </button>
            <button
              type="button"
              className={`sp__period${yearly ? " is-on" : ""}`}
              onClick={() => setBilling("yearly")}
              aria-pressed={yearly}
            >
              Yearly
            </button>
            <span className="sp__sale">Sale 20%</span>
          </motion.div>

          <ul className="sp__plans">
            {PLANS.map((plan, i) => {
              const price = priceFor(plan, billing);
              return (
                <motion.li
                  key={plan.id}
                  className={`sp__card${plan.popular ? " sp__card--popular" : ""}`}
                  variants={rise}
                  initial="hidden"
                  animate="show"
                  custom={0.28 + i * 0.1}
                >
                  <img
                    className={`sp__shape${plan.shape.flip ? " sp__shape--flip" : ""}`}
                    src={plan.shape.src}
                    alt=""
                    width={plan.shape.width}
                    height={plan.shape.height}
                    draggable={false}
                  />

                  {plan.popular && (
                    <span className="sp__popular">
                      <img src={`${ASSETS}/dot-popular.svg`} alt="" width={6} height={6} />
                      Most Popular
                    </span>
                  )}

                  <div className="sp__top">
                    <h3 className="sp__name">{plan.name}</h3>
                    <p className="sp__price">
                      <span className="sp__amount" aria-live="polite">
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={price}
                            className="sp__digits"
                            initial={{ y: "60%", opacity: 0, filter: "blur(6px)" }}
                            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                            exit={{ y: "-60%", opacity: 0, filter: "blur(6px)" }}
                            transition={{ duration: 0.45, ease: EASE_OUT }}
                          >
                            ${price}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                      <span className="sp__per">/month</span>
                    </p>
                    <p className="sp__blurb">{plan.blurb}</p>
                  </div>

                  <ul className="sp__features">
                    {plan.features.map((f) => (
                      <li key={f}>• {f}</li>
                    ))}
                  </ul>

                  <a className="sp__cta" href={`#${plan.id}`} onClick={(e) => e.preventDefault()}>
                    {/* the label rolls up and a twin rises in behind it, with an arrow sliding in */}
                    <span className="sp__cta-roll">
                      <span className="sp__cta-label">Select Plan</span>
                      <span className="sp__cta-label" aria-hidden>
                        Select Plan
                        <svg className="sp__cta-arrow" viewBox="0 0 16 16" aria-hidden>
                          <path d="M3 8h9m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </span>
                  </a>
                </motion.li>
              );
            })}
          </ul>
        </section>
      </main>
    </MotionConfig>
  );
}
