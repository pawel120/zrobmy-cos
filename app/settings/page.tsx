"use client";

import { useEffect, useRef, useState } from "react";
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

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [bio, setBio] = useState("");
  const [skillsHave, setSkillsHave] = useState("");
  const [skillsWant, setSkillsWant] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=/settings");
        return;
      }
      if (!isMounted) return;
      setUserId(user.id);

      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!isMounted || !data) return;

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
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith("image/")) {
      setError("Wybierz plik graficzny.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Zdjęcie musi ważyć mniej niż 3 MB.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const ext = file.name.split(".").pop();
    // Path is prefixed with the user's own id — the storage RLS policies in
    // schema.sql only allow writes under a folder matching auth.uid().
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      console.error("avatar upload failed:", uploadError);
      setError(dbError("Nie udało się wgrać zdjęcia", uploadError));
      setIsUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust so the new image shows immediately even though the path
    // (and therefore CDN cache key) is identical to the previous upload.
    const bustedUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: bustedUrl })
      .eq("id", userId);

    if (updateError) {
      console.error("avatar_url update failed:", updateError);
      setError(dbError("Zdjęcie wgrane, ale nie udało się zapisać profilu", updateError));
    } else {
      setAvatarUrl(bustedUrl);
    }
    setIsUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    setIsSaving(true);
    setError(null);
    setSaved(false);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || profile?.username,
        faculty: faculty.trim() || null,
        bio: bio.trim(),
        skills_have: parseList(skillsHave),
        skills_want: parseList(skillsWant),
      })
      .eq("id", userId);

    if (updateError) {
      console.error("profile update failed:", updateError);
      setError(dbError("Nie udało się zapisać zmian", updateError));
    } else {
      setSaved(true);
      router.refresh();
    }
    setIsSaving(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);

    if (newPassword.length < 8) {
      setPasswordError("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Hasła się nie zgadzają.");
      return;
    }

    setIsChangingPassword(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      console.error("password update failed:", updateError);
      setPasswordError(dbError("Nie udało się zmienić hasła", updateError));
    } else {
      setPasswordSaved(true);
      setNewPassword("");
      setConfirmPassword("");
    }
    setIsChangingPassword(false);
  }

  if (!profile) {
    return <main className="mx-auto max-w-2xl px-4 py-10 text-sm text-stone-600">Ładowanie…</main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-xl font-semibold text-stone-50">Ustawienia profilu</h1>
      <p className="mb-8 text-sm text-stone-500">@{profile.username}</p>

      <section className="hairline mb-6 flex items-center gap-4 pb-6">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden border border-stone-800 bg-stone-900 font-mono text-lg text-stone-400">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            profile.username.slice(0, 2).toUpperCase()
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="btn-primary"
          >
            {isUploading ? "Wgrywam…" : "Zmień zdjęcie"}
          </button>
          <p className="mt-1 text-xs text-stone-600">JPG/PNG, max 3 MB</p>
        </div>
      </section>

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Wyświetlana nazwa
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
            className="border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Wydział
          <input
            value={faculty}
            onChange={(e) => setFaculty(e.target.value)}
            maxLength={80}
            className="border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
            placeholder="Np. Informatyka"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          O sobie
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={500}
            className="resize-none border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Potrafię (oddziel przecinkami)
          <input
            value={skillsHave}
            onChange={(e) => setSkillsHave(e.target.value)}
            className="border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
            placeholder="React, Figma, SQL"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Szukam (oddziel przecinkami)
          <input
            value={skillsWant}
            onChange={(e) => setSkillsWant(e.target.value)}
            className="border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
            placeholder="Backend, Marketing"
          />
        </label>

        {error && <p className="text-xs text-danger">{error}</p>}
        {saved && <p className="text-xs text-stone-500">Zapisano.</p>}

        <button type="submit" disabled={isSaving} className="btn-primary self-start">
          {isSaving ? "Zapisuję…" : "Zapisz zmiany"}
        </button>
      </form>

      <section className="hairline mt-10 pt-6">
        <h2 className="mb-4 text-sm font-semibold text-stone-50">Zmiana hasła</h2>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1 text-xs text-stone-500">
            Nowe hasło
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              className="border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-stone-500">
            Powtórz nowe hasło
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              className="border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
            />
          </label>

          {passwordError && <p className="text-xs text-danger">{passwordError}</p>}
          {passwordSaved && <p className="text-xs text-stone-500">Hasło zmienione.</p>}

          <button type="submit" disabled={isChangingPassword} className="btn-primary self-start">
            {isChangingPassword ? "Zmieniam…" : "Zmień hasło"}
          </button>
        </form>
      </section>
    </main>
  );
}
