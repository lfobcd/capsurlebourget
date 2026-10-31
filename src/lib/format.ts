const TZ = "Europe/Paris";

export function fmtTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso)).replace(":", "h");
}

export function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: TZ }).format(new Date(iso));
}

export function fmtDateLong(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(new Date(iso));
}

export function fmtDateKey(iso: string) {
  // YYYY-MM-DD in Paris time
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  return parts;
}

export function fmtRelative(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return fmtTime(iso);
  return fmtDate(iso);
}

/** Convertit une valeur <input type="datetime-local"> (heure de Paris supposée = heure locale du navigateur) en ISO. */
export function localInputToISO(value: string) {
  return new Date(value).toISOString();
}
