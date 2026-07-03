"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ProfileLink } from "@/components/profile-link";
import type { Profile } from "@/types/database";
import type { ProfilesResponse } from "@/app/api/profiles/route";

export default function StudentsPage() {
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState("");
  const [sort, setSort] = useState<"hype" | "recent">("hype");
  const [page, setPage] = useState(1);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce free-text search so every keystroke doesn't fire a request.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(q), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  // Any filter change resets to page 1.
  useEffect(() => {
    setPage(1);
  }, [debouncedQ, skill, sort]);

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({ sort, page: String(page), pageSize: "20" });
    if (debouncedQ) params.set("q", debouncedQ);
    if (skill) params.set("skill", skill);

    try {
      const res = await fetch(`/api/profiles?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data: ProfilesResponse = await res.json();
      setProfiles(data.profiles);
      setHasMore(data.hasMore);
    } catch {
      setError("Nie udało się wczytać profili.");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQ, skill, sort, page]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-xl font-semibold text-zinc-50">Ludzie</h1>
      <p className="mb-6 text-sm text-zinc-500">Szukaj po umiejętnościach, znajdź ekipę.</p>

      <div className="hairline mb-4 flex flex-wrap items-center gap-2 pb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Szukaj po nazwie…"
          className="min-w-[160px] flex-1 border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-ogien"
        />
        <input
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          placeholder="Umiejętność, np. React"
          className="min-w-[160px] flex-1 border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-ogien"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "hype" | "recent")}
          className="border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm text-zinc-100 outline-none focus:border-ogien"
        >
          <option value="hype">Najwięcej hype&apos;u</option>
          <option value="recent">Najnowsi</option>
        </select>
      </div>

      {error && <p className="mb-4 text-xs text-ogien">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-zinc-600">Ładowanie…</p>
      ) : profiles.length === 0 ? (
        <p className="text-sm text-zinc-600">Nikt nie pasuje do tych filtrów.</p>
      ) : (
        <ul className="divide-y divide-zinc-900">
          {profiles.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-3">
              <div>
                <ProfileLink profile={p} />
                {p.faculty && <p className="mt-0.5 pl-8 text-xs text-zinc-600">{p.faculty}</p>}
              </div>
              <span className="flex items-center gap-1 text-xs text-ogien">🔥 {p.hype_score}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex items-center justify-between text-sm">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || isLoading}
          className="border border-zinc-800 px-3 py-1.5 text-zinc-400 hover:border-zinc-600 disabled:opacity-30"
        >
          Poprzednia
        </button>
        <span className="text-zinc-600">Strona {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore || isLoading}
          className="border border-zinc-800 px-3 py-1.5 text-zinc-400 hover:border-zinc-600 disabled:opacity-30"
        >
          Następna
        </button>
      </div>
    </main>
  );
}
