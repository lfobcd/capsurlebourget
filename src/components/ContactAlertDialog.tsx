import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BellRing, MessageSquareText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CONTACT_RULES } from "@/config/event";
import { friendlyError, useAuth } from "@/lib/auth";
import { alertMessage, smsUrl, whatsappUrl, type AlertContext } from "@/lib/contact";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  bookingId: string;
  context: Omit<AlertContext, "senderName">;
  intro?: string;
};

/** Fenêtre « Prévenir par SMS / WhatsApp » : règles à accepter, alerte comptée et enregistrée, puis liens préremplis. */
export function ContactAlertDialog({ open, onOpenChange, bookingId, context, intro }: Props) {
  const { user } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);

  const { data: me } = useQuery({
    queryKey: ["my-first-name", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("first_name").eq("id", user!.id).maybeSingle();
      return data?.first_name ?? "";
    },
  });

  const unlock = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("request_contact_alert", { _booking_id: bookingId, _accept_rules: accepted });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (p) => setPhone(p),
    onError: (e) => toast.error(friendlyError(e)),
  });

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setPhone(null);
      setAccepted(false);
    }
  };

  const body = alertMessage({ ...context, senderName: me ?? "" });
  const target = context.role === "passenger" ? "le ou la conducteur·rice" : "ton passager ou ta passagère";
  const wa = phone ? whatsappUrl(phone, body) : null;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="glass-card max-h-[90vh] overflow-y-auto border-hairline-strong">
        <DialogHeader>
          <DialogTitle className="title-display flex items-center gap-2 text-2xl">
            <BellRing className="h-5 w-5 text-primary-glow" /> Prévenir par SMS / WhatsApp
          </DialogTitle>
          <DialogDescription>{intro ?? `Envoie une alerte courte pour que ${target} soit prévenu·e tout de suite.`}</DialogDescription>
        </DialogHeader>

        {!phone ? (
          <div className="grid gap-4">
            <div className="rounded-xl border border-warning/30 bg-warning/[0.07] p-4">
              <p className="label-mono flex items-center gap-1.5 text-warning-strong">
                <ShieldCheck className="h-3.5 w-3.5" /> Règles d'envoi
              </p>
              <ul className="mt-3 grid gap-2 text-sm text-foreground/90">
                {CONTACT_RULES.rules.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                    {r}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">{CONTACT_RULES.privacyNote}</p>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-hairline bg-background/50 p-3 text-sm">
              <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-0.5" />
              <span>Je m'engage à respecter ces règles et à n'utiliser ce numéro que pour ce trajet.</span>
            </label>
            <Button size="lg" disabled={!accepted || unlock.isPending} onClick={() => unlock.mutate()}>
              {unlock.isPending ? "Vérification…" : "Continuer"}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="rounded-xl border border-hairline bg-background/50 p-4">
              <p className="label-mono text-muted-foreground">Message prérempli</p>
              <p className="mt-2 text-sm">{body}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild size="lg">
                <a href={smsUrl(phone, body)}>
                  <MessageSquareText /> Par SMS
                </a>
              </Button>
              {wa ? (
                <Button asChild size="lg" variant="success">
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    Par WhatsApp
                  </a>
                </Button>
              ) : (
                <Button size="lg" variant="outline" disabled>
                  WhatsApp indisponible
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Le message part depuis ton téléphone et ton forfait. Alerte comptée : il t'en reste au maximum {CONTACT_RULES.maxPerBooking - 1} pour cette réservation.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
