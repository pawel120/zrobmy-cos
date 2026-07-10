"use client";

import { AdminRowActions } from "@/components/admin-row-actions";
import { setProfileShadowban, deleteAccount } from "./actions";

export function ProfileRow({ id, isShadowbanned }: { id: string; isShadowbanned: boolean }) {
  // Delete goes through the service-role Admin API (auth.users + cascade),
  // so there is no zombie-account problem anymore.
  return (
    <div className="flex items-center gap-3">
      <a
        href={`/admin/profile/${id}/edit`}
        className="rounded-full border border-stone-800 px-2 py-1 text-xs text-stone-400 hover:border-ogien hover:text-ogien"
      >
        Edytuj
      </a>
      <AdminRowActions
        isShadowbanned={isShadowbanned}
        onToggleShadowban={(next) => setProfileShadowban(id, next)}
        onDelete={() => deleteAccount(id)}
        deleteConfirmLabel="Usunąć KONTO? Kliknij znowu"
      />
    </div>
  );
}
