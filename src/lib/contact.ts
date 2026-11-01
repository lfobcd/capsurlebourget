/** Utilitaires pour les alertes SMS / WhatsApp (liens ouverts sur le téléphone de l'utilisateur). */

/** Convertit un numéro français en format international sans « + » (ex. 33612345678). Renvoie null si invalide. */
export function toInternationalDigits(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  let national: string;
  if (digits.startsWith("0033")) national = digits.slice(4);
  else if (digits.startsWith("33") && digits.length === 11) national = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 10) national = digits.slice(1);
  else return null;
  if (national.length !== 9 || national.startsWith("0")) return null;
  return `33${national}`;
}

export function smsUrl(phone: string, body: string) {
  const intl = toInternationalDigits(phone);
  const to = intl ? `+${intl}` : phone.replace(/\s/g, "");
  // « ?&body= » est compris à la fois par iOS et Android.
  return `sms:${to}?&body=${encodeURIComponent(body)}`;
}

export function whatsappUrl(phone: string, body: string) {
  const intl = toInternationalDigits(phone);
  if (!intl) return null;
  return `https://wa.me/${intl}?text=${encodeURIComponent(body)}`;
}

export interface AlertContext {
  role: "passenger" | "driver";
  senderName: string;
  recipientName: string;
  from: string;
  dateLabel: string;
  timeLabel: string;
  seats: number;
  meetingAddress?: string;
}

/** Texte prérempli, volontairement court et factuel. */
export function alertMessage(c: AlertContext) {
  const hello = `Bonjour ${c.recipientName || ""}`.trim();
  const me = c.senderName ? `c'est ${c.senderName}` : "c'est moi";
  if (c.role === "passenger") {
    return `${hello}, ${me} (Cap sur le Bourget). Je viens de demander ${c.seats} place${c.seats > 1 ? "s" : ""} sur ton trajet ${c.from} → Le Bourget du ${c.dateLabel}. Peux-tu regarder ma demande dans « Mes trajets » sur le site ? Merci !`;
  }
  return `${hello}, ${me}, ton conducteur·rice Cap sur le Bourget. Ta place est confirmée : ${c.from} → Le Bourget, le ${c.dateLabel} à ${c.timeLabel}.${c.meetingAddress ? ` Rendez-vous : ${c.meetingAddress}.` : ""} À très vite !`;
}
