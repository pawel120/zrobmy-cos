"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 1. Definiujemy typy sztywno w tym pliku, żeby TS nie miał wyjścia
type FixedDatabase = {
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

async function assertAdmin() {
  // 2. Rzutujemy oryginalnego klienta na nasz sztywny typ bazy danych
  const supabase = createClient() as unknown as ReturnType<typeof createClient> & {
    from<T extends keyof FixedDatabase["public"]["Tables"]>(table: T): any;
  };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Musisz być zalogowany.");
  
  // Tutaj oszukujemy TS na poziomie tej metody, mapując ręcznie strukturę tablei:
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) throw new Error("Brak uprawnień administratora.");

  return supabase;
}

export async function setProfileShadowban(profileId: string, shadowbanned: boolean) {
  const supabase = await assertAdmin();
  
  const { error } = await (supabase as any)
    .from("profiles")
    .update({ is_shadowbanned: shadowbanned })
    .eq("id", profileId);

  if (error) throw new Error("Nie udało się zaktualizować profilu.");
  revalidatePath("/admin");
}

export async function deleteProfile(profileId: string) {
  const supabase = await assertAdmin();
  const { error } = await (supabase as any).from("profiles").delete().eq("id", profileId);

  if (error) throw new Error("Nie udało się usunąć profilu.");
  revalidatePath("/admin");
}

export async function setProjectShadowban(projectId: string, shadowbanned: boolean) {
  const supabase = await assertAdmin();
  const { error } = await (supabase as any)
    .from("projects")
    .update({ is_shadowbanned: shadowbanned })
    .eq("id", projectId);

  if (error) throw new Error("Nie udało się zaktualizować projektu.");
  revalidatePath("/admin");
}

export async function deleteProject(projectId: string) {
  const supabase = await assertAdmin();
  const { error } = await (supabase as any).from("projects").delete().eq("id", projectId);

  if (error) throw new Error("Nie udało się usunąć projektu.");
  revalidatePath("/admin");
}