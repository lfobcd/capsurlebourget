import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Accessibility,
  ArrowLeft,
  ArrowRight,
  BellRing,
  Trash2,
  Briefcase,
  CarFront,
  CigaretteOff,
  Flag,
  Lock,
  MapPin,
  MessageCircle,
  Music,
  PawPrint,
  Phone,
  Route as RouteIcon,
  Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LUGGAGE, TRIP_TYPES, VIBES } from "@/config/event";
import { cityOrigin, ratingsQuery, reviewsForQuery, tripQuery, useTripsRealtime } from "@/lib/data";
import { fmtDateLong, fmtTime } from "@/lib/format";
import { formatEuro } from "@/lib/pricing";
import { friendlyError, useAuth, useIsAdmin } from "@/lib/auth";
import { sendBookingRequestEmail } from "@/lib/notifications.functions";
import { CostReminder, EarlyTip, EmptyState, Page, Spinner, StarRating, Tag } from "@/components/common";
import { ContactAlertDialog } from "@/components/ContactAlertDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/trajets/$id")({
  head: () => ({
    meta: [
      { title: "Détail du trajet — Cap sur le Bourget" },
      { name: "description", content: "Horaires, points de rendez-vous, règles de bord et réservation pour ce covoiturage vers le Bourget." },
      { property: "og:title", content: "Un trajet vers le Bourget — Cap sur le Bourget" },
      { property: "og:description", content: "Réserve ta place dans ce covoiturage citoyen pour le 7 novembre." },
    ],
  }),
  component: TripDetail,
});

const STATUS_LABEL = { pending: "En attente", confirmed: "Confirmée", refused: "Refusée", cancelled: "Annulée" } as const;

