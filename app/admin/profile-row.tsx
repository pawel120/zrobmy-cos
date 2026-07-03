"use client";

import { AdminRowActions } from "@/components/admin-row-actions";
import { setProfileShadowban, deleteProfile } from "./actions";

export function ProfileRow({ id, isShadowbanned }: { id: string; isShadowbanned: boolean }) {
  return (
    <AdminRowActions
      isShadowbanned={isShadowbanned}
      onToggleShadowban={(next) => setProfileShadowban(id, next)}
      onDelete={() => deleteProfile(id)}
      deleteConfirmLabel="Na pewno? Kliknij znowu"
    />
  );
}
