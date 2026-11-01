import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Ban, Car, Flag, Pencil, RotateCcw, Search, ShieldAlert, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { REPORT_REASONS } from "@/config/event";
import { friendlyError, useAuth, useIsAdminQuery } from "@/lib/auth";
import { adminDeleteMember, adminListMembers, adminSetSuspended, type AdminMember } from "@/lib/admin.functions";
import { fmtDate, fmtTime } from "@/lib/format";
import { EmptyState, Page, PageHeader, RequireAuth, Spinner, Tag } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Cap sur le Bourget" },
      { name: "description", content: "Espace de modération : signalements, annonces et membres de Cap sur le Bourget." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Administration — Cap sur le Bourget" },
      { property: "og:description", content: "Espace réservé à l'équipe de modération." },
    ],
  }),
  component: () => (
    <Page>
      <PageHeader eyebrow="Modération" title="Espace" highlight="admin">
        Gère les signalements, les annonces et les comptes des membres. Chaque action est vérifiée côté serveur.
      </PageHeader>
      <RequireAuth reason="Connecte-toi avec un compte administrateur.">
        <AdminGate />
      </RequireAuth>
    </Page>
  ),
});

function AdminGate() {
  const { data: isAdmin, isLoading } = useIsAdminQuery();
  if (isLoading)
    return (
      <div className="grid min-h-[30vh] place-items-center">
        <Spinner />
      </div>
    );
  if (!isAdmin)
    return (
      <EmptyState icon={<ShieldAlert className="h-6 w-6" />} title="Accès réservé">
        Cet espace est réservé à l'équipe de modération.
      </EmptyState>
    );
  return <AdminPanel />;
}

type Profile = { id: string; first_name: string; city: string | null; vehicle: string | null; bio: string | null; created_at: string };

function AdminPanel() {
  const [tab, setTab] = useState("signalements");
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-6 flex-wrap">
        <TabsTrigger value="signalements">
          <Flag className="mr-1.5 h-4 w-4" /> Signalements
        </TabsTrigger>
        <TabsTrigger value="annonces">
          <Car className="mr-1.5 h-4 w-4" /> Annonces
        </TabsTrigger>
        <TabsTrigger value="membres">
          <Users className="mr-1.5 h-4 w-4" /> Membres
        </TabsTrigger>
      </TabsList>
      <TabsContent value="signalements">
        <ReportsTab />
      </TabsContent>
      <TabsContent value="annonces">
        <TripsTab />
      </TabsContent>
      <TabsContent value="membres">
        <MembersTab />
      </TabsContent>
    </Tabs>
  );
}

function useAdminAction(keys: string[][]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fn: () => PromiseLike<unknown>) => {
      const res = (await fn()) as { error?: unknown } | undefined;
      if (res && typeof res === "object" && "error" in res && res.error) throw res.error;
    },
    onSuccess: () => {
      toast.success("C'est fait.");
      keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
    },
    onError: (e) => toast.error(friendlyError(e)),
  });
}

