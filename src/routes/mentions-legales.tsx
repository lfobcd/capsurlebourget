import { createFileRoute } from "@tanstack/react-router";
import { EVENT, LEGAL, PRICING } from "@/config/event";
import { Page, PageHeader } from "@/components/common";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales et règles d'usage — Cap sur le Bourget" },
      { name: "description", content: "Éditeur, hébergement, données personnelles et règles d'usage de la plateforme citoyenne Cap sur le Bourget." },
      { property: "og:title", content: "Mentions légales — Cap sur le Bourget" },
      { property: "og:description", content: "Mentions légales et règles d'usage de la plateforme." },
    ],
  }),
  component: LegalPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card p-6">
      <h2 className="font-display text-xl font-bold uppercase tracking-tight">{title}</h2>
      <div className="mt-3 grid gap-2 text-sm leading-relaxed text-foreground/80">{children}</div>
    </section>
  );
}

function LegalPage() {
  return (
    <Page className="max-w-4xl">
      <PageHeader eyebrow="Cadre" title="Mentions légales" highlight="& règles" />
      <div className="grid gap-4">
        <Section title="Éditeur">
          <p>{LEGAL.editor}. Contact : {LEGAL.contactEmail}.</p>
          <p>{LEGAL.disclaimer}</p>
          <p className="text-warning-strong">{LEGAL.toConfirm}</p>
        </Section>
        <Section title="Hébergement">
          <p>{LEGAL.host}.</p>
        </Section>
        <Section title="L'événement">
          <p>
            {EVENT.title} — {EVENT.dateLabel}, portes {EVENT.doorsOpen}, début {EVENT.start}. {EVENT.venue.name}, {EVENT.venue.hall}, {EVENT.venue.address}, {EVENT.venue.postcode}{" "}
            {EVENT.venue.city}. Ces informations sont données à titre indicatif et doivent être vérifiées sur les canaux officiels.
          </p>
        </Section>
        <Section title="Données personnelles">
          <p>
            Nous collectons uniquement ce qui est nécessaire au covoiturage : prénom, nom, email, téléphone et, si tu le souhaites, ville, véhicule et courte présentation. Ton téléphone
            et ton nom ne sont visibles que par toi et par les personnes avec qui une réservation est confirmée.
          </p>
          <p>Aucune donnée n'est vendue ni utilisée à des fins commerciales ou de prospection politique. Tu peux demander la suppression de ton compte à tout moment par email.</p>
        </Section>
        <Section title="Règles d'usage">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Le prix par place ne peut excéder le partage réel des frais de carburant et de péage, et en tout cas {PRICING.capPerKm.toFixed(2).replace(".", ",")} € par km et par
              passager, dans la limite de {PRICING.absoluteCap} €.
            </li>
            <li>{LEGAL.costSharing}</li>
            <li>Respect, bienveillance et sécurité : aucun propos discriminatoire, haineux ou harcelant n'est toléré.</li>
            <li>Le conducteur ou la conductrice doit être titulaire d'un permis valide et d'une assurance couvrant les passagers.</li>
            <li>Annule le plus tôt possible si tu ne peux plus venir : d'autres attendent une place.</li>
            <li>Tout abus peut être signalé ; les comptes concernés peuvent être suspendus.</li>
          </ul>
        </Section>
        <Section title="Responsabilité">
          <p>
            La plateforme met en relation des particuliers et n'est pas partie aux trajets. Chaque membre reste responsable de ses annonces, de ses échanges et du bon déroulement du
            trajet.
          </p>
        </Section>
      </div>
    </Page>
  );
}
