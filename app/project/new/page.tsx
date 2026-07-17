"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dbError } from "@/lib/utils";
import type { ProjectPhase } from "@/types/database";

const PHASE_OPTIONS: { value: ProjectPhase; label: string }[] = [
  { value: "luzna_rozkmina", label: "Pomysł" },
  { value: "kodzimy_hackathon", label: "Budujemy" },
  { value: "walidujemy", label: "Walidujemy rynek" },
  { value: "lecimy_po_hajs", label: "Szukamy finansowania" },
  { value: "dziala", label: "Działa" },
];

function parseList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function NewProjectPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<ProjectPhase>("luzna_rozkmina");
  const [rolesNeeded, setRolesNeeded] = useState("");
  const [tags, setTags] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login?next=/project/new");
      } else {
        setUserId(data.user.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (trimmedTitle.length < 3) {
      setError("Tytuł musi mieć co najmniej 3 znaki.");
      return;
    }
    if (trimmedDescription.length < 10) {
      setError("Opisz projekt trochę szerzej (min. 10 znaków).");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Upload the cover first (path is locked to the uploader's uid by the
    // storage RLS policies) so its URL can go into the insert directly.
    let coverUrl: string | null = null;
    if (coverFile) {
      // Whitelist the extension from the MIME type — a filename with spaces,
      // Polish chars, or no dot produced a broken Storage key and "Failed to fetch".
      const MIME_EXT: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
      };
      const ext = MIME_EXT[coverFile.type];
      if (!ext) {
        setError("Okładka musi być JPG, PNG, WEBP albo GIF.");
        setIsSubmitting(false);
        return;
      }
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("covers")
        .upload(path, coverFile, { cacheControl: "3600", contentType: coverFile.type });
      if (uploadError) {
        console.error("cover upload failed:", uploadError);
        setError(dbError("Nie udało się wgrać okładki", uploadError));
        setIsSubmitting(false);
        return;
      }
      coverUrl = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
    }

    const { data, error: insertError } = await supabase
      .from("projects")
      .insert({
        owner_id: userId,
        title: trimmedTitle,
        description: trimmedDescription,
        phase,
        roles_needed: parseList(rolesNeeded),
        tags: parseList(tags),
        cover_url: coverUrl,
        video_url: videoUrl.trim() || null,
      })
      .select()
      .single();

    if (insertError || !data) {
      // Surface the real Postgres/RLS error instead of swallowing it — a
      // foreign-key violation here almost always means the user has no
      // matching `profiles` row (owner_id references profiles.id).
      console.error("Project insert failed:", insertError);
      const isMissingProfile =
        insertError?.code === "23503" || insertError?.message?.includes("profiles");
      setError(
        isMissingProfile
          ? "Twoje konto nie ma jeszcze profilu w bazie — wyloguj się i zarejestruj ponownie."
          : insertError
            ? `Nie udało się dodać projektu: ${insertError.message}`
            : "Nie udało się dodać projektu. Spróbuj ponownie."
      );
      setIsSubmitting(false);
      return;
    }

    router.push(`/project/${data.id}`);
  }

  if (userId === undefined) {
    return <main className="mx-auto max-w-2xl px-4 py-10 text-sm text-stone-600">Ładowanie…</main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 font-display text-xl font-semibold text-stone-50">Dodaj projekt</h1>
      <p className="mb-8 text-sm text-stone-500">Krótko, konkretnie. Bez korpo-gadki.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Tytuł
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className="input"
            placeholder="Np. Appka do dzielenia rachunków na wyjazdach"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Opis
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={2000}
            className="resize-none input"
            placeholder="Co budujecie, na jakim jesteście etapie, dlaczego to fajne."
          />
        </label>

        <fieldset className="flex flex-col gap-1 text-xs text-stone-500">
          <legend className="mb-1">Faza projektu</legend>
          <div className="flex flex-wrap gap-2">
            {PHASE_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setPhase(opt.value)}
                className={
                  phase === opt.value
                    ? "border border-ogien/60 bg-ogien/10 px-3 py-1.5 text-sm text-ogien"
                    : "border border-stone-800 px-3 py-1.5 text-sm text-stone-400 hover:border-stone-600"
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Kogo szukacie (oddziel przecinkami)
          <input
            value={rolesNeeded}
            onChange={(e) => setRolesNeeded(e.target.value)}
            className="input"
            placeholder="Frontend, Designer, ML"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Tagi (oddziel przecinkami)
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="input"
            placeholder="AI, fintech, mobile"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Okładka (opcjonalnie — JPG/PNG, max 5 MB)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > 5 * 1024 * 1024) {
                setError("Okładka musi ważyć mniej niż 5 MB.");
                return;
              }
              setError(null);
              setCoverFile(f);
            }}
            className="border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-400 file:mr-3 file:rounded-full file:border-0 file:bg-stone-800 file:px-3 file:py-1 file:text-xs file:text-stone-200"
          />
          <span className="text-stone-600">Bez okładki projekt dostanie automatyczny gradient.</span>
        </label>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Link do wideo (opcjonalnie — YouTube/Vimeo)
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="input"
            placeholder="https://youtube.com/watch?v=…"
          />
        </label>

        {error && <p className="text-xs text-danger">{error}</p>}

        <button type="submit" disabled={isSubmitting} className="btn-primary self-start">
          {isSubmitting ? "Dodaję…" : "Dodaj projekt"}
        </button>
      </form>
    </main>
  );
}
