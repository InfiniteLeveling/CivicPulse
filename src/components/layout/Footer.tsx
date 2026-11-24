import { PublicLink } from "@/components/layout/PublicLink";
import { BrandLogo } from "@/components/common/BrandLogo";
import { ReadingModeToggle } from "@/components/common/ReadingModeToggle";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { publicDestinations, publicLinks } from "@/lib/constants/public-navigation";

export function Footer() {
  return (
    <footer className="public-footer bg-slate-900 text-white border-t border-slate-800">
      <div className="content-container grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.4fr]">
        <div>
          <PublicLink href={publicDestinations.home} aria-label="CivicPulse home">
            <BrandLogo inverse />
          </PublicLink>
          <p className="mt-4 max-w-xs text-sm text-slate-300">{APP_TAGLINE}</p>
          <p className="mt-2 max-w-xs text-xs text-slate-400">
            Intelligent civic problem resolution prototype empowering citizens and maintenance teams.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <ThemeToggle variant="outline" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700" />
            <ReadingModeToggle variant="outline" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700" />
          </div>
        </div>
        <nav aria-label="Footer navigation">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Navigation</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {publicLinks.map((link) => (
              <li key={link.href}>
                <PublicLink href={link.href} className="text-slate-300 hover:text-white hover:underline">
                  {link.label}
                </PublicLink>
              </li>
            ))}
            <li>
              <PublicLink href={publicDestinations.report} className="text-blue-400 font-medium hover:text-blue-300 hover:underline">
                Report an Issue →
              </PublicLink>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Platform Notice</h2>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            CivicPulse is an AI-assisted civic issue reporting and resolution platform prototype.
            It provides automated classification, nearby duplicate detection, priority scoring, and municipal workflow tools.
            CivicPulse is not an emergency dispatch system. In life-threatening situations, contact official emergency services immediately.
          </p>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="content-container flex flex-col sm:flex-row items-center justify-between py-4 text-xs text-slate-400 gap-2">
          <p>© {new Date().getFullYear()} {APP_NAME}. Better communities begin with you.</p>
          <p>National Hackathon Submission · Built for Accessibility & Impact</p>
        </div>
      </div>
    </footer>
  );
}
