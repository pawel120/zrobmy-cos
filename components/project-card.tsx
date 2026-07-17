import Link from "next/link";
import { Flame, Users, Clock } from "lucide-react";
import { SEEKING_LABELS } from "@/lib/seeking";
import type { Profile, Project } from "@/types/database";

// DB enum keys are legacy (pre-rebrand) — only the labels changed.
const PHASE_LABELS: Record<string, string> = {
  luzna_rozkmina: "Pomysł",
  kodzimy_hackathon: "Budujemy",
  walidujemy: "Walidujemy rynek",
  lecimy_po_hajs: "Szukamy finansowania",
  dziala: "Działa",
};

// Deterministic cover gradient for projects without an uploaded image —
// hashed from the project id so every project keeps its colour forever.
const COVER_GRADIENTS = [
  "linear-gradient(135deg,#1d2f6f,#5c1d6f)",
  "linear-gradient(135deg,#6f3a1d,#a8641b)",
  "linear-gradient(135deg,#0f4a3d,#1d6f5a)",
  "linear-gradient(135deg,#6f1d3c,#a81b52)",
  "linear-gradient(135deg,#1d5a6f,#1b7ca8)",
  "linear-gradient(135deg,#4a1d6f,#7a1ba8)",
  "linear-gradient(135deg,#6f5a1d,#a8921b)",
  "linear-gradient(135deg,#2d3a4f,#46618a)",
];

export function coverBackground(project: Pick<Project, "id" | "cover_url">): React.CSSProperties {
  if (project.cover_url) {
    return { backgroundImage: `url(${project.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" };
  }
  let hash = 0;
  for (let i = 0; i < project.id.length; i++) hash = (hash * 31 + project.id.charCodeAt(i)) >>> 0;
  return { backgroundImage: COVER_GRADIENTS[hash % COVER_GRADIENTS.length] };
}

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "dzisiaj";
  if (days === 1) return "wczoraj";
  if (days < 30) return `${days} dni temu`;
  const months = Math.floor(days / 30);
  return months === 1 ? "miesiąc temu" : `${months} mies. temu`;
}

interface ProjectCardProps {
  project: Project;
  owner?: Pick<Profile, "id" | "username" | "display_name" | "avatar_url"> | null;
  teamCount?: number;
}

export function ProjectCard({ project, owner, teamCount }: ProjectCardProps) {
  return (
    <Link
      href={`/project/${project.id}`}
      className="block overflow-hidden rounded-lg border border-stone-800 bg-stone-900 transition-colors hover:border-stone-600"
    >
      <div className="relative h-14" style={coverBackground(project)}>
        <span className="absolute left-3 top-3 rounded-full bg-black/35 px-2 py-0.5 text-[11px] text-white">
          {PHASE_LABELS[project.phase]}
        </span>
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[11px] text-white">
          <Flame className="h-3 w-3" aria-hidden />
          {project.fire_count}
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-display text-base font-semibold text-stone-50">{project.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-stone-400">{project.description}</p>

        {project.seeking?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.seeking.map((s) => (
              <span
                key={s}
                className="rounded-full border border-ogien/40 bg-ogien/10 px-2.5 py-0.5 text-xs text-ogien"
              >
                {SEEKING_LABELS[s] ?? s}
              </span>
            ))}
          </div>
        )}

        {project.roles_needed.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-stone-500">Szukają</span>
            {project.roles_needed.slice(0, 4).map((role) => (
              <span key={role} className="tag">
                {role}
              </span>
            ))}
          </div>
        )}

        {(owner || teamCount !== undefined) && (
          <div className="mt-3 flex items-center gap-2 border-t border-stone-800 pt-3 text-xs text-stone-400">
            {owner && (
              <span className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-stone-800 text-[9px] text-stone-300">
                  {owner.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={owner.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    owner.username.slice(0, 2).toUpperCase()
                  )}
                </span>
                {owner.display_name || owner.username}
              </span>
            )}
            <span className="ml-auto flex items-center gap-3 text-stone-500">
              {teamCount !== undefined && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  {teamCount} w zespole
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {timeAgo(project.created_at)}
              </span>
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
