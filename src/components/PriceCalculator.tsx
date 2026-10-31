import { useEffect, useMemo, useState } from "react";
import { Calculator, ShieldCheck } from "lucide-react";
import { CITIES, findCity } from "@/config/cities";
import { PRICING } from "@/config/event";
import { computeFairPrice, formatEuro } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  initialCity?: string;
  initialDistance?: number;
  initialOccupants?: number;
  onApply?: (price: number, distanceKm: number) => void;
  compact?: boolean;
}

export function PriceCalculator({ initialCity, initialDistance, initialOccupants = 4, onApply, compact }: Props) {
  const [city, setCity] = useState(initialCity ?? "");
  const [distance, setDistance] = useState<number>(initialDistance ?? findCity(initialCity ?? "")?.km ?? 0);
  const [fuel, setFuel] = useState<number>(PRICING.defaultFuelPrice);
  const [conso, setConso] = useState<number>(PRICING.defaultConsumption);
  const [toll, setToll] = useState<number>(0);
  const [occupants, setOccupants] = useState<number>(initialOccupants);

  useEffect(() => {
    const c = findCity(city);
    if (c) setDistance(c.km);
  }, [city]);

  useEffect(() => {
    if (initialCity !== undefined) setCity(initialCity);
  }, [initialCity]);

  const result = useMemo(
    () => computeFairPrice({ distanceKm: distance, fuelPrice: fuel, consumption: conso, toll, occupants }),
    [distance, fuel, conso, toll, occupants],
  );

  const num = (v: string) => (v === "" ? 0 : Number(v.replace(",", ".")));

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-warning/15 text-warning-strong">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <p className="label-mono text-warning-strong">Calculateur de prix juste</p>
          <p className="text-sm text-muted-foreground">Partage des coûts réels, rien de plus.</p>
        </div>
      </div>

      <div className={`mt-5 grid gap-4 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        <div className="grid gap-1.5">
          <Label htmlFor="calc-city">Ville de départ</Label>
          <Input id="calc-city" list="calc-cities" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex. Lille" />
          <datalist id="calc-cities">
            {CITIES.map((c) => (
              <option key={c.name} value={c.name} />
            ))}
          </datalist>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="calc-km">Distance (km)</Label>
          <Input id="calc-km" type="number" min={1} max={1500} value={distance || ""} onChange={(e) => setDistance(num(e.target.value))} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="calc-fuel">Carburant (€/L)</Label>
          <Input id="calc-fuel" type="number" step="0.01" min={0} value={fuel} onChange={(e) => setFuel(num(e.target.value))} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="calc-conso">Consommation (L/100 km)</Label>
          <Input id="calc-conso" type="number" step="0.1" min={0} value={conso} onChange={(e) => setConso(num(e.target.value))} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="calc-toll">Péage estimé (€, trajet)</Label>
          <Input id="calc-toll" type="number" step="0.5" min={0} value={toll} onChange={(e) => setToll(num(e.target.value))} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="calc-occ">Occupants (conducteur inclus)</Label>
          <Input id="calc-occ" type="number" min={1} max={9} value={occupants} onChange={(e) => setOccupants(Math.max(1, Math.min(9, num(e.target.value))))} />
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Coût total" value={formatEuro(result.totalCost)} />
        <Stat label="Coût réel / pers." value={formatEuro(result.perPerson)} />
        <Stat label="Plafond / place" value={formatEuro(result.cap)} tone="amber" />
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-success/25 bg-success/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-success-strong" />
          <div>
            <p className="label-mono text-success-strong">Prix juste suggéré</p>
            <p className="font-numeric text-4xl leading-none">{formatEuro(result.suggested)}</p>
          </div>
        </div>
        {onApply && (
          <Button type="button" variant="success" onClick={() => onApply(result.suggested, Math.round(distance))} disabled={distance <= 0}>
            Appliquer ce prix
          </Button>
        )}
      </div>
      {result.capped && (
        <p className="mt-3 text-xs text-warning-strong">
          Le coût réel dépasse le plafond : le prix est ramené à {formatEuro(result.cap)} (0,08 €/km/passager, 45 € maximum).
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "amber" }) {
  return (
    <div className="rounded-xl border border-hairline bg-background/50 p-3">
      <p className={`label-mono ${tone === "amber" ? "text-warning-strong" : "text-muted-foreground"}`}>{label}</p>
      <p className="mt-1 font-numeric text-2xl leading-none">{value}</p>
    </div>
  );
}
