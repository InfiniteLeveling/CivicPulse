import type { ReactNode } from "react";

interface MobileMenuProps {
  open: boolean;
  children: ReactNode;
  actions: ReactNode;
}

/**
 * Mobile navigation menu for public pages.
 * Controlled by the hamburger toggle button in Navbar.
 */
export function MobileMenu({ open, children, actions }: MobileMenuProps) {
  return (
    <nav
      hidden={!open}
      id="mobile-navigation"
      aria-label="Mobile navigation"
      className="mobile-nav lg:hidden"
    >
      <div className="content-container grid gap-1 py-3">
        {children}
        <div className="mt-2 flex flex-wrap gap-2 border-t pt-3">{actions}</div>
      </div>
    </nav>
  );
}
