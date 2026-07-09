"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Musisz być zalogowany.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) throw new Error("Brak uprawnień administratora.");
  return supabase;
}

export async function setProfileShadowban(profileId: string, shadowbanned: boolean) {
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ is_shadowbanned: shadowbanned })
    .eq("id", profileId);
  if (error) throw new Error("Nie udało się zaktualizować profilu.");
  revalidatePath("/admin");
}

// Intentionally no deleteProfile action: deleting the profiles row alone
// orphans the auth.users account (it can still log in, but every FK into
// profiles is broken and the trigger only fires on signup). Full account
// deletion requires the service-role Admin API — until that exists, use
// shadowban here and Supabase's dashboard (Authentication → Users) for
// actual removal, which cascades to the profile correctly.

export async function setProjectShadowban(projectId: string, shadowbanned: boolean) {
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("projects")
    .update({ is_shadowbanned: shadowbanned })
    .eq("id", projectId);
  if (error) throw new Error("Nie udało się zaktualizować projektu.");
  revalidatePath("/admin");
}

export async function deleteProject(projectId: string) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw new Error("Nie udało się usunąć projektu.");
  revalidatePath("/admin");
}

export async function resolveReport(reportId: string) {
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("reports")
    .update({ status: "resolved" })
    .eq("id", reportId);
  if (error) throw new Error("Nie udało się zamknąć zgłoszenia.");
  revalidatePath("/admin");
}