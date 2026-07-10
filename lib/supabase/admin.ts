import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS and can call auth.admin.*. Server-only:
// importing this in a client component would leak the key, so it must never
// leave server actions / route handlers. The key comes from Vercel env
// (SUPABASE_SERVICE_ROLE_KEY) and is absent from the browser bundle.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Brak SUPABASE_SERVICE_ROLE_KEY — dodaj sekret w ustawieniach środowiska.");
  }
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