function ReportsTab() {
  const reports = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select(
          "*, reporter:profiles!reports_reporter_id_fkey(id, first_name), target:profiles!reports_target_user_id_fkey(id, first_name), trip:trips(id, departure_city, departure_at)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const action = useAdminAction([["admin-reports"], ["admin-trips"], ["trips"]]);

  if (reports.isLoading) return <Spinner />;
  if (!reports.data?.length)
    return <EmptyState icon={<Flag className="h-6 w-6" />} title="Aucun signalement">Tout est calme pour le moment.</EmptyState>;

  return (
    <div className="grid gap-3">
      {reports.data.map((r) => (
        <div key={r.id} className="glass-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone="amber">{REPORT_REASONS[r.reason]}</Tag>
            <Tag>{r.target_type === "trip" ? "Trajet" : "Membre"}</Tag>
            <span className="text-xs text-muted-foreground">
              {fmtDate(r.created_at)} · par {r.reporter?.first_name || "Membre"}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm">{r.details}</p>
          <div className="mt-3 text-sm text-muted-foreground">
            {r.trip && (
              <Link to="/trajets/$id" params={{ id: r.trip.id }} className="text-primary-glow underline">
                Trajet {r.trip.departure_city} · {fmtDate(r.trip.departure_at)}
              </Link>
            )}
            {r.target && <span> Membre visé : {r.target.first_name || "(sans prénom)"}</span>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {r.trip && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm("Supprimer l'annonce signalée ?")) action.mutate(() => supabase.from("trips").delete().eq("id", r.trip!.id));
                }}
              >
                <Trash2 /> Supprimer l'annonce
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => action.mutate(() => supabase.from("reports").delete().eq("id", r.id))}>
              Classer le signalement
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TripsTab() {
  const [q, setQ] = useState("");
  const trips = useQuery({
    queryKey: ["admin-trips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, departure_city, departure_at, seats_available, seats_total, price_per_seat, driver:profiles!trips_driver_id_fkey(id, first_name)")
        .order("departure_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const action = useAdminAction([["admin-trips"], ["trips"]]);
  const list = (trips.data ?? []).filter((t) => {
    const s = q.trim().toLowerCase();
    return !s || t.departure_city.toLowerCase().includes(s) || (t.driver?.first_name ?? "").toLowerCase().includes(s);
  });

  return (
    <div className="grid gap-4">
      <SearchBox value={q} onChange={setQ} placeholder="Ville ou prénom du conducteur…" />
      {trips.isLoading && <Spinner />}
      {!trips.isLoading && list.length === 0 && <EmptyState icon={<Car className="h-6 w-6" />} title="Aucune annonce" />}
      {list.map((t) => (
        <div key={t.id} className="glass-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link to="/trajets/$id" params={{ id: t.id }} className="font-display text-lg font-bold uppercase hover:text-primary-glow">
              {t.departure_city} → Le Bourget
            </Link>
            <p className="text-sm text-muted-foreground">
              {fmtDate(t.departure_at)} · {fmtTime(t.departure_at)} · {t.seats_available}/{t.seats_total} places · {Number(t.price_per_seat)} € · par{" "}
              {t.driver?.first_name || "Membre"}
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Supprimer cette annonce ? Les réservations associées seront perdues.")) action.mutate(() => supabase.from("trips").delete().eq("id", t.id));
            }}
          >
            <Trash2 /> Supprimer
          </Button>
        </div>
      ))}
    </div>
  );
}

function MembersTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Profile | null>(null);
  const listMembers = useServerFn(adminListMembers);
  const deleteMember = useServerFn(adminDeleteMember);
  const setSuspended = useServerFn(adminSetSuspended);

  const members = useQuery({ queryKey: ["admin-members"], queryFn: () => listMembers() });
  const profiles = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, first_name, city, vehicle, bio, created_at");
      if (error) throw error;
      return data as Profile[];
    },
  });
  const contacts = useQuery({
    queryKey: ["admin-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profile_private").select("user_id, last_name, phone");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((c) => [c.user_id, c]));
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-members"] });
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    qc.invalidateQueries({ queryKey: ["admin-trips"] });
    qc.invalidateQueries({ queryKey: ["trips"] });
  };
  const act = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      toast.success("C'est fait.");
      refresh();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const rows = useMemo(() => {
    const byId = new Map((profiles.data ?? []).map((p) => [p.id, p]));
    return (members.data ?? [])
      .map((m) => ({ m, p: byId.get(m.id), c: contacts.data?.[m.id] }))
      .filter(({ m, p, c }) => {
        const s = q.trim().toLowerCase();
        if (!s) return true;
        return [m.email, p?.first_name, c?.last_name, p?.city, c?.phone].some((v) => (v ?? "").toLowerCase().includes(s));
      })
      .sort((a, b) => b.m.createdAt.localeCompare(a.m.createdAt));
  }, [members.data, profiles.data, contacts.data, q]);

  if (members.error) return <p className="text-sm text-primary-glow">{friendlyError(members.error)}</p>;

  return (
    <div className="grid gap-4">
      <SearchBox value={q} onChange={setQ} placeholder="Email, prénom, nom, ville, téléphone…" />
      <p className="label-mono text-muted-foreground">{members.data?.length ?? 0} membres</p>
      {members.isLoading && <Spinner />}
      {rows.map(({ m, p, c }) => (
        <MemberRow
          key={m.id}
          member={m}
          profile={p}
          contact={c}
          isSelf={m.id === user?.id}
          onEdit={() => p && setEditing(p)}
          onSuspend={() => act.mutate(() => setSuspended({ data: { userId: m.id, suspended: !m.banned } }))}
          onDelete={() => {
            if (confirm(`Supprimer définitivement le compte ${m.email} ? Ses annonces, réservations et messages seront effacés.`))
              act.mutate(() => deleteMember({ data: { userId: m.id } }));
          }}
        />
      ))}
      {editing && <EditProfileDialog profile={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function MemberRow({
  member: m,
  profile: p,
  contact: c,
  isSelf,
  onEdit,
  onSuspend,
  onDelete,
}: {
  member: AdminMember;
  profile: Profile | undefined;
  contact: { last_name: string; phone: string } | undefined;
  isSelf: boolean;
  onEdit: () => void;
  onSuspend: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="glass-card flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">
            {p?.first_name || "(sans prénom)"} {c?.last_name}
          </span>
          {m.isAdmin && <Tag tone="red">Admin</Tag>}
          {m.confirmed ? <Tag tone="green">Email vérifié</Tag> : <Tag tone="amber">Email non vérifié</Tag>}
          {m.banned && <Tag tone="red">Suspendu</Tag>}
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {m.email}
          {c?.phone ? ` · ${c.phone}` : ""}
          {p?.city ? ` · ${p.city}` : ""}
        </p>
        <p className="text-xs text-muted-foreground/80">
          Inscrit·e le {fmtDate(m.createdAt)}
          {m.lastSignIn ? ` · dernière connexion ${fmtDate(m.lastSignIn)}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onEdit} disabled={!p}>
          <Pencil /> Modifier
        </Button>
        {!isSelf && (
          <>
            <Button variant="outline" size="sm" onClick={onSuspend}>
              {m.banned ? (
                <>
                  <RotateCcw /> Réactiver
                </>
              ) : (
                <>
                  <Ban /> Suspendre
                </>
              )}
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 /> Supprimer
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function EditProfileDialog({ profile, onClose, onSaved }: { profile: Profile; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    first_name: profile.first_name,
    city: profile.city ?? "",
    vehicle: profile.vehicle ?? "",
    bio: profile.bio ?? "",
  });
  const save = useMutation({
    mutationFn: async () => {
      const first = form.first_name.trim();
      if (!first || first.length > 50) throw new Error("Le prénom doit faire entre 1 et 50 caractères.");
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: first,
          city: form.city.trim() || null,
          vehicle: form.vehicle.trim() || null,
          bio: form.bio.trim().slice(0, 500) || null,
        })
        .eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil mis à jour.");
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const field = (k: keyof typeof form, label: string) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`edit-${k}`}>{label}</Label>
      {k === "bio" ? (
        <Textarea id={`edit-${k}`} maxLength={500} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
      ) : (
        <Input id={`edit-${k}`} maxLength={80} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
      )}
    </div>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card border-hairline-strong">
        <DialogHeader>
          <DialogTitle className="title-display text-2xl">Modifier le profil</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          {field("first_name", "Prénom")}
          {field("city", "Ville")}
          {field("vehicle", "Véhicule")}
          {field("bio", "Bio")}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label="Rechercher" />
    </div>
  );
}
