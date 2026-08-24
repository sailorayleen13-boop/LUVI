import { isPhotoUrl } from "@/lib/marketplace/media";

/**
 * Store logo — either a real uploaded photo (Phase 8) or the emoji every
 * mock/seeded merchant still uses. Same dual-purpose-string convention as
 * ProductImage; kept as its own tiny component since callers each wrap it
 * in their own size classes rather than sharing one image treatment.
 */
export function MerchantLogo({ logo, className = "" }: { logo: string; className?: string }) {
  const photo = isPhotoUrl(logo);
  return (
    <span
      className={`flex flex-none items-center justify-center overflow-hidden rounded-full bg-cream-soft ${className}`}
      aria-hidden
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="h-full w-full object-cover" />
      ) : (
        logo
      )}
    </span>
  );
}
