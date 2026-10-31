import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, useAuth } from "@/lib/auth";
import { Page, PageHeader, RequireAuth } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signaler")({
  validateSearch: z.object({ trajet: z.string().uuid().optional(), utilisateur: z.string().uuid().optional() }),
  head: () => ({
    meta: [
      { title: "Signaler un abus — Cap sur le Bourget" },
      { name: "description", content: "Signale un trajet ou un membre : prix excessif, spam, propos inappropriés, faux profil ou problème de sécurité." },
      { property: "og:title", content: "Signaler un abus — Cap sur le Bourget" },
      { property: "og:description", content: "Aide-nous à garder le convoi sûr et fraternel." },
    ],
  }),
  component: () => (
    <Page className="max-w-2xl">
      <PageHeader eyebrow="Modération" title="Signaler un" highlight="abus">
        Ton signalement est confidentiel et lu uniquement par l'équipe de modération bénévole.
      </PageHeader>
      <RequireAuth reason="Connecte-toi pour envoyer un signalement.">
        <ReportForm />
      </RequireAuth>
    </Page>
  ),
});

const REASONS = [
  { id: "prix_excessif", label: "Prix excessif" },
  { id: "spam", label: "Spam" },
  { id: "propos_inappropries", label: "Propos inappropriés" },
  { id: "faux_profil", label: "Faux profil" },
  { id: "securite", label: "Sécurité" },
] as const;

function ReportForm() {
  const s = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState<"trip" | "user">(s.utilisateur ? "user" : "trip");
  const [reason, setReason] = useState<(typeof REASONS)[number]["id"]>("prix_excessif");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = details.trim();
    if (d.length < 10) { toast.error("Décris le problème en quelques mots (10 caractères minimum)."); return; }
    setLoading(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user!.id,
      target_type: type,
      trip_id: s.trajet ?? null,
      target_user_id: s.utilisateur ?? null,
      reason,
      details: d.slice(0, 2000),
    });
    setLoading(false);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("Merci, ton signalement a bien été transmis.");
    navigate({ to: "/" });
  };

  const chip = (on: boolean) => cn("rounded-xl border px-3 py-2 text-sm", on ? "border-primary/50 bg-primary/15" : "border-hairline text-muted-foreground");

  return (
    <form onSubmit={submit} className="glass-card grid gap-5 p-6">
      <div>
        <Label>Je signale</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" className={chip(type === "trip")} onClick={() => setType("trip")}>Un trajet</button>
          <button type="button" className={chip(type === "user")} onClick={() => setType("user")}>Un membre</button>
        </div>
      </div>
      <div>
        <Label>Motif</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button key={r.id} type="button" className={chip(reason === r.id)} onClick={() => setReason(r.id)}>{r.label}</button>
          ))}
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="r-details">Détails</Label>
        <Textarea id="r-details" rows={5} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Explique ce qui s'est passé…" />
      </div>
      <Button type="submit" disabled={loading}>{loading ? "Envoi…" : "Envoyer le signalement"}</Button>
    </form>
  );
}
