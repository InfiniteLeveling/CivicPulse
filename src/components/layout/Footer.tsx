import { PublicLink } from "@/components/layout/PublicLink";
import { BrandLogo } from "@/components/common/BrandLogo";
import { EasyReadingToggle } from "@/components/common/EasyReadingToggle";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { publicDestinations, publicLinks } from "@/lib/constants/public-navigation";

export function Footer() {
  return (
    <footer className="public-footer border-t border-border bg-slate-950 text-white">
      <div className="content-container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.4fr]">
        <div className="space-y-3">
          <PublicLink href={publicDestinations.home} aria-label="CivicPulse home">
            <BrandLogo inverse />
          </PublicLink>
          <p className="mt-3 max-w-xs text-sm text-slate-300 leading-relaxed">
            {APP_TAGLINE}
          </p>
          <p className="mt-1 max-w-xs text-xs text-slate-400">
            Intelligent civic problem reporting and resolution platform for residents and maintenance teams.
          </p>
          <div className="pt-2">
            <EasyReadingToggle variant="outline" size="sm" className="border-slate-800 text-slate-300 hover:bg-slate-900" />
          </div>
        </div>

        <nav aria-label="Footer navigation">
          <h2 className="text-base font-semibold text-white">Product</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {publicLinks.map((link) => (
              <li key={link.href}>
                <PublicLink href={link.href} className="hover:text-white transition-colors">
                  {link.label}
                </PublicLink>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-base font-semibold text-white">Notice and disclaimer</h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
            CivicPulse is designed for non-emergency public infrastructure maintenance. For an immediate threat to life or safety, contact local emergency services directly.
          </p>
        </div>
      </div>

      <div className="border-t border-slate-900">
        <p className="content-container py-4 text-xs text-slate-400">
          © {new Date().getFullYear()} {APP_NAME}. Built with civic transparency.
        </p>
      </div>
    </footer>
  );
}
