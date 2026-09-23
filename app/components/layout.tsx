import type { ReactNode } from "react";
import WorkbenchShell from "@/components/library/WorkbenchShell";

/**
 * The sidebar lives in the layout so that it survives navigation between
 * components — which is what lets the pin travel to the entry you picked
 * rather than being redrawn already there.
 */
export default function ComponentsLayout({ children }: { children: ReactNode }) {
  return <WorkbenchShell>{children}</WorkbenchShell>;
}
