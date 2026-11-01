import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null; error: unknown }> }; userId: string };

async function assertAdmin(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error || !data) throw new Error("Accès réservé aux administrateurs.");
}

export type AdminMember = {
  id: string;
  email: string;
  confirmed: boolean;
  banned: boolean;
  isAdmin: boolean;
  createdAt: string;
  lastSignIn: string | null;
};

export const adminListMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminMember[]> => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
    const admins = new Set((roles ?? []).map((r) => r.user_id));
    const now = Date.now();
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      confirmed: !!u.email_confirmed_at,
      banned: !!u.banned_until && new Date(u.banned_until).getTime() > now,
      isAdmin: admins.has(u.id),
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
    }));
  });

const target = z.object({ userId: z.string().uuid() });

export const adminDeleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => target.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    if (data.userId === context.userId) throw new Error("Tu ne peux pas supprimer ton propre compte depuis l'administration.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetSuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => target.extend({ suspended: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    if (data.userId === context.userId) throw new Error("Tu ne peux pas suspendre ton propre compte.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: data.suspended ? "876000h" : "none" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
