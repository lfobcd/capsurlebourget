import { PRICING } from "@/config/event";

/** Plafond strict par place : 0,08 €/km/passager, jamais plus de 45 €. */
export function priceCap(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  const raw = Math.round(distanceKm * PRICING.capPerKm * 100) / 100;
  return Math.min(raw, PRICING.absoluteCap);
}

export interface FairPriceInput {
  distanceKm: number;
  fuelPrice: number;
  consumption: number;
  toll: number;
  occupants: number;
}

export interface FairPriceResult {
  fuelCost: number;
  totalCost: number;
  perPerson: number;
  cap: number;
  suggested: number;
  capped: boolean;
}

/** Coût réel par personne (carburant + péage, partagé entre tous les occupants), puis plafonné. */
export function computeFairPrice(input: FairPriceInput): FairPriceResult {
  const distance = Math.max(0, input.distanceKm || 0);
  const occupants = Math.max(1, Math.floor(input.occupants || 1));
  const fuelCost = (distance * Math.max(0, input.consumption || 0) * Math.max(0, input.fuelPrice || 0)) / 100;
  const totalCost = fuelCost + Math.max(0, input.toll || 0);
  const perPerson = round2(totalCost / occupants);
  const cap = priceCap(distance);
  const suggested = Math.min(perPerson, cap);
  return {
    fuelCost: round2(fuelCost),
    totalCost: round2(totalCost),
    perPerson,
    cap,
    suggested: round2(suggested),
    capped: perPerson > cap,
  };
}

export function exceedsCap(price: number, distanceKm: number) {
  return price > priceCap(distanceKm) + 1e-9;
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function formatEuro(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}
