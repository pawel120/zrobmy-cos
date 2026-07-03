import { createClient } from "./lib/supabase/server";
import type { Database } from "./types/database";

// Does Database satisfy the schema constraint on its own?
type Prof = Database["public"]["Tables"]["profiles"]["Row"];
const p: Prof = null as any;
const check: 1 = p.is_admin;  // reveals Prof.is_admin type

export async function t() {
  const supabase = createClient();
  // If schema is threaded, a bogus table name should error:
  const bad = supabase.from("NOT_A_TABLE");
  return [check, bad];
}
