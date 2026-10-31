import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CITIES, findCity } from "@/config/cities";
import { EVENT, LUGGAGE, TRIP_TYPES, VIBES } from "@/config/event";
import { friendlyError, useAuth } from "@/lib/auth";
import { exceedsCap, formatEuro, priceCap } from "@/lib/pricing";
import { CostReminder, EarlyTip, Page, PageHeader, RequireAuth } from "@/components/common";
import { PriceCalculator } from "@/components/PriceCalculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/proposer")({
  head: () => ({
    meta: [
      { title: "Proposer un trajet vers le Bourget — Cap sur le Bourget" },
      { name: "description", content: "Partage tes places libres pour le meeting du 7 novembre : prix juste plafonné, règles de bord et ambiance." },
      { property: "og:title", content: "Proposer un covoiturage — Cap sur le Bourget" },
      { property: "og:description", content: "Remplis tes sièges vides et rejoins le convoi solidaire vers le Bourget." },
    ],
  }),
  component: () => (
    <Page>
      <PageHeader eyebrow="Conducteur·rice" title="Proposer un" highlight="trajet">
        Partage tes places libres. Le prix est plafonné pour rester un simple partage des frais.
      </PageHeader>
      <RequireAuth requireVerified reason="Connecte-toi pour proposer un trajet : c'est gratuit et ça prend une minute.">
        <ProposeForm />
      </RequireAuth>
    </Page>
  ),
});

const formSchema = z
  .object({
    departure_city: z.string().trim().min(2, "Indique ta ville de départ.").max(80),
    meeting_address: z.string().trim().min(3, "Indique une adresse de rendez-vous précise.").max(200),
    waypoints: z.array(z.string().trim().min(1).max(80)).max(10, "10 étapes maximum."),
    departure_at: z.string().min(1, "Indique la date et l'heure de départ."),
    return_at: z.string().optional(),
    trip_type: z.enum(["aller_retour", "aller", "retour"]),
    seats_total: z.number().int().min(1, "Au moins 1 place.").max(8, "8 places maximum."),
    vehicle: z.string().trim().max(80).optional(),
    price_per_seat: z.number().min(0, "Le prix ne peut pas être négatif."),
    distance_km: z.number().int().min(1, "Indique la distance (utilise le calculateur).").max(1500),
    description: z.string().trim().max(1000).optional(),
  })
  .superRefine((v, ctx) => {
    const dep = new Date(v.departure_at);
    const start = new Date(EVENT.startAtISO);
    if (isNaN(dep.getTime())) return ctx.addIssue({ code: "custom", path: ["departure_at"], message: "Date de départ invalide." });
    if (dep < new Date()) ctx.addIssue({ code: "custom", path: ["departure_at"], message: "Le départ doit être dans le futur." });
    if (v.trip_type !== "retour" && dep >= start)
      ctx.addIssue({ code: "custom", path: ["departure_at"], message: `Pour un aller, le départ doit précéder le début du meeting (${EVENT.start}).` });
    if (v.trip_type === "retour" && dep < start)
      ctx.addIssue({ code: "custom", path: ["departure_at"], message: "Pour un retour simple, le départ doit être après le début du meeting." });
    if (v.trip_type === "aller_retour") {
      if (!v.return_at) ctx.addIssue({ code: "custom", path: ["return_at"], message: "Indique l'heure de retour pour un aller-retour." });
      else if (new Date(v.return_at) <= start) ctx.addIssue({ code: "custom", path: ["return_at"], message: "Le retour doit être après le début du meeting." });
    }
    if (exceedsCap(v.price_per_seat, v.distance_km))
      ctx.addIssue({ code: "custom", path: ["price_per_seat"], message: `Prix au-dessus du plafond (${formatEuro(priceCap(v.distance_km))} pour ${v.distance_km} km).` });
  });

function ProposeForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState({
    departure_city: "",
    meeting_address: "",
    waypoints: "",
    departure_at: "2026-11-07T09:00",
    return_at: "2026-11-07T19:30",
    trip_type: "aller_retour" as keyof typeof TRIP_TYPES,
    seats_total: 3,
    vehicle: "",
    price_per_seat: 0,
    distance_km: 0,
    description: "",
    luggage: "cabin" as keyof typeof LUGGAGE,
    non_smoking: true,
    pets: false,
    pmr: false,
    music: true,
    vibes: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const up = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const cap = priceCap(f.distance_km);
  const overCap = f.distance_km > 0 && exceedsCap(f.price_per_seat, f.distance_km);
  const cityMatch = useMemo(() => findCity(f.departure_city), [f.departure_city]);

  const create = useMutation({
    mutationFn: async () => {
      const parsed = formSchema.safeParse({
        ...f,
        waypoints: f.waypoints.split(",").map((w) => w.trim()).filter(Boolean),
        return_at: f.trip_type === "aller_retour" ? f.return_at : undefined,
      });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
        setErrors(errs);
        throw new Error("Quelques champs sont à corriger.");
      }
      setErrors({});
      const v = parsed.data;
      const { data, error } = await supabase
        .from("trips")
        .insert({
          driver_id: user!.id,
          departure_city: v.departure_city,
          meeting_address: v.meeting_address,
          waypoints: v.waypoints,
          departure_at: new Date(v.departure_at).toISOString(),
          return_at: v.return_at ? new Date(v.return_at).toISOString() : null,
          trip_type: v.trip_type,
          seats_total: v.seats_total,
          seats_available: v.seats_total,
          vehicle: v.vehicle || null,
          price_per_seat: v.price_per_seat,
          distance_km: v.distance_km,
          description: v.description || null,
          luggage: f.luggage,
          non_smoking: f.non_smoking,
          pets: f.pets,
          pmr: f.pmr,
          music: f.music,
          vibes: f.vibes,
          axis: cityMatch?.axis ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      toast.success("Trajet publié !", { description: "Merci pour ta solidarité. Les demandes arriveront dans « Mes trajets »." });
      qc.invalidateQueries({ queryKey: ["trips"] });
      navigate({ to: "/trajets/$id", params: { id } });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const Err = ({ k }: { k: string }) => (errors[k] ? <p className="text-xs text-primary-glow">{errors[k]}</p> : null);

  return (
    <form
      className="grid gap-6 lg:grid-cols-[1fr_420px]"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
      noValidate
    >
      <div className="grid gap-6">
        <section className="glass-card grid gap-4 p-6">
          <h2 className="label-mono text-muted-foreground">Départ & itinéraire</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="p-city">Ville de départ *</Label>
              <Input id="p-city" list="p-cities" value={f.departure_city} onChange={(e) => up("departure_city", e.target.value)} placeholder="Ex. Lille" />
              <datalist id="p-cities">
                {CITIES.map((c) => (
                  <option key={c.name} value={c.name} />
                ))}
              </datalist>
              <Err k="departure_city" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-addr">Adresse de rendez-vous *</Label>
              <Input id="p-addr" value={f.meeting_address} onChange={(e) => up("meeting_address", e.target.value)} placeholder="Ex. Parking gare Lille-Flandres" />
              <Err k="meeting_address" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-way">Étapes intermédiaires (séparées par des virgules)</Label>
            <Input id="p-way" value={f.waypoints} onChange={(e) => up("waypoints", e.target.value)} placeholder="Ex. Arras, Péronne" />
            <Err k="waypoints" />
          </div>
        </section>

        <section className="glass-card grid gap-4 p-6">
          <h2 className="label-mono text-muted-foreground">Horaires</h2>
          <div>
            <Label>Type de trajet</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(Object.keys(TRIP_TYPES) as (keyof typeof TRIP_TYPES)[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    up("trip_type", k);
                    if (k === "retour") up("departure_at", "2026-11-07T19:30");
                    else if (f.trip_type === "retour") up("departure_at", "2026-11-07T09:00");
                  }}
                  aria-pressed={f.trip_type === k}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-xs font-semibold sm:text-sm",
                    f.trip_type === k ? "border-primary/50 bg-primary/15" : "border-hairline text-muted-foreground hover:border-hairline-strong",
                  )}
                >
                  {TRIP_TYPES[k]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="p-dep">{f.trip_type === "retour" ? "Départ du Bourget *" : "Départ aller *"}</Label>
              <Input id="p-dep" type="datetime-local" value={f.departure_at} onChange={(e) => up("departure_at", e.target.value)} />
              <Err k="departure_at" />
            </div>
            {f.trip_type === "aller_retour" && (
              <div className="grid gap-1.5">
                <Label htmlFor="p-ret">Départ retour *</Label>
                <Input id="p-ret" type="datetime-local" value={f.return_at} onChange={(e) => up("return_at", e.target.value)} />
                <Err k="return_at" />
              </div>
            )}
          </div>
          <EarlyTip />
        </section>

        <section className="glass-card grid gap-4 p-6">
          <h2 className="label-mono text-muted-foreground">Places, véhicule & prix</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="p-seats">Places (1 à 8) *</Label>
              <Input id="p-seats" type="number" min={1} max={8} value={f.seats_total} onChange={(e) => up("seats_total", Number(e.target.value))} />
              <Err k="seats_total" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-km">Distance (km) *</Label>
              <Input id="p-km" type="number" min={1} max={1500} value={f.distance_km || ""} onChange={(e) => up("distance_km", Number(e.target.value))} />
              <Err k="distance_km" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-price">Prix par place (€) *</Label>
              <Input
                id="p-price"
                type="number"
                min={0}
                step="0.5"
                value={f.price_per_seat}
                onChange={(e) => up("price_per_seat", Number(e.target.value.replace(",", ".")))}
                className={overCap ? "border-primary ring-1 ring-primary" : undefined}
                aria-invalid={overCap}
              />
              <Err k="price_per_seat" />
            </div>
          </div>
          {f.distance_km > 0 && (
            <p className={cn("flex items-center gap-2 text-xs", overCap ? "text-primary-glow" : "text-muted-foreground")}>
              {overCap && <AlertTriangle className="h-4 w-4" />}
              Plafond pour {f.distance_km} km : <strong>{formatEuro(cap)}</strong> par place
              {overCap && " — ton prix le dépasse, baisse-le ou applique le prix juste."}
            </p>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="p-veh">Véhicule</Label>
            <Input id="p-veh" value={f.vehicle} onChange={(e) => up("vehicle", e.target.value)} placeholder="Ex. Peugeot 308 grise" maxLength={80} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-desc">Description</Label>
            <Textarea id="p-desc" maxLength={1000} rows={4} value={f.description} onChange={(e) => up("description", e.target.value)} placeholder="Quelques mots sur le trajet, les pauses prévues, l'ambiance…" />
          </div>
        </section>

        <section className="glass-card grid gap-5 p-6">
          <h2 className="label-mono text-muted-foreground">Règles de bord</h2>
          <div>
            <Label>Bagages</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(Object.keys(LUGGAGE) as (keyof typeof LUGGAGE)[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={f.luggage === k}
                  onClick={() => up("luggage", k)}
                  className={cn("rounded-xl border px-3 py-2.5 text-left text-sm", f.luggage === k ? "border-primary/50 bg-primary/15" : "border-hairline text-muted-foreground hover:border-hairline-strong")}
                >
                  {LUGGAGE[k]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle label="🚭 Non-fumeur" checked={f.non_smoking} onChange={(v) => up("non_smoking", v)} />
            <Toggle label="🐾 Animaux acceptés" checked={f.pets} onChange={(v) => up("pets", v)} />
            <Toggle label="♿ Accessible PMR" checked={f.pmr} onChange={(v) => up("pmr", v)} />
            <Toggle label="🎧 Musique ou podcast" checked={f.music} onChange={(v) => up("music", v)} />
          </div>
          <div>
            <Label>Ambiance</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {VIBES.map((v) => {
                const on = f.vibes.includes(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => up("vibes", on ? f.vibes.filter((x) => x !== v.id) : [...f.vibes, v.id])}
                    className={cn("rounded-full border px-3 py-1.5 text-sm", on ? "border-primary/50 bg-primary/15" : "border-hairline text-muted-foreground hover:border-hairline-strong")}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <aside className="grid h-fit gap-4 lg:sticky lg:top-24">
        <PriceCalculator
          compact
          initialCity={f.departure_city}
          initialOccupants={Math.min(9, f.seats_total + 1)}
          onApply={(price, km) => {
            setF((p) => ({ ...p, price_per_seat: price, distance_km: km }));
            toast.success(`Prix juste appliqué : ${formatEuro(price)} par place.`);
          }}
        />
        <CostReminder />
        <Button type="submit" size="lg" disabled={create.isPending || overCap}>
          {create.isPending ? "Publication…" : "Publier mon trajet"}
        </Button>
      </aside>
    </form>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-hairline bg-background/40 px-4 py-3 text-sm">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
