"use client";

import { AdminRowActions } from "@/components/admin-row-actions";
import { setProjectShadowban, deleteProject } from "./actions";

export function ProjectRow({ id, isShadowbanned }: { id: string; isShadowbanned: boolean }) {
  return (
    <AdminRowActions
      isShadowbanned={isShadowbanned}
      onToggleShadowban={(next) => setProjectShadowban(id, next)}
      onDelete={() => deleteProject(id)}
      deleteConfirmLabel="Na pewno? Kliknij znowu"
    />
  );
}
