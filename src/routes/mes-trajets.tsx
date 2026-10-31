import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Car, MessageCircle, Phone, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, useAuth } from "@/lib/auth";
import { cityOrigin, type TripRow } from "@/lib/data";
import { fmtDate, fmtTime } from "@/lib/format";
import { formatEuro } from "@/lib/pricing";
import { EmptyState, Page, PageHeader, RequireAuth, Tag } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/mes-trajets")({
  validateSearch: z.object({ onglet: z.enum(["reservations", "annonces"]).optional() }),
  head: () => ({
    meta: [
      { title: "Mes trajets — Cap sur le Bourget" },
      { name: "description", content: "Tes réservations et tes annonces de covoiturage vers le Bourget." },
      { property: "og:title", content: "Mes trajets — Cap sur le Bourget" },
      { property: "og:description", content: "Gère tes réservations et tes annonces." },
    ],
  }),
  component: () => (
    <Page>
      <PageHeader eyebrow="Mon espace" title="Mes" highlight="trajets" />
      <RequireAuth reason="Connecte-toi pour retrouver tes réservations et tes annonces.">
        <MyTrips />
      </RequireAuth>
    </Page>
  ),
});

const STATUS = {
  pending: { l: "En attente", t: "amber" },
  confirmed: { l: "Confirmée", t: "green" },
  refused: { l: "Refusée", t: "red" },
  cancelled: { l: "Annulée", t: "default" },
} as const;

type Passenger = { id: string; first_name: string };
type BookingWithPassenger = { id: string; seats: number; status: keyof typeof STATUS; message: string | null; passenger_id: string; passenger: Passenger | null };

