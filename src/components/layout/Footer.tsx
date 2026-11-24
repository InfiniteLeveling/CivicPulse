import { PublicLink } from "@/components/layout/PublicLink";
import { BrandLogo } from "@/components/common/BrandLogo";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { publicDestinations, publicLinks } from "@/lib/constants/public-navigation";

export function Footer() {
  return (
    <footer className="public-footer bg-foreground text-white">
      <div className="content-container grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.4fr]">
        <div><PublicLink href={publicDestinations.home} aria-label="CivicPulse home"><BrandLogo inverse /></PublicLink>
          <p className="mt-4 max-w-xs text-sm">{APP_TAGLINE}</p>
          <p className="mt-2 max-w-xs text-sm text-slate-300">Intelligent civic issue reporting for residents and municipal maintenance teams.</p></div>
        <nav aria-label="Footer navigation">
          <h2 className="text-base">Product</h2><ul className="mt-2 grid">
            {publicLinks.map((link) => <li key={link.href}><PublicLink href={link.href}>{link.label}</PublicLink></li>)}
          </ul>
        </nav>
        <div><h2 className="text-base">Privacy &amp; Safety Notice</h2>
          <p className="mt-3 text-sm text-slate-300">Upload photos of infrastructure issues only and avoid capturing faces or license plates. For emergencies threatening life or safety, contact local emergency services directly.</p>
        </div>
      </div>
      <div className="border-t border-white/15"><p className="content-container py-4 text-xs text-slate-300">© {new Date().getFullYear()} {APP_NAME}</p></div>
    </footer>
  );
}
