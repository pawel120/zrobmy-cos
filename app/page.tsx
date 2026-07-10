import Link from "next/link";
import { ArrowRight, Lightbulb, Hammer, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProjectCard } from "@/components/project-card";
import type { Project } from "@/types/database";

// Landing-wizytówka: always rendered on "/", logged-in or not. The logo links
// here; the app itself lives under /projekty.
export default async function LandingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: hotData }, { data: newsData }] = await Promise.all([
    supabase.rpc("get_hot_projects", { days_back: 30, limit_count: 3 }),
    supabase
      .from("news")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const hot = (hotData ?? []) as Project[];
  const news = newsData ?? [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-14">
      {/* ---- Hero ----------------------------------------------------------- */}
      <section className="pb-12 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-stone-50 sm:text-4xl">
          Dla tych, którzy wolą <span className="text-ogien">tworzyć</span> niż planować.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-stone-400">
          BuildTogether łączy ludzi z pomysłami, twórców szukających projektów i inwestorów
          szukających okazji. Wrzucasz pomysł, zbierasz zespół, budujecie.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link href="/projekty" className="btn-primary">
            Przejdź do projektów
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          {!user && (
            <Link href="/signup" className="btn-ghost">
              Załóż konto
            </Link>
          )}
        </div>
      </section>

      {/* ---- O inicjatywie --------------------------------------------------- */}
      <section className="hairline grid gap-3 pb-12 sm:grid-cols-3">
        <div className="card">
          <Lightbulb className="h-5 w-5 text-ogien" aria-hidden />
          <h2 className="mt-2 font-display text-sm font-semibold text-stone-50">Masz pomysł</h2>
          <p className="mt-1 text-sm text-stone-400">Opisz projekt w 2 minuty i pokaż go światu.</p>
        </div>
        <div className="card">
          <Hammer className="h-5 w-5 text-ogien" aria-hidden />
          <h2 className="mt-2 font-display text-sm font-semibold text-stone-50">Chcesz budować</h2>
          <p className="mt-1 text-sm text-stone-400">Znajdź projekt, w którym Twoje umiejętności zagrają.</p>
        </div>
        <div className="card">
          <Megaphone className="h-5 w-5 text-ogien" aria-hidden />
          <h2 className="mt-2 font-display text-sm font-semibold text-stone-50">Szukasz okazji</h2>
          <p className="mt-1 text-sm text-stone-400">Przeglądaj projekty, które szukają finansowania.</p>
        </div>
      </section>

      {/* ---- Aktualności ------------------------------------------------------ */}
      {news.length > 0 && (
        <section className="py-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Aktualności
          </h2>
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

      {/* ---- Podgląd projektów ----------------------------------------------- */}
      {hot.length > 0 && (
        <section className="py-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Popularne teraz
            </h2>
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
    </main>
  );
}