function MyTrips() {
  const { onglet = "reservations" } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();

  const bookings = useQuery({
    queryKey: ["my-bookings", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, trip:trips(*, driver:profiles!trips_driver_id_fkey(id, first_name))")
        .eq("passenger_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as (BookingWithPassenger & { trip: (TripRow & { driver: Passenger | null }) | null })[];
    },
  });
  const listings = useQuery({
    queryKey: ["my-listings", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*, bookings(*, passenger:profiles!bookings_passenger_id_fkey(id, first_name))")
        .eq("driver_id", uid)
        .order("departure_at");
      if (error) throw error;
      return (data ?? []) as unknown as (TripRow & { bookings: BookingWithPassenger[] })[];
    },
  });
  const contactIds = Array.from(
    new Set([
      ...(bookings.data ?? []).filter((b) => b.status === "confirmed" && b.trip).map((b) => b.trip!.driver_id),
      ...(listings.data ?? []).flatMap((t) => t.bookings.filter((b) => b.status === "confirmed").map((b) => b.passenger_id)),
    ]),
  );
  const phones = useQuery({
    queryKey: ["phones", contactIds.join(",")],
    enabled: contactIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profile_private").select("user_id, phone").in("user_id", contactIds);
      return Object.fromEntries((data ?? []).map((r) => [r.user_id, r.phone]));
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["my-bookings"] });
    qc.invalidateQueries({ queryKey: ["my-listings"] });
    qc.invalidateQueries({ queryKey: ["trips"] });
    qc.invalidateQueries({ queryKey: ["phones"] });
  };
  const run = useMutation({
    mutationFn: async (fn: () => PromiseLike<{ error: unknown }>) => {
      const { error } = await fn();
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("C'est fait !");
      refresh();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const openChat = async (tripId: string, other: string) => {
    const { data, error } = await supabase.rpc("get_or_create_conversation", { _trip_id: tripId, _other: other });
    if (error) { toast.error(friendlyError(error)); return; }
    navigate({ to: "/messages", search: { c: data } });
  };

  return (
    <Tabs value={onglet} onValueChange={(v) => navigate({ to: "/mes-trajets", search: { onglet: v as "reservations" | "annonces" }, replace: true })}>
      <TabsList className="mb-6">
        <TabsTrigger value="reservations">Mes réservations</TabsTrigger>
        <TabsTrigger value="annonces">Mes annonces</TabsTrigger>
      </TabsList>
      <TabsContent value="reservations" className="grid gap-4">
        {(bookings.data ?? []).map((b) => {
          if (!b.trip) return null;
          const { from, to } = cityOrigin(b.trip);
          const phone = phones.data?.[b.trip.driver_id];
          return (
            <div key={b.id} className="glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Tag tone={STATUS[b.status].t}>{STATUS[b.status].l}</Tag>
                <Link to="/trajets/$id" params={{ id: b.trip.id }} className="mt-2 block font-display text-xl font-bold uppercase">
                  {from} → {to}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {fmtDate(b.trip.departure_at)} · {fmtTime(b.trip.departure_at)} · {b.seats} place(s) · {formatEuro(Number(b.trip.price_per_seat) * b.seats)} · avec {b.trip.driver?.first_name}
                </p>
                {b.status === "confirmed" && phone && (
                  <a href={`tel:${phone.replace(/\s/g, "")}`} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-success-strong">
                    <Phone className="h-4 w-4" /> {phone}
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openChat(b.trip!.id, b.trip!.driver_id)}>
                  <MessageCircle /> Message
                </Button>
                {(b.status === "pending" || b.status === "confirmed") && (
                  <Button variant="destructive" size="sm" onClick={() => run.mutate(() => supabase.rpc("cancel_booking", { _booking_id: b.id }))}>
                    Annuler
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {bookings.data?.length === 0 && (
          <EmptyState icon={<Car className="h-6 w-6" />} title="Aucune réservation">
            <Link to="/trajets" className="text-primary-glow underline">Trouve un trajet</Link> pour rejoindre le convoi.
          </EmptyState>
        )}
      </TabsContent>
      <TabsContent value="annonces" className="grid gap-4">
        {(listings.data ?? []).map((t) => {
          const { from, to } = cityOrigin(t);
          return (
            <div key={t.id} className="glass-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link to="/trajets/$id" params={{ id: t.id }} className="font-display text-xl font-bold uppercase">
                    {from} → {to}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {fmtDate(t.departure_at)} · {fmtTime(t.departure_at)} · {t.seats_available}/{t.seats_total} places libres
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm("Supprimer cette annonce ? Les passagers perdront leur réservation.")) run.mutate(() => supabase.from("trips").delete().eq("id", t.id));
                  }}
                >
                  <Trash2 /> Supprimer l'annonce
                </Button>
              </div>
              <div className="mt-4 grid gap-2">
                {t.bookings.filter((b) => b.status !== "cancelled").map((b) => (
                  <div key={b.id} className="flex flex-col gap-3 rounded-xl border border-hairline bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm">
                      <span className="font-semibold">{b.passenger?.first_name ?? "Membre"}</span> · {b.seats} place(s) <Tag tone={STATUS[b.status].t}>{STATUS[b.status].l}</Tag>
                      {b.message && <p className="mt-1 text-muted-foreground">« {b.message} »</p>}
                      {b.status === "confirmed" && phones.data?.[b.passenger_id] && (
                        <a href={`tel:${phones.data[b.passenger_id]!.replace(/\s/g, "")}`} className="mt-1 flex items-center gap-2 font-semibold text-success-strong">
                          <Phone className="h-4 w-4" /> {phones.data[b.passenger_id]}
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openChat(t.id, b.passenger_id)}>
                        <MessageCircle />
                      </Button>
                      {b.status === "pending" && (
                        <>
                          <Button variant="success" size="sm" onClick={() => run.mutate(() => supabase.rpc("respond_booking", { _booking_id: b.id, _accept: true }))}>
                            Accepter
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => run.mutate(() => supabase.rpc("respond_booking", { _booking_id: b.id, _accept: false }))}>
                            Refuser
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {t.bookings.length === 0 && <p className="text-xs text-muted-foreground">Pas encore de demande.</p>}
              </div>
            </div>
          );
        })}
        {listings.data?.length === 0 && (
          <EmptyState icon={<Car className="h-6 w-6" />} title="Aucune annonce">
            <Link to="/proposer" className="text-primary-glow underline">Propose un trajet</Link> et remplis tes sièges vides.
          </EmptyState>
        )}
      </TabsContent>
    </Tabs>
  );
}
