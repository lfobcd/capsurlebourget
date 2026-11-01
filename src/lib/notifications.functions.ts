import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FROM = "Cap sur le Bourget <notifications@covoitcitoyen.site>";

const input = z.object({ bookingId: z.string().uuid() });

/**
 * Envoie un email au conducteur·rice quand une demande de réservation est faite sur son trajet.
 * Échoue silencieusement (retourne sent:false) si RESEND_API_KEY n'est pas configurée ou si
 * l'envoi échoue : ça ne doit jamais faire planter le flux de réservation du passager.
 */
export const sendBookingRequestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => input.parse(raw))
  .handler(async ({ data, context }): Promise<{ sent: boolean }> => {
    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) {
      console.error("[email] RESEND_API_KEY manquante, email non envoyé.");
      return { sent: false };
    }

    const { data: booking } = await context.supabase
      .from("bookings")
      .select("seats, trip_id")
      .eq("id", data.bookingId)
      .eq("passenger_id", context.userId)
      .maybeSingle();
    if (!booking) return { sent: false };

    const { data: trip } = await context.supabase
      .from("trips")
      .select("driver_id, departure_city, departure_at")
      .eq("id", booking.trip_id)
      .maybeSingle();
    if (!trip) return { sent: false };

    const { data: passenger } = await context.supabase.from("profiles").select("first_name").eq("id", context.userId).maybeSingle();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: driverUser, error: driverErr } = await supabaseAdmin.auth.admin.getUserById(trip.driver_id);
    const driverEmail = driverUser?.user?.email;
    if (driverErr || !driverEmail) return { sent: false };

    const dateLabel = new Date(trip.departure_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const seatsLabel = `${booking.seats} place${booking.seats > 1 ? "s" : ""}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [driverEmail],
        subject: "Nouvelle demande de réservation — Cap sur le Bourget",
        html: `<p>Bonjour,</p><p><strong>${passenger?.first_name ?? "Un membre"}</strong> souhaite réserver ${seatsLabel} sur ton trajet au départ de <strong>${trip.departure_city}</strong>, le ${dateLabel}.</p><p>Connecte-toi sur Cap sur le Bourget, dans « Mes trajets » → « Mes annonces », pour accepter ou refuser la demande.</p><p>— L'équipe Cap sur le Bourget</p>`,
      }),
    });
    if (!res.ok) {
      console.error("[email] Échec envoi Resend", res.status, await res.text());
      return { sent: false };
    }
    return { sent: true };
  });
