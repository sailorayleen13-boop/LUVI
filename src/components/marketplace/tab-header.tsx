/** Simple heading for primary bottom-nav tab pages (Saved, Stores, Explore, Account) — no back arrow, since there's nowhere to go "back" to from a tab. */
export function TabHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-3">
      <h1 className="font-display text-xl font-bold text-charcoal">{title}</h1>
      {subtitle && <p className="mt-0.5 text-[12.5px] text-charcoal-faint">{subtitle}</p>}
    </div>
  );
}
