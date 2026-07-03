import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; is_admin: boolean; is_shadowbanned: boolean };
        Insert: { id: string; is_admin?: boolean; is_shadowbanned?: boolean };
        Update: { id?: string; is_admin?: boolean; is_shadowbanned?: boolean };
      };
      projects: {
        Row: { id: string; is_shadowbanned: boolean };
        Insert: { id: string; is_shadowbanned?: boolean };
        Update: { id?: string; is_shadowbanned?: boolean };
      };
    };
  };
};

export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Bezpieczne do zignorowania w Server Components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Bezpieczne do zignorowania w Server Components
          }
        },
      },
    }
  );
}