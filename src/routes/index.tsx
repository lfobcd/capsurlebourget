import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Car, MapPin, Search, Train, Users, HandHeart, MessageCircle, Clock } from "lucide-react";
import { EVENT } from "@/config/event";
import { CITIES } from "@/config/cities";
import { ratingsQuery, upcomingTripsQuery, useTripsRealtime } from "@/lib/data";
import { CostReminder, EarlyTip, EmptyState, FadeIn } from "@/components/common";
import { TripCard, TripCardSkeleton } from "@/components/TripCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cap sur le Bourget — Covoiturage citoyen pour le 7 novembre" },
      {
        name: "description",
        content: "Trouve ou propose un covoiturage solidaire pour la Convention & Grand Meeting du 7 novembre 2026 au Parc des expositions Paris Le Bourget.",
      },
      { property: "og:title", content: "Cap sur le Bourget — Covoiturage citoyen" },
      { property: "og:description", content: "Covoiturage solidaire et bénévole pour rejoindre le grand meeting du 7 novembre au Bourget." },
    ],
  }),
  component: Home,
});

function Home() {
  useTripsRealtime();
  const navigate = useNavigate();
  const [ville, setVille] = useState("");
  const [date, setDate] = useState(EVENT.dateISO);
  const [places, setPlaces] = useState(1);
  const { data: trips, isLoading } = useQuery(upcomingTripsQuery());
  const preview = (trips ?? []).filter((t) => t.seats_available > 0).slice(0, 3);
  const { data: ratings } = useQuery(ratingsQuery(preview.map((t) => t.driver_id)));

  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-10 lg:px-6 lg:pt-20">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 label-mono text-primary-glow">
                {EVENT.dateLabel}
              </span>
              <span className="rounded-full border border-hairline px-3 py-1 label-mono text-muted-foreground">{EVENT.price}</span>
            </div>
            <h1 className="title-display mt-6 text-5xl sm:text-7xl lg:text-8xl">
              Cap sur <span className="text-crimson">le Bourget</span>
            </h1>
            <p className="mt-6 max-w-3xl font-display text-xl font-semibold uppercase tracking-tight text-foreground/90 sm:text-2xl">
              {EVENT.title}
            </p>
            <p className="mt-2 text-muted-foreground">avec {EVENT.speaker}</p>
          </motion.div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Quick search */}
            <motion.form
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-5 sm:p-6"
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/trajets", search: { ville: ville || undefined, date: date || undefined, places: places > 1 ? places : undefined } });
              }}
            >
              <p className="label-mono text-muted-foreground">Recherche rapide</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-[1.5fr_1fr_0.7fr]">
                <div className="grid gap-1.5">
                  <Label htmlFor="q-ville">Ville de départ</Label>
                  <Input id="q-ville" list="home-cities" placeholder="Ex. Lille, Rouen…" value={ville} onChange={(e) => setVille(e.target.value)} />
                  <datalist id="home-cities">
                    {CITIES.map((c) => (
                      <option key={c.name} value={c.name} />
                    ))}
                  </datalist>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="q-date">Date</Label>
                  <Input id="q-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="q-places">Places</Label>
                  <Input id="q-places" type="number" min={1} max={8} value={places} onChange={(e) => setPlaces(Math.max(1, Math.min(8, Number(e.target.value) || 1)))} />
                </div>
              </div>
              <Button type="submit" size="lg" className="mt-5 w-full">
                <Search /> Trouver un trajet
              </Button>
              <EarlyTip className="mt-4" />
            </motion.form>

            {/* Event card */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card glass-card-active p-5 sm:p-6">
              <p className="label-mono text-primary-glow">Infos pratiques</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-hairline bg-background/50 p-3">
                  <p className="label-mono text-muted-foreground">Portes</p>
                  <p className="font-numeric text-5xl leading-none">{EVENT.doorsOpen}</p>
                </div>
                <div className="rounded-xl border border-hairline bg-background/50 p-3">
                  <p className="label-mono text-muted-foreground">Début</p>
                  <p className="font-numeric text-5xl leading-none text-primary-glow">{EVENT.start}</p>
                </div>
              </div>
              <ul className="mt-5 grid gap-3 text-sm">
                <li className="flex gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary-glow" />
                  {EVENT.dateLabel}
                </li>
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-glow" />
                  <span>
                    {EVENT.venue.name}, {EVENT.venue.hall}
                    <br />
                    <span className="text-muted-foreground">
                      {EVENT.venue.address}, {EVENT.venue.postcode} {EVENT.venue.city}
                    </span>
                  </span>
                </li>
                {EVENT.venue.access.map((a) => (
                  <li key={a.mode} className="flex gap-3">
                    {a.mode === "RER" ? <Train className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : <Car className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="text-muted-foreground">{a.label}</span>
                  </li>
                ))}
              </ul>
              <a href={EVENT.venue.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary-glow hover:underline">
                Ouvrir dans une carte <ArrowRight className="h-4 w-4" />
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <FadeIn>
          <p className="label-mono text-primary-glow">Comment ça marche</p>
          <h2 className="title-display mt-3 text-4xl sm:text-5xl">
            Trois étapes, <span className="text-crimson">zéro profit</span>
          </h2>
        </FadeIn>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { n: "01", icon: Search, t: "Trouve ton trajet", d: "Cherche depuis ta ville, filtre par ambiance, accessibilité ou horaire." },
            { n: "02", icon: MessageCircle, t: "Réserve & échange", d: "Envoie ta demande, discute avec le ou la conducteur·rice. Le numéro s'affiche une fois confirmé." },
            { n: "03", icon: HandHeart, t: "Partage les frais", d: "Carburant et péage seulement, de la main à la main. Ensemble, cap sur le Bourget !" },
          ].map((s, i) => (
            <FadeIn key={s.n} delay={i * 0.08}>
              <div className="glass-card h-full p-6">
                <div className="flex items-center justify-between">
                  <s.icon className="h-6 w-6 text-primary-glow" />
                  <span className="font-numeric text-6xl leading-none text-foreground/10">{s.n}</span>
                </div>
                <h3 className="mt-4 font-display text-xl font-bold uppercase tracking-tight">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* UPCOMING */}
      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <FadeIn>
            <p className="label-mono text-primary-glow">Prochains départs</p>
            <h2 className="title-display mt-3 text-4xl sm:text-5xl">Les trajets du convoi</h2>
          </FadeIn>
          <Button asChild variant="outline">
            <Link to="/trajets">
              Tous les trajets <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading && [0, 1, 2].map((i) => <TripCardSkeleton key={i} />)}
          {!isLoading && preview.map((t) => <TripCard key={t.id} trip={t} rating={ratings?.[t.driver_id]} />)}
        </div>
        {!isLoading && preview.length === 0 && (
          <EmptyState icon={<Car className="h-6 w-6" />} title="Aucun trajet pour l'instant">
            Le convoi commence avec toi : sois la première ou le premier à proposer des places depuis ta ville.
          </EmptyState>
        )}
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <FadeIn>
          <div className="glass-card glass-card-active relative overflow-hidden p-8 sm:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="label-mono text-primary-glow">Tu as une voiture ?</p>
                <h2 className="title-display mt-3 text-4xl sm:text-6xl">
                  Remplis tes <span className="text-crimson">sièges vides</span>
                </h2>
                <p className="mt-4 max-w-xl text-muted-foreground">
                  Chaque place partagée, c'est une personne de plus au meeting et une voiture de moins sur la route. Le calculateur fixe pour toi un prix juste, plafonné.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link to="/proposer">
                      <Users /> Proposer un trajet
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/calculateur">Calculer un prix juste</Link>
                  </Button>
                </div>
              </div>
              <div className="grid gap-3">
                <EarlyTip />
                <CostReminder />
                <div className="flex items-center gap-3 rounded-xl border border-hairline bg-card/60 px-4 py-3 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0 text-primary-glow" />
                  Début du meeting à {EVENT.start} — vise une arrivée avant {EVENT.doorsOpen} pour être bien placé·e.
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </main>
  );
}
