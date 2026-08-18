"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * /mp was the Phase 2 preview of the marketplace Home; that experience now
 * lives at "/" (Phase 3, decision A). Kept as a redirect — not deleted —
 * so links shared during the preview period don't break. Client-side
 * router.replace (not next.config redirects()) because this app also
 * builds as a static export, where next.config redirects aren't supported.
 */
export default function MarketplacePreviewRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <main className="flex flex-col items-center justify-center gap-3 px-8 py-24 text-center">
      <p className="text-sm text-charcoal-faint">Redirigiendo a LUVI…</p>
      <Link href="/" className="text-sm font-semibold text-fucsia-dark">
        Ir a LUVI
      </Link>
    </main>
  );
}
