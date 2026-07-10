import Link from "next/link";
import type { Project } from "@/types/database";

// DB enum keys are legacy (pre-rebrand) — only the labels changed. New keys
// (walidujemy, dziala) added via `alter type project_phase add value`.
const PHASE_LABELS: Record<string, string> = {
  luzna_rozkmina: "Pomysł",
  kodzimy_hackathon: "Budujemy",
  walidujemy: "Walidujemy rynek",
  lecimy_po_hajs: "Szukamy finansowania",
  dziala: "Działa",
};

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/project/${project.id}`} className="card block hover:border-stone-600">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium text-stone-100">{project.title}</h3>
        <span className="flex shrink-0 items-center gap-1 text-xs text-ogien">
          🔥 {project.fire_count}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-stone-500">{project.description}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="tag">{PHASE_LABELS[project.phase]}</span>
        {project.roles_needed.slice(0, 3).map((role) => (
          <span key={role} className="tag">
            {role}
          </span>
        ))}
      </div>
    </Link>
  );
}
