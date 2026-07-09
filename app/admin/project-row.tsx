"use client";

import { AdminRowActions } from "@/components/admin-row-actions";
import { setProjectShadowban, deleteProject } from "./actions";

export function ProjectRow({ id, isShadowbanned }: { id: string; isShadowbanned: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <a
        href={`/project/${id}/edit`}
        className="border border-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:border-ogien hover:text-ogien"
      >
        Edytuj
      </a>
      <AdminRowActions
        isShadowbanned={isShadowbanned}
        onToggleShadowban={(next) => setProjectShadowban(id, next)}
        onDelete={() => deleteProject(id)}
        deleteConfirmLabel="Na pewno? Kliknij znowu"
      />
    </div>
  );
}
