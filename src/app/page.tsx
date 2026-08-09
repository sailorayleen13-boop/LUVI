import { Header } from "@/components/layout/header";
import { DiscoverySection } from "@/components/home/discovery-section";
import {
  getByCategory,
  getJustDropped,
  getMostLuvid,
  getNewArrivals,
  getTrending,
} from "@/lib/queries";

export default function Home() {
  return (
    <>
      <Header />

      <main className="flex flex-col gap-7 pb-8 pt-1">
        <div className="px-4">
          <p className="text-[13px] font-medium text-charcoal-soft">
            Buscá algo que vas a{" "}
            <span className="font-display font-semibold text-fucsia-dark">
              LUVI
            </span>{" "}
            hoy 💗
          </p>
        </div>

        <DiscoverySection
          title="Trending Now"
          subtitle="Lo que todos están viendo en TikTok rn."
          href="/trending"
          products={getTrending()}
        />

        <DiscoverySection
          title="Just Dropped"
          subtitle="Recién llegó. Corré antes que se agote."
          href="/trending"
          products={getJustDropped()}
        />

        <DiscoverySection
          title="Most LUVI'd"
          subtitle="Los favoritos de la comunidad."
          href="/trending"
          products={getMostLuvid()}
        />

        <DiscoverySection
          title="Squishies"
          subtitle="La colección que nos hizo empezar."
          href="/c/squishies"
          products={getByCategory("squishies")}
        />

        <DiscoverySection
          title="Pet Finds"
          subtitle="Para consentir a tu mejor amigo."
          href="/c/pets"
          products={getByCategory("pets")}
        />

        <DiscoverySection
          title="Cute Finds"
          subtitle="Para tu cuarto, tu depa, tu vida."
          href="/c/home"
          products={getByCategory("home")}
        />

        <DiscoverySection
          title="New Arrivals"
          subtitle="Lo más nuevo en LUVI."
          href="/trending"
          products={getNewArrivals()}
        />
      </main>
    </>
  );
}
