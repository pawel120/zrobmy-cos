import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { NapiszButton } from "@/components/napisz-button";
import { ProjectCard } from "@/components/project-card";
import { ReportButton } from "@/components/report-button";
import type { Profile, Project } from "@/types/database";

interface UserPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio, faculty, hype_score")
    .eq("id", params.id)
    .eq("is_shadowbanned", false)
    .single();

  if (!profile) {
    return { title: "Nie znaleziono profilu — BuildTogether" };
  }

  const name = profile.display_name || profile.username;
  const description = profile.bio || `${profile.faculty ?? "Student"} · 🔥 ${profile.hype_score} hype'u`;

  return {
    title: `${name} (@${profile.username}) — BuildTogether`,
    description,
    openGraph: { title: name, description, type: "profile", siteName: "BuildTogether" },
    twitter: { card: "summary", title: name, description },
  };
}

export default async function UserProfilePage({ params }: UserPageProps) {
  const supabase = createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  const typedProfile = profile as Profile;

  const { data: projectsData } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", params.id)
    .eq("is_shadowbanned", false)
    .order("created_at", { ascending: false });

  const projects = (projectsData ?? []) as Project[];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      {/* ---- Header ---------------------------------------------------- */}
      <section className="hairline flex items-start justify-between gap-4 pb-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-stone-800 bg-stone-900 font-mono text-lg text-stone-400">
            {typedProfile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={typedProfile.avatar_url}
                alt={typedProfile.display_name}
                className="h-full w-full object-cover"
              />
            ) : (
              typedProfile.username.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-stone-50">
              {typedProfile.display_name || typedProfile.username}
            </h1>
            <p className="text-sm text-stone-500">@{typedProfile.username}</p>
            {typedProfile.faculty && (
              <p className="mt-1 text-sm text-stone-400">{typedProfile.faculty}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="accent-surface flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold">
            <span aria-hidden>🔥</span>
            <span>{typedProfile.hype_score}</span>
          </div>
          <NapiszButton targetUserId={typedProfile.id} currentUserId={authUser?.id ?? null} />
          {authUser?.id !== typedProfile.id && (
            <ReportButton target={{ reportedProfileId: typedProfile.id }} currentUserId={authUser?.id ?? null} />
          )}
        </div>
      </section>

      {/* ---- Bio --------------------------------------------------------- */}
      {typedProfile.bio && (
        <section className="hairline py-6">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-300">
            {typedProfile.bio}
          </p>
        </section>
      )}

      {/* ---- Skills ------------------------------------------------------ */}
      <section className="hairline grid grid-cols-1 gap-6 py-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Potrafię
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {typedProfile.skills_have.length > 0 ? (
              typedProfile.skills_have.map((skill) => (
                <span key={skill} className="tag">
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-sm text-stone-600">Brak dodanych umiejętności.</p>
            )}
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Szukam
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {typedProfile.skills_want.length > 0 ? (
              typedProfile.skills_want.map((skill) => (
                <span key={skill} className="tag">
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-sm text-stone-600">Nic obecnie nie szuka.</p>
            )}
          </div>
        </div>
      </section>

      {/* ---- Projects ------------------------------------------------------ */}
      <section className="py-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
          Projekty ({projects.length})
        </h2>
        {projects.length === 0 ? (
          <p className="text-sm text-stone-600">Jeszcze nic tu nie ma.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
