import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  emailConfirmed: boolean;
  refreshUser: () => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        queryClient.invalidateQueries();
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  const refreshUser = async () => {
    await supabase.auth.refreshSession();
    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);
    return data.user ?? null;
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        emailConfirmed: !!user?.email_confirmed_at,
        refreshUser,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}

/** Traduit les erreurs techniques en messages bienveillants. */
export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : String(err);
  if (/Invalid login credentials/i.test(msg)) return "Email ou mot de passe incorrect. Vérifie et réessaie.";
  if (/Email not confirmed/i.test(msg)) return "Ton email n'est pas encore confirmé : clique sur le lien reçu par email.";
  if (/User already registered/i.test(msg)) return "Un compte existe déjà avec cet email. Connecte-toi plutôt !";
  if (/rate limit|too many/i.test(msg)) return "Trop de tentatives d'un coup. Patiente quelques minutes et réessaie.";
  if (/Password should be/i.test(msg)) return "Ton mot de passe est trop faible : 8 caractères minimum.";
  if (/pwned|leaked|compromised/i.test(msg)) return "Ce mot de passe a fuité sur Internet : choisis-en un autre.";
  if (/row-level security|permission denied/i.test(msg)) return "Action non autorisée. Vérifie que tu es connecté·e et que ton email est confirmé.";
  if (/price_per_seat|trips_check/i.test(msg)) return "Le prix dépasse le plafond autorisé (0,08 €/km/passager, 45 € max).";
  if (/Failed to fetch|NetworkError/i.test(msg)) return "Connexion impossible. Vérifie ton réseau et réessaie.";
  return msg || "Oups, quelque chose s'est mal passé. Réessaie dans un instant.";
}
