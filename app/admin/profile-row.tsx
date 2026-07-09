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
    <AdminRowActions
      isShadowbanned={isShadowbanned}
      onToggleShadowban={(next) => setProfileShadowban(id, next)}
    />
  );
}
