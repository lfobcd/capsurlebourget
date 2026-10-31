import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Car, SlidersHorizontal, X } from "lucide-react";
import { CITIES, normalize } from "@/config/cities";
import { AXES, getAxis } from "@/config/axes";
import { TRIP_TYPES } from "@/config/event";
import { ratingsQuery, upcomingTripsQuery, useTripsRealtime } from "@/lib/data";
import { fmtDateKey } from "@/lib/format";
import { EarlyTip, EmptyState, Page, PageHeader } from "@/components/common";
import { TripCard, TripCardSkeleton } from "@/components/TripCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  ville: z.string().max(80).optional(),
  date: z.string().max(10).optional(),
  places: z.coerce.number().int().min(1).max(8).optional(),
  type: z.enum(["aller_retour", "aller", "retour"]).optional(),
  pmr: z.coerce.boolean().optional(),
  nonfumeur: z.coerce.boolean().optional(),
  cafe: z.coerce.boolean().optional(),
  axe: z.string().max(20).optional(),
  tri: z.enum(["heure", "prix", "places"]).optional(),
});

export const Route = createFileRoute("/trajets/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Trouver un covoiturage vers le Bourget — Cap sur le Bourget" },
      { name: "description", content: "Tous les trajets solidaires vers le meeting du 7 novembre au Bourget : filtre par ville, date, accessibilité et ambiance." },
      { property: "og:title", content: "Trajets vers le Bourget — Cap sur le Bourget" },
      { property: "og:description", content: "Trouve une place dans un covoiturage citoyen pour le 7 novembre." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  useTripsRealtime();
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/trajets/" });
  const set = (patch: Partial<typeof s>) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const { data: trips, isLoading } = useQuery(upcomingTripsQuery());
  const axis = getAxis(s.axe);

  const results = useMemo(() => {
    let list = trips ?? [];
    if (s.ville) {
      const q = normalize(s.ville);
      list = list.filter((t) => normalize(t.departure_city).includes(q) || t.waypoints.some((w) => normalize(w).includes(q)));
    }
    if (s.date) list = list.filter((t) => fmtDateKey(t.departure_at) === s.date);
    if (s.places) list = list.filter((t) => t.seats_available >= s.places!);
    if (s.type) list = list.filter((t) => t.trip_type === s.type);
    if (s.pmr) list = list.filter((t) => t.pmr);
    if (s.nonfumeur) list = list.filter((t) => t.non_smoking);
    if (s.cafe) list = list.filter((t) => t.vibes.includes("cafe"));
    if (axis) {
      const axisCities = new Set(CITIES.filter((c) => c.axis === axis.id).map((c) => normalize(c.name)));
      list = list.filter((t) => t.axis === axis.id || axisCities.has(normalize(t.departure_city)));
    }
    const sorted = [...list];
    if (s.tri === "prix") sorted.sort((a, b) => Number(a.price_per_seat) - Number(b.price_per_seat));
    else if (s.tri === "places") sorted.sort((a, b) => b.seats_available - a.seats_available);
    else sorted.sort((a, b) => a.departure_at.localeCompare(b.departure_at));
    return sorted;
  }, [trips, s, axis]);

  const { data: ratings } = useQuery(ratingsQuery(Array.from(new Set(results.map((t) => t.driver_id)))));
  const hasFilters = !!(s.ville || s.date || s.places || s.type || s.pmr || s.nonfumeur || s.cafe || s.axe);

  const chip = (active: boolean, label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "border-primary/50 bg-primary/15 text-foreground" : "border-hairline text-muted-foreground hover:border-hairline-strong hover:text-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <Page>
      <PageHeader eyebrow="Recherche" title="Trouve ton" highlight="trajet">
        Tous les covoiturages solidaires vers le Bourget, mis à jour en temps réel.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="glass-card h-fit p-5 lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <p className="label-mono flex items-center gap-2 text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filtres
            </p>
            {hasFilters && (
              <button className="text-xs text-primary-glow hover:underline" onClick={() => navigate({ search: { tri: s.tri }, replace: true })}>
                Réinitialiser
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="f-ville">Ville de départ</Label>
              <Input id="f-ville" list="f-cities" value={s.ville ?? ""} placeholder="Toutes" onChange={(e) => set({ ville: e.target.value || undefined })} />
              <datalist id="f-cities">
                {CITIES.map((c) => (
                  <option key={c.name} value={c.name} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="f-date">Date</Label>
                <Input id="f-date" type="date" value={s.date ?? ""} onChange={(e) => set({ date: e.target.value || undefined })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="f-places">Places</Label>
                <Input id="f-places" type="number" min={1} max={8} value={s.places ?? ""} placeholder="1" onChange={(e) => set({ places: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
            </div>
            <div>
              <Label>Type de trajet</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {chip(!s.type, "Tous", () => set({ type: undefined }))}
                {(Object.keys(TRIP_TYPES) as (keyof typeof TRIP_TYPES)[]).map((k) => chip(s.type === k, TRIP_TYPES[k], () => set({ type: s.type === k ? undefined : k })))}
              </div>
            </div>
            <div>
              <Label>Options</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {chip(!!s.pmr, "♿ Accessible PMR", () => set({ pmr: s.pmr ? undefined : true }))}
                {chip(!!s.nonfumeur, "🚭 Non-fumeur", () => set({ nonfumeur: s.nonfumeur ? undefined : true }))}
                {chip(!!s.cafe, "☕ Café à bord", () => set({ cafe: s.cafe ? undefined : true }))}
              </div>
            </div>
            <div>
              <Label>Axe d'arrivée</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {AXES.map((a) => chip(s.axe === a.id, a.name, () => set({ axe: s.axe === a.id ? undefined : a.id })))}
              </div>
            </div>
          </div>
        </aside>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{results.length}</span> trajet{results.length > 1 ? "s" : ""}
              {axis && (
                <button onClick={() => set({ axe: undefined })} className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary-glow">
                  Axe {axis.name} <X className="h-3 w-3" />
                </button>
              )}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="label-mono text-muted-foreground">Trier</span>
              {chip(!s.tri || s.tri === "heure", "Heure", () => set({ tri: undefined }))}
              {chip(s.tri === "prix", "Prix", () => set({ tri: "prix" }))}
              {chip(s.tri === "places", "Places", () => set({ tri: "places" }))}
            </div>
          </div>
          <EarlyTip className="mb-4" />
          <div className="grid gap-4 xl:grid-cols-2">
            {isLoading && [0, 1, 2, 3].map((i) => <TripCardSkeleton key={i} />)}
            {!isLoading && results.map((t) => <TripCard key={t.id} trip={t} rating={ratings?.[t.driver_id]} />)}
          </div>
          {!isLoading && results.length === 0 && (
            <EmptyState icon={<Car className="h-6 w-6" />} title={hasFilters ? "Aucun trajet ne correspond" : "Pas encore de trajet"}>
              <p>
                {hasFilters
                  ? "Élargis tes critères, ou lance toi-même un trajet depuis ta ville : d'autres suivront !"
                  : "Le convoi démarre à peine. Propose le premier trajet depuis ta ville !"}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {hasFilters && (
                  <Button variant="outline" onClick={() => navigate({ search: {}, replace: true })}>
                    Effacer les filtres
                  </Button>
                )}
                <Button asChild>
                  <Link to="/proposer">Proposer un trajet</Link>
                </Button>
              </div>
            </EmptyState>
          )}
        </section>
      </div>
    </Page>
  );
}
