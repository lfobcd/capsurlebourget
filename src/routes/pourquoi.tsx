import { createFileRoute, Link } from "@tanstack/react-router";
import { HandHeart, Landmark, ShieldCheck, Users } from "lucide-react";
import { LEGAL } from "@/config/event";
import { FadeIn, Page } from "@/components/common";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pourquoi")({
  head: () => ({
    meta: [
      { title: "Pourquoi ce site — Cap sur le Bourget" },
      { name: "description", content: "Une initiative citoyenne, indépendante et bénévole pour faciliter l'exercice de la liberté de réunion, sans aucun profit." },
      { property: "og:title", content: "Pourquoi Cap sur le Bourget ?" },
      { property: "og:description", content: "Initiative citoyenne, indépendante et bénévole : se déplacer ensemble, sans profit." },
    ],
  }),
  component: WhyPage,
});

const BLOCKS = [
  {
    icon: Landmark,
    title: "La liberté de réunion",
    text: "Se rassembler pour écouter, débattre et construire ensemble est une liberté fondamentale. Mais quand on habite loin, sans voiture ou avec un petit budget, s'y rendre peut devenir un obstacle. Ce site existe pour lever cet obstacle.",
  },
  {
    icon: Users,
    title: "Une initiative citoyenne",
    text: "Cap sur le Bourget a été imaginé par des citoyennes et des citoyens, pour d'autres citoyennes et citoyens. Pas de structure commerciale, pas d'actionnaires : juste l'envie de faire voyager le plus de monde possible.",
  },
  {
    icon: ShieldCheck,
    title: "Indépendante",
    text: LEGAL.disclaimer,
  },
  {
    icon: HandHeart,
    title: "Bénévole et sans profit",
    text: "Aucun paiement en ligne, aucune commission, aucune publicité. Les frais se partagent de la main à la main, plafonnés au coût réel du carburant et des péages. Personne ne gagne d'argent ici — on gagne du temps, des rencontres et de la fraternité.",
  },
];

function WhyPage() {
  return (
    <Page className="max-w-5xl">
      <header className="mb-10">
        <p className="label-mono text-warning-strong">Pourquoi ce site</p>
        <h1 className="title-display mt-3 text-5xl sm:text-7xl">
          Se déplacer <span className="bg-gradient-to-r from-warning-strong to-warning bg-clip-text text-transparent">ensemble</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Parce qu'un grand rassemblement se prépare aussi sur la route : dans les voitures partagées, les cafés du matin et les discussions entre inconnus qui ne le restent pas longtemps.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {BLOCKS.map((b, i) => (
          <FadeIn key={b.title} delay={i * 0.06}>
            <div className="glass-card h-full border-warning/15 p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-warning/15 text-warning-strong">
                <b.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold uppercase tracking-tight">{b.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">{b.text}</p>
            </div>
          </FadeIn>
        ))}
      </div>
      <div className="glass-card mt-6 border-warning/25 bg-warning/[0.05] p-6 text-sm text-warning-strong">
        {LEGAL.costSharing}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link to="/trajets">Trouver un trajet</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/proposer">Proposer un trajet</Link>
        </Button>
      </div>
    </Page>
  );
}
