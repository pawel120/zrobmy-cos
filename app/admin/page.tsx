import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileRow } from "./profile-row";
import { ProjectRow } from "./project-row";
import { ReportRowActions } from "./report-row";
import { NewsAdmin } from "./news-admin";
import type { Profile, Project, Report } from "@/types/database";

interface AdminPageProps {
  searchParams: { tab?: string; q?: string };
}

type Tab = "profiles" | "projects" | "reports" | "news";

interface ReportWithContext extends Report {
  reporter: Profile | null;
  reported_profile: Profile | null;
  reported_project: Project | null;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin");

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  // Defense in depth: middleware already blocks non-admins from reaching
  // this route, but the page checks again independently — and every query
  // below is still bound by RLS regardless of this check.
  if (!callerProfile?.is_admin) redirect("/");

  const tab: Tab =
    searchParams.tab === "projects"
      ? "projects"
      : searchParams.tab === "reports"
        ? "reports"
        : searchParams.tab === "news"
          ? "news"
          : "profiles";
  const q = searchParams.q?.trim() ?? "";

  let profiles: Profile[] = [];
  let projects: (Project & { owner?: Profile | null })[] = [];
  let reports: ReportWithContext[] = [];
  let newsItems: { id: string; title: string; body: string; created_at: string }[] = [];
  let openReportCount = 0;

