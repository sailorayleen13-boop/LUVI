"use client";

import { useState } from "react";
import type { Category } from "@/lib/marketplace/types";
import { t } from "@/lib/i18n";
import { saveOnboardingAction, skipOnboardingAction } from "@/lib/marketplace/taste/actions";

/**
 * Reuses the marketplace's existing 9-category taxonomy — deliberately no
 * separate "style/aesthetic" taxonomy invented for onboarding (Phase 7
 * explicitly warns against inventing taxonomy just to look sophisticated),
 * and every option here actually has matching products, unlike some of the
 * illustrative examples in the brief (no gaming/fitness products exist in
 * the catalog, so offering those chips would select into nothing).
 */
const CATEGORY_OPTIONS: { value: Category; emoji: string }[] = [
  { value: "squishies", emoji: "🧸" },
  { value: "collectibles", emoji: "🎁" },
  { value: "pets", emoji: "🐾" },
  { value: "beauty", emoji: "💄" },
  { value: "fashion", emoji: "👜" },
  { value: "home", emoji: "🏠" },
  { value: "tech", emoji: "🖥️" },
  { value: "gifts", emoji: "💝" },
  { value: "viral", emoji: "🌀" },
];

/**
 * "Pick what you LUVI" — the initial seed of the Taste Profile, not a
 * permanent lock-in. Almost zero friction by design: no minimum selection,
 * one page, Omitir always visible and equally prominent to Guardar. Both
 * buttons are plain form submits to Server Actions (saveOnboardingAction /
 * skipOnboardingAction) — no client-side Supabase call, no loading-state
 * plumbing needed beyond the browser's native form pending state.
 */
export function OnboardingView({
  initialSelected,
  redirectTo = "/",
}: {
  initialSelected: Category[];
  redirectTo?: string;
}) {
  const [selected, setSelected] = useState<Set<Category>>(new Set(initialSelected));

  function toggle(value: Category) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-10 pt-[calc(24px+env(safe-area-inset-top))] lg:mx-auto lg:max-w-2xl lg:pt-10">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="font-display text-2xl font-bold text-charcoal">{t.onboarding.title}</h1>
        <p className="text-[14px] text-charcoal-soft">{t.onboarding.subtitle}</p>
      </div>

      <form action={saveOnboardingAction} className="flex flex-col gap-6">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div className="grid grid-cols-3 gap-3">
          {CATEGORY_OPTIONS.map(({ value, emoji }) => {
            const active = selected.has(value);
            return (
              <label
                key={value}
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 py-4 text-center transition ${
                  active ? "border-fucsia bg-fucsia-light" : "border-charcoal/8 bg-cream-soft"
                }`}
              >
                <input
                  type="checkbox"
                  name="category"
                  value={value}
                  checked={active}
                  onChange={() => toggle(value)}
                  className="sr-only"
                />
                <span className="text-3xl" aria-hidden>
                  {emoji}
                </span>
                <span
                  className={`text-[12.5px] font-semibold ${active ? "text-fucsia-dark" : "text-charcoal-soft"}`}
                >
                  {t.category[value]}
                </span>
              </label>
            );
          })}
        </div>

        <button
          type="submit"
          className="rounded-full bg-fucsia py-3.5 text-[15px] font-semibold text-white shadow-md transition active:scale-[0.98]"
        >
          {t.onboarding.save}
        </button>
      </form>

      <form action={skipOnboardingAction}>
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button type="submit" className="w-full text-center text-[13.5px] font-medium text-charcoal-faint">
          {t.onboarding.skip}
        </button>
      </form>
    </div>
  );
}
