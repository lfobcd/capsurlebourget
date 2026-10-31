import type { AxisId } from "./cities";

export interface Axis {
  id: AxisId;
  name: string;
  roads: string;
  cities: string[];
  avgKm: string;
  avgDuration: string;
  departure: string;
  toll: string;
  rally: string;
  tip: string;
  /** Position sur la carte schématique (0–100) */
  x: number;
  y: number;
}

export const AXES: Axis[] = [
  {
    id: "nord",
    name: "Nord",
    roads: "A1 / A26",
    cities: ["Lille", "Arras", "Amiens", "Dunkerque", "Calais"],
    avgKm: "130 – 280 km",
    avgDuration: "1h30 – 3h00",
    departure: "Entre 9h00 et 10h30",
    toll: "≈ 10 – 22 €",
    rally: "Aire de Vémars (A1) avant la sortie 5",
    tip: "L'A1 est l'accès direct : sortie 5 « Le Bourget ». Attention aux bouchons à l'approche de Roissy.",
    x: 52,
    y: 10,
  },
  {
    id: "normandie",
    name: "Normandie",
    roads: "A13 / A15",
    cities: ["Rouen", "Le Havre", "Caen", "Évreux"],
    avgKm: "105 – 360 km",
    avgDuration: "1h30 – 4h00",
    departure: "Entre 8h00 et 10h30",
    toll: "≈ 8 – 25 €",
    rally: "Aire de Morainvilliers (A13)",
    tip: "Rejoins l'A86 puis l'A1 nord ; évite le périphérique en début d'après-midi.",
    x: 22,
    y: 26,
  },
  {
    id: "ouest",
    name: "Ouest",
    roads: "A11 / A10",
    cities: ["Nantes", "Rennes", "Le Mans", "Tours", "Bordeaux"],
    avgKm: "215 – 600 km",
    avgDuration: "2h30 – 6h00",
    departure: "Entre 6h30 et 10h00",
    toll: "≈ 20 – 55 €",
    rally: "Aire de Limours-Janvry (A10)",
    tip: "Prends l'A86 ou la Francilienne (N104) pour contourner Paris par l'est.",
    x: 12,
    y: 55,
  },
  {
    id: "sud",
    name: "Sud",
    roads: "A6 / A10 / A71",
    cities: ["Lyon", "Dijon", "Clermont-Ferrand", "Marseille", "Toulouse"],
    avgKm: "320 – 940 km",
    avgDuration: "3h30 – 9h00",
    departure: "Veille au soir ou avant 6h00",
    toll: "≈ 30 – 75 €",
    rally: "Aire de Nemours (A6)",
    tip: "Pour les longues distances, partage la conduite et prévois une pause toutes les 2 heures.",
    x: 50,
    y: 88,
  },
  {
    id: "est",
    name: "Est",
    roads: "A4 / A5",
    cities: ["Reims", "Metz", "Nancy", "Strasbourg", "Troyes"],
    avgKm: "135 – 480 km",
    avgDuration: "1h30 – 5h00",
    departure: "Entre 7h00 et 10h30",
    toll: "≈ 10 – 40 €",
    rally: "Aire de Ferrières (A4)",
    tip: "Depuis l'A4, rejoins l'A104 puis l'A1 : itinéraire plus fluide que l'A3.",
    x: 85,
    y: 40,
  },
  {
    id: "idf",
    name: "Île-de-France",
    roads: "A1 / A3 / A86 / RER B",
    cities: ["Paris", "Saint-Denis", "Créteil", "Versailles", "Cergy"],
    avgKm: "7 – 45 km",
    avgDuration: "20 – 60 min",
    departure: "Entre 11h30 et 12h30",
    toll: "Aucun",
    rally: "Gare RER B du Bourget",
    tip: "Le RER B reste souvent le plus rapide ; en voiture, partage au maximum pour limiter le stationnement.",
    x: 50,
    y: 45,
  },
];

export function getAxis(id: string | undefined) {
  return AXES.find((a) => a.id === id);
}
