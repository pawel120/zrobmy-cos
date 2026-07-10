import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProjectCard } from "@/components/project-card";
import type { Project } from "@/types/database";

interface HomePageProps {
  searchParams: { sort?: string };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const sort = searchParams.sort === "najnowsze" ? "najnowsze" : "najgorętsze";

  let projects: Project[] = [];

  if (sort === "najgorętsze") {
    const { data } = await supabase.rpc("get_hot_projects", { days_back: 7, limit_count: 30 });
    projects = (data ?? []) as Project[];
  } else {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("is_shadowbanned", false)
      .order("created_at", { ascending: false })
      .limit(30);
    projects = (data ?? []) as Project[];
  }

  // ---- Landing for logged-out visitors -----------------------------------
  // Same route, conditional render — no redirects, and the hot-projects
  // preview reuses the query above (RLS: projects are publicly readable).
  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-14">
        <section className="pb-10 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-stone-50 sm:text-4xl">
            Zbudujmy <span className="text-ogien">coś</span> razem.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-stone-400">
            Pomysły spotykają ludzi. Ludzie spotykają projekty.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/signup" className="accent-surface rounded-sm px-5 py-2 text-sm font-medium hover:bg-ogien/20">
              Załóż konto
            </Link>
            <Link href="/login" className="btn-primary">
              Zaloguj się
            </Link>
          </div>
        </section>

        <section className="grid gap-3 pb-10 sm:grid-cols-2">
          <div className="card">
            <h2 className="font-display text-base font-medium text-stone-50">Mam pomysł</h2>
            <p className="mt-1 text-sm text-stone-400">
              Wrzuć projekt, pokaż o co gra i zbierz ekipę, która go zbuduje.
            </p>
          </div>
          <div className="card">
            <h2 className="font-display text-base font-medium text-stone-50">Chcę budować</h2>
            <p className="mt-1 text-sm text-stone-400">
              Opisz, co potrafisz, i znajdź projekt, w którym to zagra.
            </p>
          </div>
        </section>

        <section className="hairline grid gap-4 pb-10 sm:grid-cols-3">
          <div>
            <p className="font-mono text-xs text-ogien">01 / wrzuć</p>
            <p className="mt-1 text-sm text-stone-400">Opisz projekt w 2 minuty.</p>
          </div>
          <div>
            <p className="font-mono text-xs text-ogien">02 / zbierz</p>
            <p className="mt-1 text-sm text-stone-400">Ludzie klikają „Chcę dołączyć&rdquo;.</p>
          </div>
          <div>
            <p className="font-mono text-xs text-ogien">03 / budujcie</p>
            <p className="mt-1 text-sm text-stone-400">Czat w apce i lecicie.</p>
          </div>
        </section>

        {projects.length > 0 && (
          <section className="py-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Najgorętsze teraz
            </h2>
            <div className="flex flex-col gap-3">
              {projects.slice(0, 3).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </section>
        )}
      </main>
    );
  }

  // ---- Feed for logged-in users -------------------------------------------
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="hairline mb-6 flex items-center justify-between pb-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-stone-50">Projekty</h1>
          <p className="text-sm text-stone-500">Znajdź projekt albo znajdź ekipę.</p>
        </div>
        <Link href="/project/new" className="accent-surface rounded-sm px-4 py-2 text-sm font-medium hover:bg-ogien/20">
          Wrzuć projekt
        </Link>
      </div>

      <div className="mb-5 flex gap-4 text-sm">
        <Link
          href="/?sort=najgorętsze"
          className={sort === "najgorętsze" ? "text-ogien" : "text-stone-500 hover:text-stone-300"}
        >
          🔥 Najgorętsze
        </Link>
        <Link
          href="/?sort=najnowsze"
          className={sort === "najnowsze" ? "text-ogien" : "text-stone-500 hover:text-stone-300"}
        >
          Najnowsze
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="card text-center text-sm text-stone-500">
          Cicho tu. Bądź pierwszy —{" "}
          <Link href="/project/new" className="text-ogien underline">
            wrzuć projekt
          </Link>
          .
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </main>
  );
}
