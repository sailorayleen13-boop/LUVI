"use client";

import { CATEGORY_EMOJI } from "@/lib/marketplace/category-visuals";
import { CATEGORY_GRADIENT } from "@/components/marketplace/product-image";
import { t } from "@/lib/i18n";
import type { Category } from "@/lib/marketplace/types";

const CATEGORIES = Object.keys(CATEGORY_EMOJI) as Category[];

/**
 * Visual category tiles — the exact same emoji + gradient a resulting
 * product card will render (Section 17: "no recommendation-engine jargon
 * exposed to sellers"), so picking a category feels like picking a look,
 * not filling out a taxonomy field. Backs a plain `name="category"` radio
 * group so it works inside a normal <form> with no client JS required to
 * submit, same as every other field in these forms.
 */
export function CategoryPicker({ defaultValue }: { defaultValue?: Category }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t.seller.productCategoryLabel}>
      {CATEGORIES.map((category) => (
        <label key={category} className="group">
          <input
            type="radio"
            name="category"
            value={category}
            defaultChecked={defaultValue ? category === defaultValue : category === CATEGORIES[0]}
            className="peer sr-only"
          />
          <div
            className={`flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-br ${CATEGORY_GRADIENT[category]} p-3 text-center ring-2 ring-transparent peer-checked:ring-fucsia peer-focus-visible:ring-fucsia`}
          >
            <span className="text-2xl" aria-hidden>
              {CATEGORY_EMOJI[category]}
            </span>
            <span className="line-clamp-1 text-[11px] font-semibold text-charcoal">{t.category[category]}</span>
          </div>
        </label>
      ))}
    </div>
  );
}
