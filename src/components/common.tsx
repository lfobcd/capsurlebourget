import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, Lock, MailWarning, Star } from "lucide-react";
import { EVENT, LEGAL } from "@/config/event";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-7xl px-4 pt-8 lg:px-6 lg:pt-12", className)}>{children}</main>;
}

export function PageHeader({
  eyebrow,
  title,
  highlight,
  children,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  children?: ReactNode;
}) {
  return (
    <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
      <p className="label-mono text-primary-glow">{eyebrow}</p>
      <h1 className="title-display mt-3 text-4xl sm:text-5xl lg:text-6xl">
        {title} {highlight && <span className="text-crimson">{highlight}</span>}
      </h1>
      {children && <div className="mt-4 max-w-2xl text-muted-foreground">{children}</div>}
    </motion.header>
  );
}

export function FadeIn({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function EarlyTip({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-warning/25 bg-warning/[0.08] px-4 py-3 text-sm text-warning-strong", className)}>
      <Clock className="h-4 w-4 shrink-0" />
      <span className="font-medium">{EVENT.earlyTip}</span>
    </div>
  );
}

export function CostReminder({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border border-hairline bg-card/60 px-4 py-3 text-xs text-muted-foreground", className)}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <span>{LEGAL.costSharing}</span>
    </div>
  );
}

export function StarRating({ avg, count, className }: { avg?: number | undefined; count?: number | undefined; className?: string }) {
  if (!count) return <span className={cn("text-xs text-muted-foreground", className)}>Nouveau membre</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", className)}>
      <Star className="h-3.5 w-3.5 fill-warning-strong text-warning-strong" />
      <span className="font-semibold">{avg!.toFixed(1)}</span>
      <span className="text-muted-foreground">({count} avis)</span>
    </span>
  );
}

export function Tag({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "red" | "amber" | "green" }) {
  const tones = {
    default: "border-hairline bg-secondary/60 text-foreground/80",
    red: "border-primary/30 bg-primary/10 text-primary-glow",
    amber: "border-warning/30 bg-warning/10 text-warning-strong",
    green: "border-success/30 bg-success/10 text-success-strong",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium", tones[tone])}>{children}</span>;
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="glass-card flex flex-col items-center px-6 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-hairline bg-secondary/60 text-primary-glow">{icon}</div>
      <h3 className="mt-5 font-display text-xl font-bold uppercase tracking-tight">{title}</h3>
      {children && <div className="mt-2 max-w-md text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

/** Affiche une invitation à se connecter (et éventuellement à confirmer son email) au lieu du contenu. */
export function RequireAuth({
  children,
  requireVerified = false,
  reason,
}: {
  children: ReactNode;
  requireVerified?: boolean;
  reason: string;
}) {
  const { user, loading, emailConfirmed } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline-strong border-t-primary" aria-label="Chargement" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="glass-card p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary-glow">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="title-display mt-5 text-3xl">Rejoins le convoi</h2>
          <p className="mt-3 text-sm text-muted-foreground">{reason}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="/auth" search={{ mode: "login" }}>Se connecter</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/auth" search={{ mode: "signup" }}>Créer un compte</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
  if (requireVerified && !emailConfirmed) return <VerifyEmailNotice />;
  return <>{children}</>;
}

export function VerifyEmailNotice() {
  return (
    <div className="mx-auto max-w-lg">
      <div className="glass-card border-warning/30 p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-warning/15 text-warning-strong">
          <MailWarning className="h-6 w-6" />
        </div>
        <h2 className="title-display mt-5 text-3xl">Confirme ton email</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Pour publier, réserver ou écrire, ton adresse email doit être vérifiée. Clique sur le lien reçu, puis reviens ici.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/profil">Gérer mon email</Link>
        </Button>
      </div>
    </div>
  );
}

export function Spinner() {
  return <div className="h-6 w-6 animate-spin rounded-full border-2 border-hairline-strong border-t-primary" aria-label="Chargement" />;
}
