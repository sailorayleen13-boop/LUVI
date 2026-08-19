import { getAllMerchants, getAllProducts } from "@/lib/marketplace/catalog";
import { ExploreView } from "./explore-view";

export default async function ExplorePage() {
  const [merchants, products] = await Promise.all([getAllMerchants(), getAllProducts()]);
  return <ExploreView merchants={merchants} products={products} />;
}
