"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dbError } from "@/lib/utils";
import type { Profile } from "@/types/database";

function parseList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

interface AdminEditProfileProps {
  params: { id: string };
}

// Admin-only profile redaction. The /admin/* prefix is already gated to admins
// in middleware, and the admin_full_profiles RLS policy is what actually
// authorises the write — the is_admin check here is just defense in depth.
export default function AdminEditProfilePage({ params }: AdminEditProfileProps) {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [notAllowed, setNotAllowed] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [bio, setBio] = useState("");
  const [skillsHave, setSkillsHave] = useState("");
  const [skillsWant, setSkillsWant] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/login?next=/admin/profile/${params.id}/edit`);
        return;
      }

      const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      if (!me?.is_admin) {
        if (isMounted) setNotAllowed(true);
        return;
      }

      const { data } = await supabase.from("profiles").select("*").eq("id", params.id).single();
      if (!isMounted) return;
      if (!data) {
        setError("Nie znaleziono profilu.");
        return;
      }

      const p = data as Profile;
      setProfile(p);
      setDisplayName(p.display_name);
      setFaculty(p.faculty ?? "");
      setBio(p.bio ?? "");
      setSkillsHave(p.skills_have.join(", "));
      setSkillsWant(p.skills_want.join(", "));
      setAvatarUrl(p.avatar_url);
    }

    load();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || profile.username,
        faculty: faculty.trim() || null,
        bio: bio.trim(),
        skills_have: parseList(skillsHave),
        skills_want: parseList(skillsWant),
        avatar_url: avatarUrl,
      })
      .eq("id", profile.id);

    if (updateError) {
      console.error("admin profile update failed:", updateError);
      setError(dbError("Nie udało się zapisać zmian", updateError));
      setIsSaving(false);
      return;
    }

    router.push("/admin?tab=profiles");
    router.refresh();
  }

  if (notAllowed) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-sm text-ogien">
        Brak uprawnień administratora.
      </main>
    );
  }

  if (!profile) {
    return <main className="mx-auto max-w-2xl px-4 py-10 text-sm text-stone-600">{error || "Ładowanie…"}</main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-xl font-semibold text-stone-50">Edytuj profil</h1>
      <p className="mb-8 text-sm text-ogien">
        Tryb admina — redagujesz profil <span className="text-stone-200">@{profile.username}</span>. Zmiany są
        natychmiastowe.
      </p>

      <section className="hairline mb-6 flex items-center gap-4 pb-6">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-stone-800 bg-stone-900 text-lg text-stone-400">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            profile.username.slice(0, 2).toUpperCase()
          )}
        </div>
        {avatarUrl && (
          <button
            type="button"
            onClick={() => setAvatarUrl(null)}
            className="border border-stone-800 px-3 py-2 text-sm text-stone-400 hover:border-ogien hover:text-ogien"
          >
            Wyczyść avatar
          </button>
        )}
      </section>

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Wyświetlana nazwa
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
            className="input"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Czym się zajmujesz
          <input
            value={faculty}
            onChange={(e) => setFaculty(e.target.value)}
            maxLength={80}
            className="input"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          O sobie
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={500}
            className="resize-none input"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Potrafię (oddziel przecinkami)
          <input
            value={skillsHave}
            onChange={(e) => setSkillsHave(e.target.value)}
            className="input"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Szukam (oddziel przecinkami)
          <input
            value={skillsWant}
            onChange={(e) => setSkillsWant(e.target.value)}
            className="input"
          />
        </label>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={isSaving} className="btn-primary self-start">
            {isSaving ? "Zapisuję…" : "Zapisz zmiany"}
          </button>
          <a href="/admin?tab=profiles" className="text-sm text-stone-500 hover:text-stone-300">
            Anuluj
          </a>
        </div>
      </form>
    </main>
  );
}
