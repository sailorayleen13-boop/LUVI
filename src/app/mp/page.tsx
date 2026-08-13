import { getAllMerchants, getAllProducts } from "@/lib/marketplace/queries";
import { ProductCard } from "@/components/marketplace/product-card";

// Temporary flat review surface for Phase 2 — not linked from nav. Lets us
// see ProductCard across every category/availability state without having
// rebuilt Home's discovery sections yet (that's Phase 3+).
export default function MarketplacePreviewPage() {
  const products = getAllProducts();
  const merchants = new Map(getAllMerchants().map((m) => [m.id, m]));

  return (
    <main className="flex flex-col gap-4 px-4 py-4">
      <div>
        <h1 className="font-display text-xl font-bold text-charcoal">
          Marketplace preview (Phase 2)
        </h1>
        <p className="text-[12.5px] text-charcoal-faint">
          {products.length} productos · {merchants.size} tiendas — no enlazado desde la navegación todavía.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-5">
        {products.map((product) => {
          const merchant = merchants.get(product.merchantId);
          if (!merchant) return null;
          return <ProductCard key={product.id} product={product} merchant={merchant} />;
        })}
      </div>
    </main>
  );
}
