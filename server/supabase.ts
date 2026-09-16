import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://uaikowbjwqezybpliecg.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_M29XDeOpsRPtT2LB7lEKZQ_66EXIreP";

export function createRequestSupabase(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export async function getUserFromAccessToken(accessToken: string): Promise<User | null> {
  if (!accessToken) return null;
  const client = createRequestSupabase(accessToken);
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
}
