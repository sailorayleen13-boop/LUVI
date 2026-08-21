"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Heart, RotateCcw } from "lucide-react";
import { t } from "@/lib/i18n";

/**
 * Root error boundary. Every discovery-facing data read already fails
 * gracefully on its own (catalog.ts falls back to the mock catalog;
 * personalized-home.ts/getCurrentUser resolve to empty/null instead of
 * throwing) — this is the last-resort net for anything that still
 * surfaces an uncaught render error, so a visitor never sees a raw
 * Next.js/React error page or stack trace. Note the prop name: this
 * Next.js version renamed the classic `reset` callback to `retry` (see
 * node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md).
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-fucsia-light">
        <Heart size={26} className="text-fucsia-dark" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-display text-lg font-semibold text-charcoal">{t.errorBoundary.title}</p>
        <p className="text-sm text-charcoal-faint">{t.errorBoundary.subtitle}</p>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={retry}
          className="flex items-center gap-1.5 rounded-full bg-fucsia px-5 py-2.5 text-sm font-semibold text-white shadow-md active:scale-95"
        >
          <RotateCcw size={15} />
          {t.errorBoundary.retry}
        </button>
        <Link
          href="/"
          className="rounded-full bg-cream-soft px-5 py-2.5 text-sm font-semibold text-charcoal-soft active:scale-95"
        >
          {t.errorBoundary.backHome}
        </Link>
      </div>
    </div>
  );
}
