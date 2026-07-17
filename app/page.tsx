import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProjectCard } from "@/components/project-card";
import { ApplyForm } from "@/components/apply-form";
import type { Project } from "@/types/database";

// Landing-filtr: the page is the first test, not a brochure. Entry costs an
// artifact — the hero application form is the only way in for visitors.
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
    { count: fireCount },
  ] = await Promise.all([
    supabase.rpc("get_hot_projects", { days_back: 30, limit_count: 3 }),
    supabase
      .from("news")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.from("projects").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_shadowbanned", false),
    supabase.from("fires").select("*", { count: "exact", head: true }),
  ]);

  const hot = (hotData ?? []) as Project[];
  const news = newsData ?? [];

  const pulse = [
    { value: projectCount ?? 0, label: "projektów w budowie" },
    { value: builderCount ?? 0, label: "builderów" },
    { value: fireCount ?? 0, label: "podpalonych 🔥" },
  ];

  return (
    <main className="mx-auto max-w-2xl px-4 py-14">
      {/* ---- Hero: aplikacja jest filtrem ------------------------------------ */}
      <section className="pb-14 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-stone-50 sm:text-4xl">
          Zbudowałeś coś? <span className="text-ogien">Pokaż.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-stone-400">
          BuildTogether to miejsce, gdzie wstęp kosztuje artefakt. Projekt, deploy, produkt —
          cokolwiek, co istnieje. Pomysły nie są walutą.
        </p>

        <div className="mt-8">
          {user ? (
            <Link href="/projekty" className="btn-primary">
              Przejdź do projektów
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <ApplyForm />
          )}
        </div>

        {!user && (
          <p className="mt-5 text-xs text-stone-600">
            Masz już konto?{" "}
            <Link href="/login" className="text-stone-400 underline hover:text-ogien">
              Zaloguj się
            </Link>
          </p>
        )}
      </section>

      {/* ---- Anty-pitch: odsiew jawny ---------------------------------------- */}
      <section className="pb-12">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
          To nie jest miejsce dla ciebie, jeśli
        </h2>
        <ul className="flex flex-col gap-2 text-sm text-stone-400">
          <li className="flex gap-2">
            <span className="text-stone-600">—</span>
            szukasz programisty do „pomysłu na Ubera&rdquo;,
          </li>
          <li className="flex gap-2">
            <span className="text-stone-600">—</span>
            chcesz podyskutować o startupach,
          </li>
          <li className="flex gap-2">
            <span className="text-stone-600">—</span>
            planujesz zacząć od poniedziałku.
          </li>
        </ul>
        <p className="mt-4 text-sm font-medium text-stone-300">
          Tu się nie networkuje. Tu się buduje.
        </p>
      </section>

      {/* ---- Tętno: surowe liczby z bazy -------------------------------------- */}
      <section className="hairline py-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
          Tętno
        </h2>
        <div className="grid grid-cols-3 gap-3 pb-10">
          {pulse.map((stat) => (
            <div key={stat.label} className="card text-center">
              <p className="font-mono text-2xl font-bold text-stone-50">{stat.value}</p>
              <p className="mt-1 text-xs text-stone-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Podgląd projektów ----------------------------------------------- */}
      {hot.length > 0 && (
        <section className="py-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Budowane teraz
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

      {/* ---- Manifest ---------------------------------------------------------- */}
      <section className="border-t pt-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
          Zasady
        </h2>
        <ol className="flex flex-col gap-2 text-sm leading-relaxed text-stone-400">
          <li>Wstęp za artefakt. Pomysł nie wystarczy.</li>
          <li>Wyjście z projektu — zawsze z jednym zdaniem dlaczego. Zniknięcie zostaje w historii.</li>
          <li>Projekt bez postępu umiera publicznie, nie po cichu.</li>
          <li>Reputację buduje dowożenie. Nic innego.</li>
        </ol>
      </section>
    </main>
  );
}
