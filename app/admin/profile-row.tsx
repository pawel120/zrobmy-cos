"use client";

import { AdminRowActions } from "@/components/admin-row-actions";
import { setProfileShadowban } from "./actions";

export function ProfileRow({ id, isShadowbanned }: { id: string; isShadowbanned: boolean }) {
  // No hard-delete for profiles: removing only the profiles row leaves a
  // zombie auth.users account that can still log in but can't do anything.
  // Shadowban covers the moderation need; full account removal belongs in
  // Supabase's dashboard (Authentication → Users), where the FK cascade
  // cleans the profile up correctly.
  return (
    <div className="flex items-center gap-3">
      <a
        href={`/admin/profile/${id}/edit`}
        className="border border-stone-800 px-2 py-1 text-xs text-stone-400 hover:border-ogien hover:text-ogien"
      >
        Edytuj
      </a>
      <AdminRowActions
        isShadowbanned={isShadowbanned}
        onToggleShadowban={(next) => setProfileShadowban(id, next)}
      />
    </div>
  );
}
