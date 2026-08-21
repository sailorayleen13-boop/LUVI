/**
 * Root loading fallback — shown while any route without its own more
 * specific loading.tsx (currently every marketplace route) suspends on its
 * async Server Component data fetch. A branded skeleton instead of a bare
 * spinner: matches the shape of the discovery header + a couple of card
 * rows so the page doesn't visually "pop" once real content arrives, and
 * never looks like a broken/blank screen while Supabase reads settle
 * (see the Phase 7 catalog cutover — reads here can take a noticeable
 * moment, which is exactly what this covers for).
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-7 pb-8 pt-3" aria-busy="true" aria-label="Cargando">
      <div className="flex flex-col gap-2 px-4">
        <div className="h-6 w-32 animate-pulse rounded-full bg-charcoal/[0.06]" />
        <div className="h-3 w-40 animate-pulse rounded-full bg-charcoal/[0.05]" />
      </div>

      {[0, 1].map((row) => (
        <div key={row} className="flex flex-col gap-3">
          <div className="h-5 w-40 animate-pulse rounded-full bg-charcoal/[0.06] mx-4" />
          <div className="flex gap-3 overflow-hidden px-4">
            {[0, 1, 2, 3].map((card) => (
              <div key={card} className="flex w-[42%] flex-none flex-col gap-2 md:w-[200px]">
                <div className="aspect-square w-full animate-pulse rounded-2xl bg-charcoal/[0.06]" />
                <div className="h-3 w-4/5 animate-pulse rounded-full bg-charcoal/[0.06]" />
                <div className="h-3 w-1/2 animate-pulse rounded-full bg-charcoal/[0.05]" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
