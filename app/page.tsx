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

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="hairline mb-6 flex items-center justify-between pb-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-50">Zróbmy coś</h1>
          <p className="text-sm text-zinc-500">Znajdź projekt albo znajdź ekipę.</p>
        </div>
        {user ? (
          <Link href="/project/new" className="btn-primary">
            Wrzuć projekt
          </Link>
        ) : (
          <Link href="/signup" className="btn-primary">
            Zaloguj się
          </Link>
        )}
      </div>

      {user && (
        <div className="mb-5 flex gap-4 text-sm">
          <Link
            href="/?sort=najgorętsze"
            className={sort === "najgorętsze" ? "text-ogien" : "text-zinc-500 hover:text-zinc-300"}
          >
            🔥 Najgorętsze
          </Link>
          <Link
            href="/?sort=najnowsze"
            className={sort === "najnowsze" ? "text-ogien" : "text-zinc-500 hover:text-zinc-300"}
          >
            Najnowsze
          </Link>
        </div>
      )}

      {!user ? (
        <div className="space-y-4">
          <div className="card text-center">
            <h2 className="text-lg font-semibold text-zinc-50">Witaj 👋</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Zaloguj się, żeby przeglądać projekty, szukać ekipy albo wrzucić swój pomysł.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Link href="/login" className="btn-primary">
                Zaloguj się
              </Link>
              <Link href="/signup" className="btn-primary">
                Załóż konto
              </Link>
            </div>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="card text-center text-sm text-zinc-500">
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
