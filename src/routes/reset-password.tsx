import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/auth";
import { passwordSchema } from "@/lib/validation";
import { Page } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — Cap sur le Bourget" },
      { name: "description", content: "Choisis un nouveau mot de passe pour ton compte Cap sur le Bourget." },
      { property: "og:title", content: "Nouveau mot de passe — Cap sur le Bourget" },
      { property: "og:description", content: "Réinitialisation du mot de passe." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = passwordSchema.safeParse(pw);
    if (!p.success) return toast.error(p.error.issues[0].message);
    if (pw !== pw2) return toast.error("Les deux mots de passe ne correspondent pas.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return toast.error(friendlyError(error));
    toast.success("Mot de passe mis à jour !");
    navigate({ to: "/profil" });
  };

  return (
    <Page className="max-w-lg">
      <div className="glass-card p-6 sm:p-8">
        <h1 className="title-display text-3xl">Nouveau mot de passe</h1>
        {!ready ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Ouvre cette page depuis le lien reçu par email. Si le lien a expiré, redemande-le depuis « Mot de passe oublié ».
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="r-pw">Nouveau mot de passe</Label>
              <Input id="r-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="r-pw2">Confirme-le</Label>
              <Input id="r-pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Mise à jour…" : "Enregistrer"}
            </Button>
          </form>
        )}
      </div>
    </Page>
  );
}
