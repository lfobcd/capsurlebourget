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
  pitch: "La bande-son officieuse du convoi. Lance-la avant de prendre la route et chantez ensemble jusqu'au Bourget !",
} as const;

/**
 * Règles d'envoi des alertes SMS / WhatsApp.
 * Les limites chiffrées sont appliquées côté base (fonction request_contact_alert) : modifie les deux ensemble.
 */
export const CONTACT_RULES = {
  maxPerBooking: 3,
  minMinutesBetween: 30,
  maxPerDay: 10,
  quietHours: { from: 22, to: 8 },
  rules: [
    "Uniquement pour organiser ce trajet : aucun démarchage politique, commercial ou associatif.",
    "Une alerte courte, pas une conversation : pour discuter, utilise la messagerie du site.",
    "Pas d'envoi entre 22h et 8h, sauf le jour même du départ.",
    "3 alertes maximum par réservation, espacées d'au moins 30 minutes (10 par jour au total).",
    "Ne partage jamais ce numéro et efface-le après l'événement.",
    "Tout abus peut être signalé et entraîner la suspension de ton compte.",
  ],
  privacyNote:
    "Chaque alerte est enregistrée (qui, quand, pour quelle réservation) afin de protéger les membres contre le démarchage et le harcèlement.",
} as const;

export const REPORT_REASONS = {
  prix_excessif: "Prix excessif",
  spam: "Spam",
  propos_inappropries: "Propos inappropriés",
  faux_profil: "Faux profil",
  securite: "Sécurité",
  autre: "Autre",
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
