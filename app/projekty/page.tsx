import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProjectCard } from "@/components/project-card";
import { SEEKING_OPTIONS } from "@/lib/seeking";
import type { Profile, Project } from "@/types/database";

interface FeedPageProps {
  searchParams: { sort?: string; seek?: string };
}

type OwnerLite = Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const sort = searchParams.sort === "nowe" ? "nowe" : "popularne";
  const seek = SEEKING_OPTIONS.some((o) => o.value === searchParams.seek) ? searchParams.seek : null;

  let projects: Project[] = [];
  if (sort === "popularne") {
    const { data } = await supabase.rpc("get_hot_projects", { days_back: 7, limit_count: 30 });
    projects = (data ?? []) as Project[];
  } else {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("is_shadowbanned", false)
      .order("created_at", { ascending: false })
      .limit(30);
    projects = (data ?? []) as Project[];
  }

  if (seek) projects = projects.filter((p) => p.seeking?.includes(seek));

  // Enrich cards in two batch queries instead of N+1 per card:
  // owners for the author line, accepted join_requests for the team size.
  const ownerIds = Array.from(new Set(projects.map((p) => p.owner_id)));
  const projectIds = projects.map((p) => p.id);

  const [{ data: ownersData }, { data: membersData }] = await Promise.all([
    ownerIds.length
      ? supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", ownerIds)
      : Promise.resolve({ data: [] as OwnerLite[] }),
    projectIds.length
      ? supabase.from("join_requests").select("project_id").eq("status", "accepted").in("project_id", projectIds)
      : Promise.resolve({ data: [] as { project_id: string }[] }),
  ]);

  const owners = new Map((ownersData ?? []).map((o) => [o.id, o as OwnerLite]));
  const teamCounts = new Map<string, number>();
  for (const row of membersData ?? []) {
    teamCounts.set(row.project_id, (teamCounts.get(row.project_id) ?? 0) + 1);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="hairline mb-6 flex items-center justify-between pb-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-stone-50">Projekty</h1>
          <p className="text-sm text-stone-500">Dołącz do zespołu albo zbierz własny.</p>
        </div>
        <Link href={user ? "/project/new" : "/signup"} className="btn-primary">
          Dodaj projekt
        </Link>
      </div>

      <div className="mb-5 flex gap-2 text-sm">
        <Link
          href="/projekty?sort=popularne"
          className={
            sort === "popularne"
              ? "rounded-full bg-stone-50 px-3 py-1 font-medium text-stone-950"
              : "rounded-full border border-stone-800 px-3 py-1 text-stone-400 hover:border-stone-600"
          }
        >
          Popularne
        </Link>
        <Link
          href="/projekty?sort=nowe"
          className={
            sort === "nowe"
              ? "rounded-full bg-stone-50 px-3 py-1 font-medium text-stone-950"
              : "rounded-full border border-stone-800 px-3 py-1 text-stone-400 hover:border-stone-600"
          }
        >
          Nowe
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        <Link
          href={`/projekty?sort=${sort}`}
          className={
            !seek
              ? "rounded-full border border-ogien/50 bg-ogien/10 px-3 py-1 text-ogien"
              : "rounded-full border border-stone-800 px-3 py-1 text-stone-400 hover:border-stone-600"
          }
        >
          Wszystkie
        </Link>
        {SEEKING_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={`/projekty?sort=${sort}&seek=${opt.value}`}
            className={
              seek === opt.value
                ? "rounded-full border border-ogien/50 bg-ogien/10 px-3 py-1 text-ogien"
                : "rounded-full border border-stone-800 px-3 py-1 text-stone-400 hover:border-stone-600"
            }
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {projects.length === 0 ? (
        <div className="card text-center text-sm text-stone-500">
          Cicho tu. Bądź pierwszy —{" "}
          <Link href="/project/new" className="text-ogien underline">
            dodaj projekt
          </Link>
          .
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              owner={owners.get(project.owner_id) ?? null}
              teamCount={(teamCounts.get(project.id) ?? 0) + 1}
            />
          ))}
        </div>
      )}
    </main>
  );
}
