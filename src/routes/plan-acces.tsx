import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CITIES, normalize } from "@/config/cities";
import { AXES } from "@/config/axes";
import { upcomingTripsQuery, ratingsQuery } from "@/lib/data";
import { EarlyTip, EmptyState, Page, PageHeader } from "@/components/common";
import { TripCard } from "@/components/TripCard";
import { Button } from "@/components/ui/button";
import { Car } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plan-acces")({
  head: () => ({
    meta: [
      { title: "Plan d'accès France vers le Bourget — Cap sur le Bourget" },
      { name: "description", content: "Les grands axes vers le Bourget (A1, A13, A10, A6, A4) : distances, durées, péages, points de ralliement et conseils." },
      { property: "og:title", content: "Plan d'accès France — Cap sur le Bourget" },
      { property: "og:description", content: "Choisis ton axe et trouve les trajets qui l'empruntent." },
    ],
  }),
  component: MapPage,
});

const CENTER = { x: 50, y: 32 };

function MapPage() {
  const [sel, setSel] = useState<string>(AXES[0]!.id);
  const axis = (AXES.find((a) => a.id === sel) ?? AXES[0])!;
  const { data: trips } = useQuery(upcomingTripsQuery());
  const axisCities = new Set(CITIES.filter((c) => c.axis === sel).map((c) => normalize(c.name)));
  const list = (trips ?? []).filter((t) => t.axis === sel || axisCities.has(normalize(t.departure_city)));
  const { data: ratings } = useQuery(ratingsQuery(Array.from(new Set(list.map((t) => t.driver_id)))));

  return (
    <Page>
      <PageHeader eyebrow="Plan d'accès" title="Tous les chemins mènent" highlight="au Bourget" />
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="glass-card p-4">
          <svg viewBox="0 0 100 100" className="w-full" role="img" aria-label="Carte schématique des grands axes vers le Bourget">
            <path d="M48 4 L62 8 L78 18 L92 30 L88 48 L84 62 L90 80 L74 94 L56 92 L40 96 L24 88 L18 72 L20 56 L6 46 L4 34 L22 30 L30 18 Z" className="fill-card-active stroke-hairline-strong" strokeWidth="0.5" />
            {AXES.filter((a) => a.id !== "idf").map((a) => (
              <g key={a.id} onClick={() => setSel(a.id)} className="cursor-pointer">
                <line x1={a.x} y1={a.y} x2={CENTER.x} y2={CENTER.y} strokeWidth={sel === a.id ? 2 : 1.2} strokeLinecap="round" className={sel === a.id ? "stroke-primary" : "stroke-muted-foreground/50 hover:stroke-foreground"} />
                <circle cx={a.x} cy={a.y} r={2.2} className={sel === a.id ? "fill-primary" : "fill-muted-foreground"} />
                <text x={a.x} y={a.y + (a.y > 50 ? 6 : -4)} textAnchor="middle" fontSize="3.6" className="fill-foreground font-bold uppercase">{a.name}</text>
              </g>
            ))}
            <circle cx={CENTER.x} cy={CENTER.y} r={3.5} className="fill-primary" onClick={() => setSel("idf")} />
            <text x={CENTER.x + 5} y={CENTER.y + 1.2} fontSize="3.2" className="fill-foreground font-bold">LE BOURGET</text>
          </svg>
          <div className="mt-3 flex flex-wrap gap-2">
            {AXES.map((a) => (
              <button key={a.id} onClick={() => setSel(a.id)} aria-pressed={sel === a.id} className={cn("rounded-full border px-3 py-1.5 text-xs", sel === a.id ? "border-primary/50 bg-primary/15" : "border-hairline text-muted-foreground")}>
                {a.name} · {a.roads}
              </button>
            ))}
          </div>
        </div>
        <div className="glass-card glass-card-active h-fit p-6">
          <p className="label-mono text-primary-glow">{axis.roads}</p>
          <h2 className="title-display mt-2 text-4xl">Axe {axis.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{axis.cities.join(" · ")}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            {[["Distance", axis.avgKm], ["Durée", axis.avgDuration], ["Départ conseillé", axis.departure], ["Péage estimé", axis.toll]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-hairline bg-background/50 p-3">
                <dt className="label-mono text-muted-foreground">{k}</dt>
                <dd className="mt-1 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm"><span className="label-mono text-muted-foreground">Ralliement · </span>{axis.rally}</p>
          <p className="mt-2 text-sm text-foreground/80">{axis.tip}</p>
          <EarlyTip className="mt-4" />
          <Button asChild className="mt-4 w-full">
            <Link to="/trajets" search={{ axe: axis.id }}>Voir les trajets de cet axe</Link>
          </Button>
        </div>
      </div>
      <h2 className="title-display mt-10 text-3xl">Trajets · axe {axis.name}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((t) => <TripCard key={t.id} trip={t} rating={ratings?.[t.driver_id]} />)}
      </div>
      {list.length === 0 && (
        <EmptyState icon={<Car className="h-6 w-6" />} title="Aucun trajet sur cet axe">Lance le premier convoi depuis ta ville !</EmptyState>
      )}
    </Page>
  );
}