  if (tab === "news") {
    const { data } = await supabase.from("news").select("*").order("created_at", { ascending: false }).limit(50);
    newsItems = data ?? [];
  } else if (tab === "profiles") {
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
    if (q) query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
    const { data } = await query;
    profiles = (data ?? []) as Profile[];
  } else if (tab === "projects") {
    let query = supabase
      .from("projects")
      .select("*, owner:profiles!projects_owner_id_fkey(*)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (q) query = query.ilike("title", `%${q}%`);
    const { data } = await query;
    projects = (data ?? []) as (Project & { owner?: Profile | null })[];
  } else {
    const { data } = await supabase
      .from("reports")
      .select(
        "*, reporter:profiles!reports_reporter_id_fkey(*), reported_profile:profiles!reports_reported_profile_id_fkey(*), reported_project:projects!reports_reported_project_id_fkey(*)"
      )
      .eq("status", "open")
      .order("created_at", { ascending: true })
      .limit(100);
    reports = (data ?? []) as ReportWithContext[];
  }

  // Badge count independent of the current tab, so it's visible from any tab.
  const { count } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("status", "open");
  openReportCount = count ?? 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-1 text-xl font-semibold text-stone-50">Panel admina</h1>
      <p className="mb-6 text-sm text-stone-500">Profile, projekty i zgłoszenia. Edycja redaguje treść, shadowban ukrywa bez informowania właściciela.</p>

      <div className="hairline mb-4 flex items-center justify-between pb-3">
        <div className="flex gap-4 text-sm">
          <a
            href="/admin?tab=profiles"
            className={tab === "profiles" ? "text-ogien" : "text-stone-500 hover:text-stone-300"}
          >
            Profile
          </a>
          <a
            href="/admin?tab=projects"
            className={tab === "projects" ? "text-ogien" : "text-stone-500 hover:text-stone-300"}
          >
            Projekty
          </a>
          <a
            href="/admin?tab=reports"
            className={`relative ${tab === "reports" ? "text-ogien" : "text-stone-500 hover:text-stone-300"}`}
          >
            Zgłoszenia
            {openReportCount > 0 && (
              <span className="ml-1.5 rounded-full bg-ogien px-1.5 py-0.5 text-[10px] font-semibold text-black">
                {openReportCount}
              </span>
            )}
          </a>
          <a
            href="/admin?tab=news"
            className={tab === "news" ? "text-ogien" : "text-stone-500 hover:text-stone-300"}
          >
            Aktualności
          </a>
        </div>
        {tab !== "reports" && tab !== "news" && (
          <form action={`/admin`} method="get" className="flex items-center gap-2">
            <input type="hidden" name="tab" value={tab} />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Szukaj…"
              className="border border-stone-800 bg-stone-950 px-2 py-1 text-sm text-stone-100 outline-none focus:border-ogien"
            />
          </form>
        )}
      </div>

      {tab === "profiles" && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="hairline text-xs uppercase tracking-wide text-stone-600">
              <th className="pb-2 font-normal">Użytkownik</th>
              <th className="pb-2 font-normal">Hype</th>
              <th className="pb-2 font-normal">Status</th>
              <th className="pb-2 font-normal">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-900">
            {profiles.map((p) => (
              <tr key={p.id}>
                <td className="py-2">
                  <a href={`/user/${p.id}`} className="text-stone-200 hover:text-ogien hover:underline">
                    @{p.username}
                  </a>
                </td>
                <td className="py-2 text-stone-400">{p.hype_score}</td>
                <td className="py-2">
                  {p.is_shadowbanned ? (
                    <span className="text-danger">shadowban</span>
                  ) : (
                    <span className="text-stone-600">aktywny</span>
                  )}
                </td>
                <td className="py-2">
                  <ProfileRow id={p.id} isShadowbanned={p.is_shadowbanned} />
                </td>
              </tr>
            ))}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-stone-600">
                  Brak wyników.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {tab === "projects" && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="hairline text-xs uppercase tracking-wide text-stone-600">
              <th className="pb-2 font-normal">Projekt</th>
              <th className="pb-2 font-normal">Autor</th>
              <th className="pb-2 font-normal">Ognie</th>
              <th className="pb-2 font-normal">Status</th>
              <th className="pb-2 font-normal">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-900">
            {projects.map((proj) => (
              <tr key={proj.id}>
                <td className="py-2">
                  <a href={`/project/${proj.id}`} className="text-stone-200 hover:text-ogien hover:underline">
                    {proj.title}
                  </a>
                </td>
                <td className="py-2">
                  {proj.owner ? (
                    <a href={`/user/${proj.owner.id}`} className="text-stone-500 hover:text-ogien">
                      @{proj.owner.username}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2 text-stone-400">{proj.fire_count}</td>
                <td className="py-2">
                  {proj.is_shadowbanned ? (
                    <span className="text-danger">shadowban</span>
                  ) : (
                    <span className="text-stone-600">aktywny</span>
                  )}
                </td>
                <td className="py-2">
                  <ProjectRow id={proj.id} isShadowbanned={proj.is_shadowbanned} />
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-stone-600">
                  Brak wyników.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {tab === "news" && <NewsAdmin items={newsItems} />}

      {tab === "reports" && (
        <div className="flex flex-col gap-3">
          {reports.map((r) => {
            const targetHref = r.reported_profile
              ? `/user/${r.reported_profile.id}`
              : r.reported_project
                ? `/project/${r.reported_project.id}`
                : "#";
            const targetLabel = r.reported_profile
              ? `@${r.reported_profile.username}`
              : r.reported_project
                ? r.reported_project.title
                : "usunięte";

            return (
              <div key={r.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-stone-200">
                      Zgłoszono{" "}
                      <a href={targetHref} className="text-ogien hover:underline">
                        {targetLabel}
                      </a>
                    </p>
                    <p className="mt-1 text-sm text-stone-400">{r.reason}</p>
                    <p className="mt-1 text-xs text-stone-600">
                      od {r.reporter ? `@${r.reporter.username}` : "usunięty użytkownik"} ·{" "}
                      {new Date(r.created_at).toLocaleString("pl-PL")}
                    </p>
                  </div>
                  <ReportRowActions reportId={r.id} />
                </div>
              </div>
            );
          })}
          {reports.length === 0 && (
            <p className="py-6 text-center text-sm text-stone-600">Brak otwartych zgłoszeń. Czysto tu.</p>
          )}
        </div>
      )}
    </main>
  );
}
