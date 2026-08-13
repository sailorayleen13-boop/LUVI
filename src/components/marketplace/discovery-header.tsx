import { Heart, MapPin } from "lucide-react";
import type { Location } from "@/lib/marketplace/types";
import { BRAND_NAME } from "@/lib/brand";
import { t } from "@/lib/i18n";

function formatLocationLabel(location: Location): string {
  return [location.city, t.country[location.country]].filter(Boolean).join(", ");
}

/**
 * Home-style header for the marketplace discovery surface: wordmark +
 * location signal + tagline. Distinct from MarketplaceHeader (back-button
 * header used on detail sub-pages) — this is the top of the discovery feed
 * itself, same spot the ecommerce MVP's logo+heart lockup used to live.
 */
export function DiscoveryHeader({ location }: { location: Location }) {
  return (
    <div className="px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-1">
      <div className="flex items-center gap-0.5">
        <span className="font-display text-2xl font-bold tracking-tight text-charcoal">
          {BRAND_NAME}
        </span>
        <Heart size={13} className="-translate-y-1.5 fill-fucsia text-fucsia" />
      </div>
      <p className="mt-0.5 flex items-center gap-1 text-[12.5px] font-medium text-charcoal-faint">
        <MapPin size={13} className="text-fucsia" />
        {formatLocationLabel(location)}
      </p>
      <p className="mt-3 text-[13.5px] font-medium text-charcoal-soft">{t.discovery.tagline}</p>
    </div>
  );
}
