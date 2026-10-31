import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QUICK_REPLIES } from "@/config/event";
import { friendlyError, useAuth } from "@/lib/auth";
import { cityOrigin } from "@/lib/data";
import { fmtDate, fmtRelative } from "@/lib/format";
import { EmptyState, Page, PageHeader, RequireAuth } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages")({
  validateSearch: z.object({ c: z.string().uuid().optional() }),
  head: () => ({
    meta: [
      { title: "Messagerie — Cap sur le Bourget" },
      { name: "description", content: "Échange en temps réel avec tes covoitureurs." },
      { property: "og:title", content: "Messagerie — Cap sur le Bourget" },
      { property: "og:description", content: "Discute avec ton conducteur ou tes passagers." },
    ],
  }),
  component: () => (
    <Page>
      <PageHeader eyebrow="Échanges" title="Messa" highlight="gerie" />
      <RequireAuth reason="Connecte-toi pour discuter avec tes covoitureurs.">
        <Inbox />
      </RequireAuth>
    </Page>
  ),
});

type Conv = {
  id: string;
  trip_id: string;
  last_message_at: string;
  trip: { departure_city: string; departure_at: string; trip_type: "aller_retour" | "aller" | "retour" } | null;
  a: { id: string; first_name: string } | null;
  b: { id: string; first_name: string } | null;
};

function Inbox() {
  const { c } = Route.useSearch();
  const navigate = useNavigate();
  const { user, emailConfirmed } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const convs = useQuery({
    queryKey: ["conversations", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, trip_id, last_message_at, trip:trips(departure_city, departure_at, trip_type), a:profiles!conversations_user_a_fkey(id, first_name), b:profiles!conversations_user_b_fkey(id, first_name)")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      const { data: unread } = await supabase.from("messages").select("conversation_id").is("read_at", null).neq("sender_id", uid);
      const counts: Record<string, number> = {};
      for (const m of unread ?? []) counts[m.conversation_id] = (counts[m.conversation_id] ?? 0) + 1;
      return { list: (data ?? []) as unknown as Conv[], counts };
    },
  });

  const msgs = useQuery({
    queryKey: ["messages", c],
    enabled: !!c,
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", c!).order("created_at").limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!c) return undefined;
    supabase.rpc("mark_conversation_read", { _conversation_id: c }).then(() => {
      qc.invalidateQueries({ queryKey: ["unread", uid] });
    });
    const ch = supabase
      .channel(`thread-${c}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${c}` }, () => {
        qc.invalidateQueries({ queryKey: ["messages", c] });
        supabase.rpc("mark_conversation_read", { _conversation_id: c }).then(() => qc.invalidateQueries({ queryKey: ["unread", uid] }));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [c, uid, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.data?.length]);

  const send = async (body: string) => {
    const t = body.trim();
    if (!t || !c) return;
    if (!emailConfirmed) { toast.warning("Confirme ton email pour pouvoir écrire."); return; }
    setText("");
    const { error } = await supabase.from("messages").insert({ conversation_id: c, sender_id: uid, body: t.slice(0, 2000) });
    if (error) {
      toast.error(friendlyError(error));
      setText(t);
    } else qc.invalidateQueries({ queryKey: ["messages", c] });
  };

  const current = convs.data?.list.find((x) => x.id === c);
  const other = (x: Conv) => (x.a?.id === uid ? x.b : x.a);

  if (convs.data && convs.data.list.length === 0)
    return (
      <EmptyState icon={<MessageCircle className="h-6 w-6" />} title="Aucune conversation">
        Contacte un conducteur depuis la page d'un trajet pour démarrer un échange.
      </EmptyState>
    );

  return (
    <div className="glass-card grid h-[70vh] min-h-[480px] overflow-hidden md:grid-cols-[300px_1fr]">
      <ul className={cn("overflow-y-auto border-r border-hairline", c && "hidden md:block")}>
        {(convs.data?.list ?? []).map((x) => {
          const n = convs.data!.counts[x.id] ?? 0;
          const route = x.trip ? cityOrigin(x.trip) : null;
          return (
            <li key={x.id}>
              <button
                onClick={() => navigate({ to: "/messages", search: { c: x.id } })}
                className={cn("flex w-full items-center gap-3 border-b border-hairline px-4 py-3 text-left hover:bg-accent/50", x.id === c && "bg-card-active")}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary font-bold uppercase">{other(x)?.first_name?.[0] ?? "?"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{other(x)?.first_name ?? "Membre"}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {route ? `${route.from} → ${route.to}` : "Trajet supprimé"} · {fmtRelative(x.last_message_at)}
                  </span>
                </span>
                {n > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{n}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <section className={cn("flex min-h-0 flex-col", !c && "hidden md:flex")}>
        {!current ? (
          <div className="grid flex-1 place-items-center text-sm text-muted-foreground">Choisis une conversation.</div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-hairline px-4 py-3">
              <button className="md:hidden" onClick={() => navigate({ to: "/messages", search: {} })} aria-label="Retour">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <p className="font-semibold">{other(current)?.first_name}</p>
                {current.trip && (
                  <p className="text-xs text-muted-foreground">
                    {cityOrigin(current.trip).from} → {cityOrigin(current.trip).to} · {fmtDate(current.trip.departure_at)}
                  </p>
                )}
              </div>
            </header>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {(msgs.data ?? []).map((m) => (
                <div key={m.id} className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm", m.sender_id === uid ? "ml-auto bg-crimson text-primary-foreground" : "bg-secondary")}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className="mt-0.5 text-right text-[10px] opacity-70">{fmtRelative(m.created_at)}</p>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="flex gap-2 overflow-x-auto border-t border-hairline px-3 pt-3">
              {QUICK_REPLIES.map((q) => (
                <button key={q} onClick={() => send(q)} className="shrink-0 rounded-full border border-hairline px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
                  {q}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                send(text);
              }}
            >
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Écris ton message…" maxLength={2000} aria-label="Message" />
              <Button type="submit" size="icon" aria-label="Envoyer">
                <Send />
              </Button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
