"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dbError } from "@/lib/utils";
import type { Project, ProjectPhase } from "@/types/database";

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

interface EditProjectPageProps {
  params: { id: string };
}

export default function EditProjectPage({ params }: EditProjectPageProps) {
  const router = useRouter();
  const supabase = createClient();

  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<ProjectPhase>("luzna_rozkmina");
  const [rolesNeeded, setRolesNeeded] = useState("");
  const [tags, setTags] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notAllowed, setNotAllowed] = useState(false);
  // True when the editor is an admin working on someone else's project. The
  // admin_full_projects RLS policy already permits the write; this just drives
  // the "admin mode" banner and where we redirect afterwards.
  const [isAdminEdit, setIsAdminEdit] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/login?next=/project/${params.id}/edit`);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", params.id)
        .single();

      if (!isMounted) return;

      if (fetchError || !data) {
        setError("Nie znaleziono projektu.");
        return;
      }
      if (data.owner_id !== user.id) {
        // Not the owner — allow through only if the caller is an admin.
        const { data: me } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();
        if (!me?.is_admin) {
          setNotAllowed(true);
          return;
        }
        if (isMounted) setIsAdminEdit(true);
      }

      setProject(data as Project);
      setTitle(data.title);
      setDescription(data.description);
      setPhase(data.phase);
      setRolesNeeded(data.roles_needed.join(", "));
      setTags(data.tags.join(", "));
    }

    load();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (trimmedTitle.length < 3 || trimmedDescription.length < 10) {
      setError("Tytuł min. 3 znaki, opis min. 10 znaków.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("projects")
      .update({
        title: trimmedTitle,
        description: trimmedDescription,
        phase,
        roles_needed: parseList(rolesNeeded),
        tags: parseList(tags),
      })
      .eq("id", project.id);

    if (updateError) {
      console.error("project update failed:", updateError);
      setError(dbError("Nie udało się zapisać zmian", updateError));
      setIsSaving(false);
      return;
    }

    router.push(isAdminEdit ? "/admin?tab=projects" : `/project/${project.id}`);
    router.refresh();
  }

  async function handleDelete() {
    if (!project) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    setIsDeleting(true);
    setError(null);

    const { error: deleteError } = await supabase.from("projects").delete().eq("id", project.id);

    if (deleteError) {
      console.error("project delete failed:", deleteError);
      setError(dbError("Nie udało się usunąć projektu", deleteError));
      setIsDeleting(false);
      setConfirmingDelete(false);
      return;
    }

    router.push(isAdminEdit ? "/admin?tab=projects" : "/");
    router.refresh();
  }

  if (notAllowed) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-sm text-ogien">
        Ten projekt nie jest Twój — nie możesz go edytować.
      </main>
    );
  }

  if (!project) {
    return <main className="mx-auto max-w-2xl px-4 py-10 text-sm text-stone-600">{error || "Ładowanie…"}</main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-xl font-semibold text-stone-50">Edytuj projekt</h1>
      {isAdminEdit ? (
        <p className="mb-8 text-sm text-ogien">
          Tryb admina — edytujesz cudzy projekt. Zmiany są natychmiastowe.
        </p>
      ) : (
        <p className="mb-8 text-sm text-stone-500">Zmień co trzeba albo usuń, jeśli projekt umarł.</p>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Tytuł
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className="border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
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
            className="resize-none border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
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
            className="border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Tagi (oddziel przecinkami)
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
          />
        </label>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex items-center justify-between">
          <button type="submit" disabled={isSaving} className="btn-primary">
            {isSaving ? "Zapisuję…" : "Zapisz zmiany"}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            onBlur={() => setConfirmingDelete(false)}
            disabled={isDeleting}
            className={
              confirmingDelete
                ? "border border-danger bg-danger/10 px-3 py-2 text-sm text-danger"
                : "border border-stone-800 px-3 py-2 text-sm text-stone-500 hover:border-danger hover:text-danger"
            }
          >
            {isDeleting ? "Usuwam…" : confirmingDelete ? "Na pewno? Kliknij znowu" : "Usuń projekt"}
          </button>
        </div>
      </form>
    </main>
  );
}
