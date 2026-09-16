import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppUser } from "@shared/types";
import { createRequestSupabase, getUserFromAccessToken } from "../supabase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: AppUser | null;
  supabase: SupabaseClient | null;
};

function appUserFromSupabase(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): AppUser {
  const name = (user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? null) as string | null;
  return { id: user.id, openId: user.id, email: user.email ?? null, name, role: "user" };
}

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  const authorization = opts.req.headers.authorization ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const supabaseUser = await getUserFromAccessToken(token);
  return {
    req: opts.req,
    res: opts.res,
    user: supabaseUser ? appUserFromSupabase(supabaseUser) : null,
    supabase: token && supabaseUser ? createRequestSupabase(token) : null,
  };
}
