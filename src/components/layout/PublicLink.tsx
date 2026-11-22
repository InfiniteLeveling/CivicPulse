"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

/** Revisit an anchor even when the visitor has scrolled away from the current fragment. */
export function PublicLink({ href, ...props }: Omit<ComponentProps<typeof Link>, "onNavigate">) {
  return (
    <Link
      {...props}
      href={href}
      scroll={true}
      onNavigate={(event) => {
        if (typeof href !== "string") return;
        if (!href.startsWith("/#")) {
          window.scrollTo(0, 0);
          return;
        }
        if (location.pathname + location.hash !== href) return;
        const target = document.getElementById(href.slice(2));
        if (target) {
          event.preventDefault();
          target.focus({ preventScroll: true });
          target.scrollIntoView({ block: "start" });
        }
      }}
    />
  );
}
