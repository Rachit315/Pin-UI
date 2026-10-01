import type { Metadata } from "next";
import NotFound from "@/components/NotFound";

export const metadata: Metadata = {
  title: "Page not found",
  description: "There is nothing at this address. Spin the 404, or head back home.",
  robots: { index: false, follow: true },
};

/** Any address with nothing behind it. */
export default function NotFoundPage() {
  return <NotFound />;
}
