"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ProjectPhase } from "@/types/database";

const PHASE_OPTIONS: { value: ProjectPhase; label: string }[] = [
  { value: "luzna_rozkmina", label: "Luźna rozkmina" },
  { value: "kodzimy_hackathon", label: "Kodzimy na hackathon" },
  { value: "lecimy_po_hajs", label: "Lecimy po hajs" },
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

    const { data, error: insertError } = await supabase
      .from("projects")
      .insert({
        owner_id: userId,
        title: trimmedTitle,
        description: trimmedDescription,
        phase,
        roles_needed: parseList(rolesNeeded),
        tags: parseList(tags),
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
    return <main className="mx-auto max-w-2xl px-4 py-10 text-sm text-zinc-600">Ładowanie…</main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-xl font-semibold text-zinc-50">Wrzuć swój projekt</h1>
      <p className="mb-8 text-sm text-zinc-500">Krótko, konkretnie. Bez korpo-gadki.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Tytuł
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className="border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-ogien"
            placeholder="Np. Appka do dzielenia rachunków na wyjazdach"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Opis
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={2000}
            className="resize-none border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-ogien"
            placeholder="Co budujecie, na jakim jesteście etapie, dlaczego to fajne."
          />
        </label>

        <fieldset className="flex flex-col gap-1 text-xs text-zinc-500">
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
                    : "border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-600"
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Kogo szukacie (oddziel przecinkami)
          <input
            value={rolesNeeded}
            onChange={(e) => setRolesNeeded(e.target.value)}
            className="border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-ogien"
            placeholder="Frontend, Designer, ML"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Tagi (oddziel przecinkami)
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-ogien"
            placeholder="AI, fintech, mobile"
          />
        </label>

        {error && <p className="text-xs text-ogien">{error}</p>}

        <button type="submit" disabled={isSubmitting} className="btn-primary self-start">
          {isSubmitting ? "Wrzucam…" : "Wrzuć projekt"}
        </button>
      </form>
    </main>
  );
}
