import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/lib/auth";
import { Footer, Header, LiveNotifications, MobileNav, TopBanner } from "@/components/layout/SiteChrome";
import { MusicPlayer } from "@/components/layout/MusicPlayer";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-numeric text-8xl text-crimson">404</h1>
        <h2 className="title-display mt-4 text-2xl">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">Cette route ne mène nulle part… mais le Bourget t'attend !</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-crimson px-5 py-2.5 text-sm font-bold uppercase text-primary-foreground"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="title-display text-2xl">Cette page n'a pas pu se charger</h1>
        <p className="mt-2 text-sm text-muted-foreground">Un souci de notre côté. Réessaie ou reviens à l'accueil.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-crimson px-4 py-2 text-sm font-bold uppercase text-primary-foreground"
          >
            Réessayer
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-xl border border-hairline-strong px-4 py-2 text-sm">
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#05070E" },
      { title: "Cap sur le Bourget — Covoiturage citoyen du 7 novembre" },
      { name: "description", content: "Plateforme citoyenne et bénévole de covoiturage pour rejoindre le grand meeting du 7 novembre au Bourget." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="page-glow flex min-h-screen flex-col">
          <TopBanner />
          <Header />
          <div className="flex-1">
            <Outlet />
          </div>
          <Footer />
        </div>
        <MobileNav />
        <MusicPlayer />
        <LiveNotifications />
        <Toaster position="top-center" theme="dark" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
