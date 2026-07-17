import Link from "next/link";
import type { Profile } from "@/types/database";

interface ProfileLinkProps {
  profile: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
  size?: "sm" | "md";
}

// Every avatar/username in the app routes through this component so profile
// linking behavior — and any future change to it — stays in exactly one place.
export function ProfileLink({ profile, size = "md" }: ProfileLinkProps) {
  const avatarSize = size === "sm" ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm";

  return (
    <Link
      href={`/user/${profile.id}`}
      className="group inline-flex items-center gap-2 no-underline"
    >
      <span
        className={`flex ${avatarSize} shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-800 bg-stone-900 text-stone-400`}
      >
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" />
        ) : (
          profile.username.slice(0, 2).toUpperCase()
        )}
      </span>
      <span className="text-stone-100 group-hover:text-ogien group-hover:underline">
        {profile.display_name || profile.username}
      </span>
    </Link>
  );
}
