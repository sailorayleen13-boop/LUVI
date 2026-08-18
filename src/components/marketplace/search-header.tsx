"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { t } from "@/lib/i18n";

export function SearchHeader({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 bg-cream/95 px-2 pb-3 pt-[calc(14px+env(safe-area-inset-top))] backdrop-blur-sm">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label={t.common.back}
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full active:bg-charcoal/5"
      >
        <ChevronLeft size={24} className="text-charcoal" />
      </button>
      <input
        autoFocus
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.search.placeholder}
        aria-label={t.search.label}
        className="flex-1 rounded-full bg-cream-soft px-4 py-2.5 text-[14px] text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-fucsia/40"
      />
    </div>
  );
}
