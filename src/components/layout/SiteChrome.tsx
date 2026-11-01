import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Home, Search, Plus, MessageCircle, User, LogOut, Car, ShieldAlert } from "lucide-react";
import { EVENT, LEGAL } from "@/config/event";
import { useAuth, useIsAdmin } from "@/lib/auth";
import { useLiveNotifications, useUnreadCount } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Monte les notifications temps réel (messages, demandes de réservation) pour l'utilisateur connecté. */
export function LiveNotifications() {
  const { user } = useAuth();
  useLiveNotifications(user?.id);
  return null;
}

export function TopBanner() {
  return (
    <div className="border-b border-warning/20 bg-warning/[0.07] px-3 py-1.5 text-center text-[11px] leading-snug text-warning-strong/90">
      <span>{LEGAL.disclaimer}</span> <span className="font-semibold">{LEGAL.toConfirm}</span>
    </div>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid h-9 w-9 place-items-center rounded-xl bg-crimson font-display text-sm font-extrabold tracking-tight text-primary-foreground shadow-glow",
        className,
      )}
      aria-hidden
    >
      {EVENT.logoMark}
    </span>
  );
}

const NAV = [
  { to: "/", label: "Accueil" },
  { to: "/trajets", label: "Trajets" },
  { to: "/plan-acces", label: "Plan d'accès" },
  { to: "/calculateur", label: "Prix juste" },
  { to: "/mes-trajets", label: "Mes trajets" },
  { to: "/messages", label: "Messages" },
] as const;

export function Header() {
  const { user, signOut } = useAuth();
  const unread = useUnreadCount(user?.id);
  const isAdmin = useIsAdmin();
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 lg:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Accueil Cap sur le Bourget">
          <LogoMark />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-display text-sm font-extrabold uppercase tracking-tight sm:text-base">
                Cap sur le Bourget
              </span>
              <span className="rounded-md bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary-glow">
                {EVENT.shortBadge}
              </span>
            </div>
            <p className="hidden truncate text-[11px] text-muted-foreground sm:block">{EVENT.siteTagline}</p>
          </div>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="relative rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground"
            >
              {n.label}
              {n.to === "/messages" && unread > 0 && (
                <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{unread}</span>
              )}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className="relative rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link to="/proposer">
              <Plus /> Proposer
            </Link>
          </Button>
          {user ? (
            <>
              {isAdmin && (
                <Button asChild variant="outline" size="icon" className="hidden md:inline-flex" aria-label="Administration">
                  <Link to="/admin">
                    <ShieldAlert />
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" size="icon" className="hidden md:inline-flex" aria-label="Mon profil">
                <Link to="/profil">
                  <User />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className="hidden md:inline-flex" aria-label="Se déconnecter" onClick={signOut}>
                <LogOut />
              </Button>
            </>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link to="/auth">Connexion</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const { user } = useAuth();
  const unread = useUnreadCount(user?.id);
  const { pathname } = useLocation();
  const item = (to: string, label: string, Icon: typeof Home, badge?: number) => {
    const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
    return (
      <Link
        to={to}
        className={cn(
          "relative flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <Icon className={cn("h-5 w-5", active && "text-primary-glow")} />
        {label}
        {!!badge && badge > 0 && (
          <span className="absolute right-[calc(50%-18px)] top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </Link>
    );
  };
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      aria-label="Navigation mobile"
    >
      <div className="flex items-end px-1">
        {item("/", "Accueil", Home)}
        {item("/trajets", "Trajets", Search)}
        <div className="flex flex-1 justify-center">
          <motion.div whileTap={{ scale: 0.92 }}>
            <Link
              to="/proposer"
              className="-mt-6 flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-crimson text-primary-foreground shadow-glow ring-4 ring-background"
              aria-label="Proposer un trajet"
            >
              <Plus className="h-6 w-6" />
              <span className="text-[9px] font-bold uppercase">Proposer</span>
            </Link>
          </motion.div>
        </div>
        {item("/messages", "Messages", MessageCircle, unread)}
        {item("/profil", "Profil", User)}
      </div>
    </nav>
  );
}

export function Footer() {
  const links = [
    { to: "/trajets", label: "Trouver un trajet" },
    { to: "/proposer", label: "Proposer un trajet" },
    { to: "/calculateur", label: "Calculateur de prix juste" },
    { to: "/plan-acces", label: "Plan d'accès France" },
    { to: "/pourquoi", label: "Pourquoi ce site" },
    { to: "/signaler", label: "Signaler un abus" },
    { to: "/mentions-legales", label: "Mentions légales & règles" },
  ] as const;
  return (
    <footer className="mt-20 border-t border-hairline pb-28 md:pb-10">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-3 lg:px-6">
        <div>
          <div className="flex items-center gap-3">
            <LogoMark />
            <span className="font-display font-extrabold uppercase tracking-tight">Cap sur le Bourget</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{LEGAL.disclaimer}</p>
          <p className="mt-2 text-sm font-medium text-warning-strong">{LEGAL.toConfirm}</p>
        </div>
        <div>
          <p className="label-mono text-muted-foreground">Le site</p>
          <ul className="mt-4 grid gap-2 text-sm">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-foreground/80 hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="label-mono text-muted-foreground">Infos officielles</p>
          <ul className="mt-4 grid gap-2 text-sm">
            {LEGAL.officialLinks.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-foreground/80 hover:text-foreground">
                  {l.label} ↗
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 flex items-start gap-2 rounded-xl border border-hairline bg-card/60 p-3 text-xs text-muted-foreground">
            <Car className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            {LEGAL.costSharing}
          </p>
        </div>
      </div>
      <p className="px-4 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
        {EVENT.siteName} · {EVENT.dateLabel} · Fait avec ❤ par des bénévoles
      </p>
    </footer>
  );
}
