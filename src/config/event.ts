/**
 * Configuration centrale de l'événement et des textes légaux.
 * Modifie ce fichier pour changer le nom, la date, les horaires, le lieu
 * ou les mentions — tout le site s'y réfère.
 */
export const EVENT = {
  siteName: "Cap sur le Bourget",
  siteTagline: "Plateforme citoyenne solidaire · 100 % bénévole",
  shortBadge: "7 NOV",
  logoMark: "7N",
  title: "Convention & Grand Meeting – Présentation de L'Avenir en commun",
  speaker: "Jean-Luc Mélenchon",
  /** Date ISO (heure de Paris) */
  dateISO: "2026-11-07",
  dateLabel: "Samedi 7 novembre 2026",
  doorsOpen: "13h00",
  start: "15h00",
  /** Début du meeting, utilisé pour les validations de dates (heure de Paris, UTC+1 en novembre) */
  startAtISO: "2026-11-07T15:00:00+01:00",
  doorsAtISO: "2026-11-07T13:00:00+01:00",
  price: "Gratuit et ouvert à toutes et tous",
  venue: {
    name: "Parc des expositions Paris Le Bourget",
    hall: "Hall d'exposition principal",
    address: "Carrefour Charles Lindbergh",
    postcode: "93350",
    city: "Le Bourget",
    access: [
      { mode: "RER", label: "RER B (gare du Bourget) puis navettes ou bus 350" },
      { mode: "Route", label: "Autoroute A1, sortie 5" },
      { mode: "Parking", label: "Parking sur place" },
    ],
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Parc+des+expositions+Paris+Le+Bourget",
  },
  earlyTip: "Portes ouvertes dès 13h00 : prévoyez d'arriver tôt !",
} as const;

export const LEGAL = {
  disclaimer:
    "Site indépendant, créé par des citoyens. Non affilié officiellement à La France insoumise. Retrouvez les informations officielles de l'événement sur les canaux de LFI.",
  toConfirm: "Informations à confirmer sur les canaux officiels.",
  costSharing:
    "Plateforme citoyenne et bénévole : la participation aux frais se fait de la main à la main, dans la limite stricte du partage des coûts réels de carburant et de péage (aucun bénéfice).",
  officialLinks: [
    { label: "lafranceinsoumise.fr", href: "https://lafranceinsoumise.fr" },
    { label: "actionpopulaire.fr", href: "https://actionpopulaire.fr" },
  ],
  editor: "Collectif citoyen bénévole « Cap sur le Bourget »",
  contactEmail: "contact@cap-sur-le-bourget.fr",
  host: "Lovable (hébergement de l'application)",
} as const;

export const PRICING = {
  /** Plafond strict par kilomètre et par passager (€) */
  capPerKm: 0.08,
  /** Plafond absolu par place (€) */
  absoluteCap: 45,
  defaultFuelPrice: 1.85,
  defaultConsumption: 6.2,
} as const;

export const MUSIC = {
  label: "L'Autoradio populaire",
  track: "Rød – L'Avenir en commun",
  youtubeId: "ysF7Tcw4HbY",
} as const;

export const VIBES = [
  { id: "cafe", label: "☕ Café thermos" },
  { id: "playlist", label: "📻 Playlist & débats" },
  { id: "croissants", label: "🥐 Pause croissants" },
  { id: "banderoles", label: "🚩 Banderoles ok" },
] as const;

export const LUGGAGE = {
  small: "Petits sacs",
  cabin: "Sacs à dos et valises cabine",
  large: "Grands bagages",
} as const;

export const TRIP_TYPES = {
  aller_retour: "Aller-retour",
  aller: "Aller simple",
  retour: "Retour simple",
} as const;

export const QUICK_REPLIES = [
  "Je suis en route !",
  "Où est le point de rendez-vous ?",
  "J'ai 5 minutes de retard, désolé·e.",
  "Merci, à samedi !",
  "Je suis arrivé·e au point de rendez-vous.",
] as const;
