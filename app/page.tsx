import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProjectCard } from "@/components/project-card";
import type { Project } from "@/types/database";

// Landing-wizytówka: zawsze na "/". Logo wraca tu; sama apka jest pod /projekty.
export default async function LandingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: hotData },
    { data: newsData },
    { count: projectCount },
    { count: builderCount },
  ] = await Promise.all([
    supabase.rpc("get_hot_projects", { days_back: 30, limit_count: 3 }),
    supabase
      .from("news")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.from("projects").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_shadowbanned", false),
  ]);

  const hot = (hotData ?? []) as Project[];
  const news = newsData ?? [];

  const stats = [
    { value: projectCount ?? 0, label: "projektów" },
    { value: builderCount ?? 0, label: "twórców" },
  ];

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      {/* ---- Hero ------------------------------------------------------------ */}
      <section className="pb-14 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-stone-50 sm:text-4xl">
          Znajdź zespół do swojego <span className="text-ogien">projektu</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-stone-400">
          BuildTogether to miejsce, gdzie ludzie z pomysłami spotykają ludzi, którzy chcą budować.
          Dodaj projekt, zbierz ekipę albo dołącz do cudzego.
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <Link href="/projekty" className="btn-primary">
            Przeglądaj projekty
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          {!user && (
            <Link href="/signup" className="btn-ghost">
              Załóż konto
            </Link>
          )}
        </div>

        {(projectCount ?? 0) > 0 && (
          <div className="mt-10 flex justify-center gap-8">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="font-mono text-2xl font-bold text-stone-50">{s.value}</p>
                <p className="text-xs text-stone-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- Jak to działa --------------------------------------------------- */}
      <section className="hairline grid gap-4 pb-12 sm:grid-cols-3">
        <div>
          <p className="font-display text-sm font-semibold text-stone-50">1. Dodaj projekt</p>
          <p className="mt-1 text-sm text-stone-400">Opisz, co budujesz i kogo szukasz.</p>
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-stone-50">2. Zbierz ekipę</p>
          <p className="mt-1 text-sm text-stone-400">Ludzie zgłaszają się, żeby dołączyć.</p>
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-stone-50">3. Budujcie</p>
          <p className="mt-1 text-sm text-stone-400">Rozmawiacie w apce i działacie.</p>
        </div>
      </section>

      {/* ---- Podgląd projektów ----------------------------------------------- */}
      {hot.length > 0 && (
        <section className="py-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Popularne teraz</h2>
            <Link href="/projekty" className="text-xs text-stone-500 hover:text-ogien">
              Wszystkie →
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {hot.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      )}

      {/* ---- Aktualności ------------------------------------------------------ */}
      {news.length > 0 && (
        <section className="py-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Aktualności</h2>
          <div className="flex flex-col gap-3">
            {news.map((n) => (
              <article key={n.id} className="card">
                <h3 className="font-display text-sm font-semibold text-stone-50">{n.title}</h3>
                {n.body && <p className="mt-1 text-sm leading-relaxed text-stone-400">{n.body}</p>}
                <p className="mt-2 text-xs text-stone-600">
                  {new Date(n.created_at).toLocaleDateString("pl-PL")}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
