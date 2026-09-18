import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";

/**
 * Privileged Supabase client using the service role key. Bypasses RLS.
 * ONLY import this from server-only code (API route handlers). Every call
 * site is responsible for its own authorization checks (session ownership,
 * team secret token, session membership) since RLS no longer applies.
 */
export function createAdminClient() {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
