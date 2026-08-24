import { getAllMerchants, getAllProducts } from "@/lib/marketplace/catalog";
import { SearchView } from "./search-view";

export default async function SearchPage() {
  const [merchants, products] = await Promise.all([getAllMerchants(), getAllProducts()]);
  return <SearchView merchants={merchants} products={products} />;
}
