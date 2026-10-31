import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, useAuth } from "@/lib/auth";
import { emailSchema, formatFrenchPhone, nameSchema, passwordSchema, phoneSchema } from "@/lib/validation";
import { LogoMark } from "@/components/layout/SiteChrome";
import { Page } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ mode: z.enum(["login", "signup", "forgot"]).optional() }),
  head: () => ({
    meta: [
      { title: "Connexion & inscription — Cap sur le Bourget" },
      { name: "description", content: "Crée ton compte ou connecte-toi pour proposer, réserver et échanger avec le convoi solidaire vers le Bourget." },
      { property: "og:title", content: "Rejoindre Cap sur le Bourget" },
      { property: "og:description", content: "Inscription gratuite à la plateforme citoyenne de covoiturage." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  first_name: nameSchema("Le prénom"),
  last_name: nameSchema("Le nom"),
  phone: phoneSchema,
  email: emailSchema,
  password: passwordSchema,
});

function AuthPage() {
  const { mode = "login" } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState<string | null>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const up = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (user && mode !== "forgot") navigate({ to: "/profil", replace: true });
  }, [user, mode, navigate]);

  const setMode = (m: "login" | "signup" | "forgot") => {
    setErrors({});
    setSentTo(null);
    navigate({ to: "/auth", search: { mode: m }, replace: true });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      if (mode === "signup") {
        const parsed = signupSchema.safeParse(form);
        if (!parsed.success) {
          const errs: Record<string, string> = {};
          for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
          setErrors(errs);
          return;
        }
        const v = parsed.data;
        const { error } = await supabase.auth.signUp({
          email: v.email,
          password: v.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { first_name: v.first_name, last_name: v.last_name, phone: formatFrenchPhone(v.phone) },
          },
        });
        if (error) throw error;
        setSentTo(v.email);
        toast.success("Compte créé ! Vérifie ta boîte mail.");
      } else if (mode === "login") {
        const email = emailSchema.safeParse(form.email);
        if (!email.success) return setErrors({ email: email.error.issues[0].message });
        if (!form.password) return setErrors({ password: "Indique ton mot de passe." });
        const { error } = await supabase.auth.signInWithPassword({ email: email.data, password: form.password });
        if (error) {
          if (/Email not confirmed/i.test(error.message)) setUnconfirmed(email.data);
          throw error;
        }
        toast.success("Bon retour parmi nous !");
        navigate({ to: "/" });
      } else {
        const email = emailSchema.safeParse(form.email);
        if (!email.success) return setErrors({ email: email.error.issues[0].message });
        const { error } = await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setSentTo(email.data);
        toast.success("Email de réinitialisation envoyé.");
      }
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!unconfirmed) return;
    const { error } = await supabase.auth.resend({ type: "signup", email: unconfirmed, options: { emailRedirectTo: window.location.origin } });
    if (error) toast.error(friendlyError(error));
    else toast.success("Nouvel email de confirmation envoyé !");
  };

  const Err = ({ k }: { k: string }) => (errors[k] ? <p className="text-xs text-primary-glow">{errors[k]}</p> : null);

  return (
    <Page className="max-w-lg">
      <div className="glass-card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div>
            <p className="label-mono text-primary-glow">Cap sur le Bourget</p>
            <h1 className="title-display text-3xl">
              {mode === "signup" ? "Créer un compte" : mode === "forgot" ? "Mot de passe oublié" : "Connexion"}
            </h1>
          </div>
        </div>

        {mode !== "forgot" && (
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-hairline bg-background/50 p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn("rounded-lg py-2 text-sm font-semibold", mode === m ? "bg-card-active text-foreground" : "text-muted-foreground")}
              >
                {m === "login" ? "Se connecter" : "S'inscrire"}
              </button>
            ))}
          </div>
        )}

        {sentTo ? (
          <div className="mt-6 rounded-xl border border-success/30 bg-success/10 p-5 text-sm">
            <MailCheck className="h-6 w-6 text-success-strong" />
            <p className="mt-3 font-semibold text-success-strong">Regarde ta boîte mail !</p>
            <p className="mt-1 text-foreground/85">
              {mode === "signup"
                ? `On a envoyé un lien de confirmation à ${sentTo}. Clique dessus pour activer ton compte, puis connecte-toi.`
                : `Si un compte existe pour ${sentTo}, tu vas recevoir un lien pour choisir un nouveau mot de passe.`}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Pense à vérifier tes spams.</p>
            <Button variant="outline" className="mt-4" onClick={() => setMode("login")}>
              Aller à la connexion
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
            {mode === "signup" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="a-fn">Prénom</Label>
                    <Input id="a-fn" autoComplete="given-name" value={form.first_name} onChange={(e) => up("first_name", e.target.value)} maxLength={50} />
                    <Err k="first_name" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="a-ln">Nom</Label>
                    <Input id="a-ln" autoComplete="family-name" value={form.last_name} onChange={(e) => up("last_name", e.target.value)} maxLength={50} />
                    <Err k="last_name" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="a-ph">Téléphone</Label>
                  <Input id="a-ph" type="tel" autoComplete="tel" placeholder="06 12 34 56 78" value={form.phone} onChange={(e) => up("phone", e.target.value)} />
                  <p className="text-[11px] text-muted-foreground">Visible uniquement par tes covoitureurs, après confirmation d'une réservation.</p>
                  <Err k="phone" />
                </div>
              </>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="a-em">Email</Label>
              <Input id="a-em" type="email" autoComplete="email" value={form.email} onChange={(e) => up("email", e.target.value)} />
              <Err k="email" />
            </div>
            {mode !== "forgot" && (
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="a-pw">Mot de passe</Label>
                  {mode === "login" && (
                    <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary-glow hover:underline">
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
                <Input
                  id="a-pw"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={form.password}
                  onChange={(e) => up("password", e.target.value)}
                />
                <Err k="password" />
              </div>
            )}
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Un instant…" : mode === "signup" ? "Créer mon compte" : mode === "forgot" ? "Envoyer le lien" : "Se connecter"}
            </Button>
            {unconfirmed && mode === "login" && (
              <Button type="button" variant="outline" onClick={resend}>
                Renvoyer l'email de confirmation
              </Button>
            )}
            {mode === "forgot" && (
              <button type="button" onClick={() => setMode("login")} className="text-sm text-muted-foreground hover:text-foreground">
                ← Retour à la connexion
              </button>
            )}
            {mode === "signup" && (
              <p className="text-center text-[11px] text-muted-foreground">
                En créant un compte, tu acceptes les{" "}
                <Link to="/mentions-legales" className="underline">
                  règles d'usage
                </Link>
                .
              </p>
            )}
          </form>
        )}
      </div>
    </Page>
  );
}
