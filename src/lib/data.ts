import { useEffect } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TripRow = Database["public"]["Tables"]["trips"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
export type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];

export type DriverLite = Pick<ProfileRow, "id" | "first_name" | "city" | "bio" | "vehicle">;
export type TripWithDriver = TripRow & { driver: DriverLite | null };

export interface Rating {
  avg: number;
  count: number;
}

const TRIP_SELECT = "*, driver:profiles!trips_driver_id_fkey(id, first_name, city, bio, vehicle)";

export const upcomingTripsQuery = () =>
  queryOptions({
    queryKey: ["trips", "upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select(TRIP_SELECT)
        .gte("departure_at", new Date().toISOString())
        .order("departure_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as TripWithDriver[];
    },
  });

export const tripQuery = (id: string) =>
  queryOptions({
    queryKey: ["trips", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select(TRIP_SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as TripWithDriver | null;
    },
  });

export const ratingsQuery = (ids: string[]) =>
  queryOptions({
    queryKey: ["ratings", [...ids].sort().join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("target_id, rating").in("target_id", ids);
      if (error) throw error;
      const map: Record<string, Rating> = {};
      for (const r of data ?? []) {
        const cur = map[r.target_id] ?? { avg: 0, count: 0 };
        cur.avg = (cur.avg * cur.count + r.rating) / (cur.count + 1);
        cur.count += 1;
        map[r.target_id] = cur;
      }
      return map;
    },
  });

export const reviewsForQuery = (userId: string) =>
  queryOptions({
    queryKey: ["reviews", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, author:profiles!reviews_author_id_fkey(first_name)")
        .eq("target_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as (ReviewRow & { author: { first_name: string } | null })[];
    },
  });

/** Met à jour en temps réel les places disponibles. */
export function useTripsRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`trips-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => {
        qc.invalidateQueries({ queryKey: ["trips"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

/** Nombre de messages non lus pour l'utilisateur connecté, en temps réel. */
export function useUnreadCount(userId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["unread", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
        .neq("sender_id", userId!);
      if (error) throw error;
      return count ?? 0;
    },
  });
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`unread-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["unread", userId] });
        qc.invalidateQueries({ queryKey: ["conversations", userId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
  return query.data ?? 0;
}

export function cityOrigin(trip: Pick<TripRow, "trip_type" | "departure_city">) {
  return trip.trip_type === "retour"
    ? { from: "Le Bourget", to: trip.departure_city }
    : { from: trip.departure_city, to: "Le Bourget" };
}
