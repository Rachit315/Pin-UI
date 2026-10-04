import type { Metadata } from "next";
import TestimonialsIndex from "@/components/hero/TestimonialsIndex";
import "@/app/hero.css";
import "@/app/sections.css";
import "@/app/testimonials.css";

export const metadata: Metadata = {
  title: "Testimonials — Pin UI",
  description: "What people are saying about Pin UI, word for word from the replies on X.",
  alternates: { canonical: "/testimonials" },
};

/** Every testimonial — where the landing page's "View all testimonials" goes. */
export default function TestimonialsPage() {
  return <TestimonialsIndex />;
}
