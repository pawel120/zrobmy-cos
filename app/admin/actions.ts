"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

// Full account deletion via the service-role Admin API: removes the
// auth.users row, and the profiles FK cascade cleans everything downstream
// (profile, projects, messages, fires...). No zombie accounts.
export async function deleteAccount(profileId: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) throw new Error(`Nie udało się usunąć konta: ${error.message}`);
  revalidatePath("/admin");
}

export async function createNews(title: string, body: string) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("news").insert({ title: title.trim(), body: body.trim() });
  if (error) throw new Error(`Nie udało się dodać aktualności: ${error.message}`);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteNews(newsId: string) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("news").delete().eq("id", newsId);
  if (error) throw new Error(`Nie udało się usunąć aktualności: ${error.message}`);
  revalidatePath("/admin");
  revalidatePath("/");
}

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