import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, MailWarning, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, useAuth } from "@/lib/auth";
import { ratingsQuery, reviewsForQuery } from "@/lib/data";
import { formatFrenchPhone, isValidFrenchPhone } from "@/lib/validation";
import { Page, PageHeader, RequireAuth, StarRating } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil — Cap sur le Bourget" },
      { name: "description", content: "Gère ton profil, ton téléphone, ton véhicule et la vérification de ton email." },
      { property: "og:title", content: "Mon profil — Cap sur le Bourget" },
      { property: "og:description", content: "Ton espace membre sur la plateforme citoyenne." },
    ],
  }),
  component: () => (
    <Page className="max-w-4xl">
      <PageHeader eyebrow="Mon espace" title="Mon" highlight="profil" />
      <RequireAuth reason="Connecte-toi pour gérer ton profil.">
        <ProfileForm />
      </RequireAuth>
    </Page>
  ),
});

function ProfileForm() {
  const { user, emailConfirmed, refreshUser, signOut } = useAuth();
  const qc = useQueryClient();
  const uid = user!.id;
  const { data } = useQuery({
    queryKey: ["profile", uid],
    queryFn: async () => {
      const [p, pr] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("profile_private").select("*").eq("user_id", uid).maybeSingle(),
      ]);
      return { p: p.data, pr: pr.data };
    },
  });
  const { data: ratings } = useQuery(ratingsQuery([uid]));
  const { data: reviews } = useQuery(reviewsForQuery(uid));
  const [f, setF] = useState({ first_name: "", last_name: "", phone: "", vehicle: "", city: "", bio: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data)
      setF({
        first_name: data.p?.first_name ?? "",
        last_name: data.pr?.last_name ?? "",
        phone: data.pr?.phone ?? "",
        vehicle: data.p?.vehicle ?? "",
        city: data.p?.city ?? "",
        bio: data.p?.bio ?? "",
      });
  }, [data]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.first_name.trim() || !f.last_name.trim()) { toast.error("Prénom et nom sont requis."); return; }
    if (!isValidFrenchPhone(f.phone)) { toast.error("Numéro de téléphone français invalide (ex. 06 12 34 56 78)."); return; }
    setSaving(true);
    const [a, b] = await Promise.all([
      supabase.from("profiles").upsert({ id: uid, first_name: f.first_name.trim().slice(0, 50), vehicle: f.vehicle.trim().slice(0, 80) || null, city: f.city.trim().slice(0, 80) || null, bio: f.bio.trim().slice(0, 500) || null, updated_at: new Date().toISOString() }),
      supabase.from("profile_private").upsert({ user_id: uid, last_name: f.last_name.trim().slice(0, 50), phone: formatFrenchPhone(f.phone), updated_at: new Date().toISOString() }),
    ]);
    setSaving(false);
    if (a.error || b.error) { toast.error(friendlyError(a.error ?? b.error)); return; }
    toast.success("Profil enregistré !");
    qc.invalidateQueries({ queryKey: ["profile", uid] });
  };

  const resend = async () => {
    const { error } = await supabase.auth.resend({ type: "signup", email: user!.email!, options: { emailRedirectTo: window.location.origin } });
    if (error) toast.error(friendlyError(error));
    else toast.success("Email de confirmation renvoyé !");
  };
  const checkClicked = async () => {
    const u = await refreshUser();
    if (u?.email_confirmed_at) toast.success("Email vérifié, bienvenue dans le convoi !");
    else toast.warning("Pas encore vérifié : clique sur le lien reçu par email, puis réessaie.");
  };
  const up = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form onSubmit={save} className="glass-card grid gap-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5"><Label htmlFor="pf-fn">Prénom</Label><Input id="pf-fn" value={f.first_name} onChange={(e) => up("first_name", e.target.value)} maxLength={50} /></div>
          <div className="grid gap-1.5"><Label htmlFor="pf-ln">Nom</Label><Input id="pf-ln" value={f.last_name} onChange={(e) => up("last_name", e.target.value)} maxLength={50} /></div>
          <div className="grid gap-1.5"><Label htmlFor="pf-ph">Téléphone</Label><Input id="pf-ph" type="tel" value={f.phone} onChange={(e) => up("phone", e.target.value)} placeholder="06 12 34 56 78" /></div>
          <div className="grid gap-1.5"><Label htmlFor="pf-city">Ville</Label><Input id="pf-city" value={f.city} onChange={(e) => up("city", e.target.value)} maxLength={80} /></div>
        </div>
        <div className="grid gap-1.5"><Label htmlFor="pf-veh">Véhicule</Label><Input id="pf-veh" value={f.vehicle} onChange={(e) => up("vehicle", e.target.value)} maxLength={80} /></div>
        <div className="grid gap-1.5"><Label htmlFor="pf-bio">Bio</Label><Textarea id="pf-bio" rows={4} value={f.bio} onChange={(e) => up("bio", e.target.value)} maxLength={500} /></div>
        <p className="text-xs text-muted-foreground">Ton nom et ton téléphone restent privés : ils ne sont visibles qu'après confirmation d'une réservation.</p>
        <Button type="submit" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
      </form>
      <aside className="grid h-fit gap-4">
        <div className={`glass-card p-5 ${emailConfirmed ? "border-success/30" : "border-warning/30"}`}>
          <p className="label-mono text-muted-foreground">Email</p>
          <p className="mt-1 truncate text-sm font-semibold">{user!.email}</p>
          {emailConfirmed ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-success-strong"><CheckCircle2 className="h-4 w-4" /> Email vérifié</p>
          ) : (
            <>
              <p className="mt-3 flex items-center gap-2 text-sm text-warning-strong"><MailWarning className="h-4 w-4" /> Email non vérifié</p>
              <div className="mt-3 grid gap-2">
                <Button variant="outline" size="sm" onClick={resend}>Renvoyer l'email</Button>
                <Button variant="success" size="sm" onClick={checkClicked}>J'ai cliqué sur le lien</Button>
              </div>
            </>
          )}
        </div>
        <div className="glass-card p-5">
          <p className="label-mono text-muted-foreground">Ma note</p>
          <StarRating className="mt-2" avg={ratings?.[uid]?.avg} count={ratings?.[uid]?.count} />
          <div className="mt-3 grid gap-2">
            {(reviews ?? []).map((r) => (
              <div key={r.id} className="rounded-xl border border-hairline bg-background/40 p-3 text-sm">
                <div className="flex items-center gap-1 font-semibold">{r.author?.first_name ?? "Membre"} · {r.rating}<Star className="h-3 w-3 fill-warning-strong text-warning-strong" /></div>
                {r.comment && <p className="mt-1 text-muted-foreground">{r.comment}</p>}
              </div>
            ))}
            {reviews?.length === 0 && <p className="text-xs text-muted-foreground">Aucun avis pour l'instant.</p>}
          </div>
        </div>
        <Button variant="ghost" onClick={signOut}>Se déconnecter</Button>
      </aside>
    </div>
  );
}