function TripDetail() {
  useTripsRealtime();
  const { id } = Route.useParams();
  const { user, emailConfirmed } = useAuth();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [seats, setSeats] = useState(1);
  const [message, setMessage] = useState("");
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertIntro, setAlertIntro] = useState<string | undefined>(undefined);
  const [newBookingId, setNewBookingId] = useState<string | undefined>(undefined);
  const notifyBookingRequest = useServerFn(sendBookingRequestEmail);

  const { data: trip, isLoading } = useQuery(tripQuery(id));
  const driverId = trip?.driver_id ?? "";
  const { data: ratings } = useQuery(ratingsQuery(driverId ? [driverId] : []));
  const { data: reviews } = useQuery({ ...reviewsForQuery(driverId), enabled: !!driverId });

  const { data: myBooking } = useQuery({
    queryKey: ["my-booking", id, user?.id],
    enabled: !!user && !!trip && trip.driver_id !== user.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").eq("trip_id", id).eq("passenger_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const confirmed = myBooking?.status === "confirmed";
  const { data: driverContact } = useQuery({
    queryKey: ["contact", driverId, user?.id, confirmed],
    enabled: !!user && !!driverId && confirmed,
    queryFn: async () => {
      const { data } = await supabase.from("profile_private").select("phone").eq("user_id", driverId).maybeSingle();
      return data;
    },
  });

  const book = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("book_trip", message.trim() ? { _trip_id: id, _seats: seats, _message: message.trim() } : { _trip_id: id, _seats: seats });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (bid) => {
      setNewBookingId(bid);
      toast.success("Demande envoyée !", { description: "Préviens le ou la conducteur·rice pour une réponse plus rapide." });
      setOpen(false);
      setMessage("");
      setAlertIntro("Demande envoyée ! Pour que le ou la conducteur·rice soit prévenu·e tout de suite et valide ta place au plus vite :");
      setAlertOpen(true);
      qc.invalidateQueries({ queryKey: ["my-booking"] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      notifyBookingRequest({ data: { bookingId: bid } }).catch(() => {});
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const adminDelete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("trips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Annonce supprimée.");
      qc.invalidateQueries({ queryKey: ["trips"] });
      navigate({ to: "/admin" });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const contact = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("get_or_create_conversation", { _trip_id: id, _other: driverId });
      if (error) throw error;
      return data;
    },
    onSuccess: (cid) => navigate({ to: "/messages", search: { c: cid } }),
    onError: (e) => toast.error(friendlyError(e)),
  });

  if (isLoading)
    return (
      <Page>
        <div className="grid min-h-[40vh] place-items-center">
          <Spinner />
        </div>
      </Page>
    );
  if (!trip)
    return (
      <Page>
        <EmptyState icon={<CarFront className="h-6 w-6" />} title="Trajet introuvable">
          Ce trajet a peut-être été supprimé par son conducteur.
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link to="/trajets">Voir les autres trajets</Link>
            </Button>
          </div>
        </EmptyState>
      </Page>
    );

  const { from, to } = cityOrigin(trip);
  const isOwner = user?.id === trip.driver_id;
  const activeBooking = myBooking && (myBooking.status === "pending" || myBooking.status === "confirmed");
  const price = Number(trip.price_per_seat);
  const rating = ratings?.[trip.driver_id];
  const departed = new Date(trip.departure_at) < new Date();

  const requireVerified = (fn: () => void) => {
    if (!user) {
      toast.info("Connecte-toi pour continuer.");
      navigate({ to: "/auth", search: { mode: "login" } });
      return;
    }
    if (!emailConfirmed) {
      toast.warning("Confirme d'abord ton adresse email (voir ton profil).");
      return;
    }
    fn();
  };

  return (
    <Page>
      <Link to="/trajets" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Tous les trajets
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-6">
          <section className="glass-card glass-card-active p-6">
            <div className="flex flex-wrap gap-2">
              <Tag tone="red">{TRIP_TYPES[trip.trip_type]}</Tag>
              <Tag>
                <RouteIcon className="h-3 w-3" /> {trip.distance_km} km
              </Tag>
            </div>
            <h1 className="title-display mt-4 flex flex-wrap items-center gap-3 text-4xl sm:text-6xl">
              {from} <ArrowRight className="h-8 w-8 text-primary-glow" /> <span className="text-crimson">{to}</span>
            </h1>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-hairline bg-background/50 p-4">
                <p className="label-mono text-muted-foreground">{trip.trip_type === "retour" ? "Départ retour" : "Départ aller"}</p>
                <p className="font-numeric text-5xl leading-none">{fmtTime(trip.departure_at)}</p>
                <p className="mt-1 text-sm capitalize text-muted-foreground">{fmtDateLong(trip.departure_at)}</p>
              </div>
              {trip.return_at && (
                <div className="rounded-xl border border-hairline bg-background/50 p-4">
                  <p className="label-mono text-muted-foreground">Départ retour</p>
                  <p className="font-numeric text-5xl leading-none">{fmtTime(trip.return_at)}</p>
                  <p className="mt-1 text-sm capitalize text-muted-foreground">{fmtDateLong(trip.return_at)}</p>
                </div>
              )}
            </div>
            <EarlyTip className="mt-4" />
          </section>

          <section className="glass-card p-6">
            <h2 className="label-mono text-muted-foreground">Itinéraire</h2>
            <ol className="mt-4 grid gap-4">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary-glow" />
                <div>
                  <p className="font-semibold">Rendez-vous · {trip.departure_city}</p>
                  <p className="text-sm text-muted-foreground">{trip.meeting_address}</p>
                </div>
              </li>
              {trip.waypoints.map((w) => (
                <li key={w} className="flex gap-3 pl-1">
                  <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-muted-foreground" />
                  <p className="text-sm">Étape : {w}</p>
                </li>
              ))}
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-success-strong" />
                <div>
                  <p className="font-semibold">Parc des expositions Paris Le Bourget</p>
                  <p className="text-sm text-muted-foreground">Carrefour Charles Lindbergh, 93350 Le Bourget</p>
                </div>
              </li>
            </ol>
          </section>

          <section className="glass-card p-6">
            <h2 className="label-mono text-muted-foreground">Règles de bord & ambiance</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Rule icon={Briefcase} label="Bagages" value={LUGGAGE[trip.luggage]} />
              <Rule icon={CigaretteOff} label="Tabac" value={trip.non_smoking ? "Non-fumeur" : "Fumeur toléré"} />
              <Rule icon={PawPrint} label="Animaux" value={trip.pets ? "Acceptés" : "Non acceptés"} />
              <Rule icon={Music} label="Musique / podcast" value={trip.music ? "Oui" : "Silence apprécié"} />
              <Rule icon={Accessibility} label="Accessibilité" value={trip.pmr ? "Accessible PMR" : "Non adapté PMR"} />
              <Rule icon={CarFront} label="Véhicule" value={trip.vehicle || trip.driver?.vehicle || "Non précisé"} />
            </div>
            {trip.vibes.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {trip.vibes.map((v) => {
                  const vibe = VIBES.find((x) => x.id === v);
                  return vibe ? <Tag key={v}>{vibe.label}</Tag> : null;
                })}
              </div>
            )}
            {trip.description && <p className="mt-5 whitespace-pre-line text-sm text-foreground/85">{trip.description}</p>}
          </section>

          <section className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-secondary font-display text-xl font-bold uppercase">
                {trip.driver?.first_name?.[0] ?? "?"}
              </div>
              <div>
                <p className="label-mono text-muted-foreground">Conducteur·rice</p>
                <p className="font-display text-xl font-bold">{trip.driver?.first_name || "Membre"}</p>
                <StarRating avg={rating?.avg} count={rating?.count} />
              </div>
            </div>
            {trip.driver?.bio && <p className="mt-4 text-sm text-foreground/85">{trip.driver.bio}</p>}
            {reviews && reviews.length > 0 && (
              <div className="mt-5 grid gap-3 border-t border-hairline pt-5">
                {reviews.slice(0, 5).map((r) => (
                  <div key={r.id} className="rounded-xl border border-hairline bg-background/40 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{r.author?.first_name ?? "Membre"}</span>
                      <span className="flex">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-warning-strong text-warning-strong" />
                        ))}
                      </span>
                    </div>
                    {r.comment && <p className="mt-1 text-muted-foreground">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="grid h-fit gap-4 lg:sticky lg:top-24">
          <div className="glass-card p-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="label-mono text-muted-foreground">Par place</p>
                <p className="font-numeric text-6xl leading-none text-primary-glow">{formatEuro(price)}</p>
              </div>
              <div className="text-right">
                <p className="font-numeric text-5xl leading-none">{trip.seats_available}</p>
                <p className="label-mono text-muted-foreground">/{trip.seats_total} places</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {isOwner ? (
                <Button asChild variant="outline">
                  <Link to="/mes-trajets" search={{ onglet: "annonces" }}>Gérer mon annonce</Link>
                </Button>
              ) : activeBooking ? (
                <>
                  <div className={`rounded-xl border p-3 text-sm ${confirmed ? "border-success/30 bg-success/10 text-success-strong" : "border-warning/30 bg-warning/10 text-warning-strong"}`}>
                    Ta réservation ({myBooking!.seats} place{myBooking!.seats > 1 ? "s" : ""}) : <strong>{STATUS_LABEL[myBooking!.status]}</strong>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAlertIntro(undefined);
                      setAlertOpen(true);
                    }}
                  >
                    <BellRing /> Prévenir par SMS / WhatsApp
                  </Button>
                </>
              ) : (
                <Button size="lg" disabled={trip.seats_available === 0 || departed} onClick={() => requireVerified(() => setOpen(true))}>
                  {departed ? "Trajet passé" : trip.seats_available === 0 ? "Complet" : "Réserver"}
                </Button>
              )}
              {!isOwner && (
                <Button variant="outline" onClick={() => requireVerified(() => contact.mutate())} disabled={contact.isPending}>
                  <MessageCircle /> Contacter le conducteur
                </Button>
              )}
            </div>

            {!isOwner && (
              <div className="mt-5 rounded-xl border border-hairline bg-background/50 p-4">
                {confirmed && driverContact?.phone ? (
                  <a href={`tel:${driverContact.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 text-success-strong">
                    <Phone className="h-5 w-5" />
                    <span>
                      <span className="label-mono block">Téléphone</span>
                      <span className="font-semibold">{driverContact.phone}</span>
                    </span>
                  </a>
                ) : (
                  <div className="flex gap-3 text-sm text-muted-foreground">
                    <Lock className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>
                      <span className="font-mono tracking-widest">06 •• •• •• ••</span>
                      <br />
                      Le numéro s'affiche uniquement une fois ta réservation confirmée, pour protéger la vie privée de chacun·e.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <CostReminder />
          {!isOwner && (
            <Link to="/signaler" search={{ trajet: trip.id }} className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary-glow">
              <Flag className="h-3.5 w-3.5" /> Signaler ce trajet
            </Link>
          )}
          {isAdmin && (
            <Button
              variant="destructive"
              size="sm"
              disabled={adminDelete.isPending}
              onClick={() => {
                if (confirm("Supprimer définitivement cette annonce (action admin) ?")) adminDelete.mutate();
              }}
            >
              <Trash2 /> Supprimer l'annonce (admin)
            </Button>
          )}
        </aside>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card border-hairline-strong">
          <DialogHeader>
            <DialogTitle className="title-display text-2xl">Réserver ta place</DialogTitle>
            <DialogDescription>
              {from} → {to} · {fmtDateLong(trip.departure_at)} à {fmtTime(trip.departure_at)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Nombre de places</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from({ length: trip.seats_available }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSeats(n)}
                    aria-pressed={seats === n}
                    className={`h-11 w-11 rounded-xl border font-numeric text-2xl ${seats === n ? "border-primary bg-primary/20" : "border-hairline hover:border-hairline-strong"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-hairline bg-background/50 p-4">
              <span className="text-sm text-muted-foreground">Total à régler de la main à la main</span>
              <span className="font-numeric text-3xl text-primary-glow">{formatEuro(price * seats)}</span>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="book-msg">Message au conducteur (optionnel)</Label>
              <Textarea id="book-msg" maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Salut ! Je pars avec un ami, on peut te rejoindre au point de rendez-vous…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => book.mutate()} disabled={book.isPending || seats > trip.seats_available}>
              {book.isPending ? "Envoi…" : "Envoyer ma demande"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(newBookingId ?? myBooking?.id) && (
        <ContactAlertDialog
          open={alertOpen}
          onOpenChange={setAlertOpen}
          bookingId={(newBookingId ?? myBooking?.id)!}
          intro={alertIntro}
          context={{
            role: "passenger",
            recipientName: trip.driver?.first_name ?? "",
            from: trip.departure_city,
            dateLabel: fmtDateLong(trip.departure_at),
            timeLabel: fmtTime(trip.departure_at),
            seats: myBooking?.seats ?? seats,
          }}
        />
      )}
    </Page>
  );
}

function Rule({ icon: Icon, label, value }: { icon: typeof Briefcase; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-hairline bg-background/40 p-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="label-mono text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
