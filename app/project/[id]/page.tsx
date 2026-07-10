import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { coverBackground } from "@/components/project-card";
import { FireButton } from "@/components/fire-button";
import { ProfileLink } from "@/components/profile-link";
import { JoinRequestButton } from "@/components/join-request-button";
import { JoinRequestsPanel } from "@/components/join-requests-panel";
import { ReportButton } from "@/components/report-button";
import type { Profile, Project } from "@/types/database";

const PHASE_LABELS: Record<string, string> = {
  luzna_rozkmina: "Pomysł",
  kodzimy_hackathon: "Budujemy",
  walidujemy: "Walidujemy rynek",
  lecimy_po_hajs: "Szukamy finansowania",
  dziala: "Działa",
};

interface ProjectPageProps {
  params: { id: string };
}

// Turns a YouTube/Vimeo watch link into an embeddable iframe URL; anything
// else returns null and the raw link is shown instead of an embed.
function embedUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube-nocookie.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be" && u.pathname.length > 1) {
      return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {}
  return null;
}

// Projects get shared into group chats and hackathon Discords far more than
// they get browsed to directly — without this, every share is a bare URL.
export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const supabase = createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("title, description, fire_count, phase")
    .eq("id", params.id)
    .eq("is_shadowbanned", false)
    .single();

  if (!project) {
    return { title: "Nie znaleziono projektu — BuildTogether" };
  }

  const description =
    project.description.length > 160 ? `${project.description.slice(0, 157)}…` : project.description;

  return {
    title: `${project.title} — BuildTogether`,
    description,
    openGraph: {
      title: project.title,
      description,
      type: "website",
      siteName: "BuildTogether",
    },
    twitter: {
      card: "summary",
      title: project.title,
      description,
    },
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const supabase = createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  const typedProject = project as Project;

  const { data: owner } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", typedProject.owner_id)
    .single();

  let hasFired = false;
  let hasRequestedJoin = false;
  if (authUser) {
    const { data: existingFire } = await supabase
      .from("fires")
      .select("id")
      .eq("project_id", typedProject.id)
      .eq("user_id", authUser.id)
      .maybeSingle();
    hasFired = Boolean(existingFire);

    const { data: existingRequest } = await supabase
      .from("join_requests")
      .select("id")
      .eq("project_id", typedProject.id)
      .eq("requester_id", authUser.id)
      .maybeSingle();
    hasRequestedJoin = Boolean(existingRequest);
  }

  const isOwner = authUser?.id === typedProject.owner_id;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 h-32 rounded-lg" style={coverBackground(typedProject)} />
      <section className="hairline pb-6">
        <div className="flex items-center justify-between">
          <span className="tag">{PHASE_LABELS[typedProject.phase]}</span>
          {isOwner && (
            <Link href={`/project/${typedProject.id}/edit`} className="text-xs text-stone-500 hover:text-ogien">
              Edytuj
            </Link>
          )}
          {!isOwner && <ReportButton target={{ reportedProjectId: typedProject.id }} currentUserId={authUser?.id ?? null} />}
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-stone-50">{typedProject.title}</h1>
        {owner && (
          <div className="mt-3">
            <ProfileLink profile={owner as Profile} />
          </div>
        )}
      </section>

      <section className="hairline py-6">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-300">
          {typedProject.description}
        </p>
      </section>

      {typedProject.video_url && (
        <section className="hairline py-6">
          {embedUrl(typedProject.video_url) ? (
            <div className="overflow-hidden rounded-lg border border-stone-800">
              <iframe
                src={embedUrl(typedProject.video_url)!}
                className="aspect-video w-full"
                allow="accelerometer; encrypted-media; picture-in-picture"
                allowFullScreen
                title={`Wideo projektu ${typedProject.title}`}
              />
            </div>
          ) : (
            <a
              href={typedProject.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ogien underline"
            >
              Zobacz wideo projektu
            </a>
          )}
        </section>
      )}

      {typedProject.roles_needed.length > 0 && (
        <section className="hairline py-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Szukamy do zespołu
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {typedProject.roles_needed.map((role) => (
              <span key={role} className="tag">
                {role}
              </span>
            ))}
          </div>
        </section>
      )}

      {typedProject.tags.length > 0 && (
        <section className="hairline py-6">
          <div className="flex flex-wrap gap-1.5">
            {typedProject.tags.map((tag) => (
              <span key={tag} className="tag">
                #{tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {isOwner && <JoinRequestsPanel projectId={typedProject.id} />}

      <section className="flex items-center justify-between py-6">
        <FireButton
          projectId={typedProject.id}
          initialFireCount={typedProject.fire_count}
          initialHasFired={hasFired}
          currentUserId={authUser?.id ?? null}
        />
        {!isOwner && (
          <JoinRequestButton
            projectId={typedProject.id}
            currentUserId={authUser?.id ?? null}
            alreadyRequested={hasRequestedJoin}
          />
        )}
      </section>
    </main>
  );
}
