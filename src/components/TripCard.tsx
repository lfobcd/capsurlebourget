import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Accessibility, ArrowRight, CigaretteOff, Users } from "lucide-react";
import { TRIP_TYPES, VIBES } from "@/config/event";
import { cityOrigin, type Rating, type TripWithDriver } from "@/lib/data";
import { fmtDate, fmtTime } from "@/lib/format";
import { formatEuro } from "@/lib/pricing";
import { StarRating, Tag } from "@/components/common";
import { cn } from "@/lib/utils";

export function TripCard({ trip, rating }: { trip: TripWithDriver; rating?: Rating }) {
  const { from, to } = cityOrigin(trip);
  const full = trip.seats_available === 0;
  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} transition={{ duration: 0.15 }}>
      <Link
        to="/trajets/$id"
        params={{ id: trip.id }}
        className={cn("glass-card block p-5", full && "opacity-60")}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="label-mono text-muted-foreground">
              {fmtDate(trip.departure_at)} · {TRIP_TYPES[trip.trip_type]}
            </p>
            <h3 className="mt-2 flex flex-wrap items-center gap-x-2 font-display text-xl font-bold uppercase tracking-tight">
              <span className="truncate">{from}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-primary-glow" />
              <span className="truncate">{to}</span>
            </h3>
          </div>
          <div className="text-right">
            <div className="font-numeric text-4xl leading-none">{fmtTime(trip.departure_at)}</div>
            <p className="label-mono mt-1 text-muted-foreground">Départ</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {trip.pmr && (
            <Tag tone="green">
              <Accessibility className="h-3 w-3" /> PMR
            </Tag>
          )}
          {trip.non_smoking && (
            <Tag>
              <CigaretteOff className="h-3 w-3" /> Non-fumeur
            </Tag>
          )}
          {trip.vibes.map((v) => {
            const vibe = VIBES.find((x) => x.id === v);
            return vibe ? <Tag key={v}>{vibe.label}</Tag> : null;
          })}
        </div>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-hairline pt-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary font-display font-bold uppercase">
              {trip.driver?.first_name?.[0] ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{trip.driver?.first_name || "Conducteur·rice"}</p>
              <StarRating avg={rating?.avg} count={rating?.count} />
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div className="text-right">
              <p className={cn("flex items-center justify-end gap-1 text-sm font-semibold", full ? "text-primary-glow" : "text-foreground")}>
                <Users className="h-4 w-4" /> {full ? "Complet" : `${trip.seats_available} place${trip.seats_available > 1 ? "s" : ""}`}
              </p>
              <p className="label-mono text-muted-foreground">restante{trip.seats_available > 1 ? "s" : ""}</p>
            </div>
            <div className="text-right">
              <p className="font-numeric text-3xl leading-none text-primary-glow">{formatEuro(Number(trip.price_per_seat))}</p>
              <p className="label-mono text-muted-foreground">par place</p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function TripCardSkeleton() {
  return <div className="glass-card h-[220px] animate-pulse" />;
}
