/** Distances routières approximatives jusqu'au Bourget (km) et axe d'arrivée. */
export type AxisId = "nord" | "normandie" | "ouest" | "sud" | "est" | "idf";

export interface City {
  name: string;
  km: number;
  axis: AxisId;
}

export const CITIES: City[] = [
  { name: "Paris", km: 15, axis: "idf" },
  { name: "Saint-Denis", km: 7, axis: "idf" },
  { name: "Versailles", km: 35, axis: "idf" },
  { name: "Créteil", km: 25, axis: "idf" },
  { name: "Cergy", km: 35, axis: "idf" },
  { name: "Évry-Courcouronnes", km: 45, axis: "idf" },
  { name: "Meaux", km: 35, axis: "est" },
  { name: "Melun", km: 60, axis: "sud" },
  { name: "Beauvais", km: 75, axis: "nord" },
  { name: "Compiègne", km: 75, axis: "nord" },
  { name: "Amiens", km: 130, axis: "nord" },
  { name: "Saint-Quentin", km: 145, axis: "nord" },
  { name: "Arras", km: 175, axis: "nord" },
  { name: "Lille", km: 210, axis: "nord" },
  { name: "Valenciennes", km: 200, axis: "nord" },
  { name: "Dunkerque", km: 280, axis: "nord" },
  { name: "Calais", km: 280, axis: "nord" },
  { name: "Rouen", km: 135, axis: "normandie" },
  { name: "Évreux", km: 105, axis: "normandie" },
  { name: "Le Havre", km: 200, axis: "normandie" },
  { name: "Caen", km: 240, axis: "normandie" },
  { name: "Cherbourg", km: 360, axis: "normandie" },
  { name: "Chartres", km: 100, axis: "ouest" },
  { name: "Orléans", km: 140, axis: "ouest" },
  { name: "Le Mans", km: 215, axis: "ouest" },
  { name: "Tours", km: 245, axis: "ouest" },
  { name: "Angers", km: 300, axis: "ouest" },
  { name: "Rennes", km: 360, axis: "ouest" },
  { name: "Nantes", km: 390, axis: "ouest" },
  { name: "Poitiers", km: 345, axis: "ouest" },
  { name: "Limoges", km: 400, axis: "ouest" },
  { name: "Brest", km: 600, axis: "ouest" },
  { name: "Bordeaux", km: 590, axis: "ouest" },
  { name: "La Rochelle", km: 480, axis: "ouest" },
  { name: "Auxerre", km: 175, axis: "sud" },
  { name: "Bourges", km: 255, axis: "sud" },
  { name: "Dijon", km: 320, axis: "sud" },
  { name: "Clermont-Ferrand", km: 430, axis: "sud" },
  { name: "Lyon", km: 475, axis: "sud" },
  { name: "Saint-Étienne", km: 530, axis: "sud" },
  { name: "Grenoble", km: 580, axis: "sud" },
  { name: "Valence", km: 575, axis: "sud" },
  { name: "Avignon", km: 700, axis: "sud" },
  { name: "Marseille", km: 785, axis: "sud" },
  { name: "Toulon", km: 845, axis: "sud" },
  { name: "Nice", km: 940, axis: "sud" },
  { name: "Montpellier", km: 760, axis: "sud" },
  { name: "Nîmes", km: 715, axis: "sud" },
  { name: "Perpignan", km: 860, axis: "sud" },
  { name: "Toulouse", km: 690, axis: "sud" },
  { name: "Pau", km: 790, axis: "ouest" },
  { name: "Bayonne", km: 780, axis: "ouest" },
  { name: "Reims", km: 135, axis: "est" },
  { name: "Troyes", km: 175, axis: "est" },
  { name: "Châlons-en-Champagne", km: 175, axis: "est" },
  { name: "Metz", km: 320, axis: "est" },
  { name: "Nancy", km: 330, axis: "est" },
  { name: "Strasbourg", km: 480, axis: "est" },
  { name: "Mulhouse", km: 470, axis: "est" },
  { name: "Besançon", km: 400, axis: "est" },
  { name: "Charleville-Mézières", km: 220, axis: "est" },
];

export function findCity(name: string): City | undefined {
  const n = normalize(name);
  return CITIES.find((c) => normalize(c.name) === n);
}

export function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
