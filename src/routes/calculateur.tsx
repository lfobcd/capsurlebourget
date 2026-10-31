import { createFileRoute, Link } from "@tanstack/react-router";
import { CITIES } from "@/config/cities";
import { PRICING } from "@/config/event";
import { formatEuro, priceCap } from "@/lib/pricing";
import { CostReminder, Page, PageHeader } from "@/components/common";
import { PriceCalculator } from "@/components/PriceCalculator";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/calculateur")({
  head: () => ({
    meta: [
      { title: "Calculateur de prix juste — Cap sur le Bourget" },
      { name: "description", content: "Calcule le partage réel des frais de carburant et de péage jusqu'au Bourget, plafonné à 0,08 € par km et par passager." },
      { property: "og:title", content: "Calculateur de prix juste — Cap sur le Bourget" },
      { property: "og:description", content: "Partage des coûts réels, plafond strict : aucun bénéfice." },
    ],
  }),
  component: CalcPage,
});

function CalcPage() {
  const sample = [...CITIES].sort((a, b) => a.km - b.km).filter((_, i) => i % 3 === 0).slice(0, 18);
  return (
    <Page>
      <PageHeader eyebrow="Prix juste" title="Calculateur de" highlight="prix juste">
        Le covoiturage citoyen, c'est partager les frais réels — jamais en tirer un bénéfice. Plafond strict : {PRICING.capPerKm.toFixed(2).replace(".", ",")} € par km et par
        passager, et jamais plus de {PRICING.absoluteCap} €.
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          <PriceCalculator />
          <CostReminder />
        </div>
        <aside className="glass-card h-fit p-5">
          <p className="label-mono text-warning-strong">Plafonds indicatifs</p>
          <ul className="mt-4 divide-y divide-hairline text-sm">
            {sample.map((c) => (
              <li key={c.name} className="flex items-center justify-between py-2">
                <span>
                  {c.name} <span className="text-muted-foreground">· {c.km} km</span>
                </span>
                <span className="font-numeric text-xl">{formatEuro(priceCap(c.km))}</span>
              </li>
            ))}
          </ul>
          <Button asChild className="mt-5 w-full">
            <Link to="/proposer">Proposer un trajet</Link>
          </Button>
        </aside>
      </div>
    </Page>
  );
}
