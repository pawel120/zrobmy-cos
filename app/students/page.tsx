"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
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
      <h1 className="mb-1 font-display text-xl font-semibold text-stone-50">Ludzie</h1>
      <p className="mb-6 text-sm text-stone-500">Twórcy gotowi do współpracy — szukaj po umiejętnościach.</p>

      <div className="hairline mb-4 flex flex-wrap items-center gap-2 pb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Szukaj po nazwie…"
          className="min-w-[160px] flex-1 input"
        />
        <input
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          placeholder="Umiejętność, np. React"
          className="min-w-[160px] flex-1 input"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "hype" | "recent")}
          className="border border-stone-800 bg-stone-950 px-2 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
        >
          <option value="hype">Najaktywniejsi</option>
          <option value="recent">Nowi</option>
        </select>
      </div>

      {error && <p className="mb-4 text-xs text-danger">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-stone-600">Ładowanie…</p>
      ) : profiles.length === 0 ? (
        <p className="text-sm text-stone-600">Nikt nie pasuje do tych filtrów.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {profiles.map((p) => (
            <Link
              key={p.id}
              href={`/user/${p.id}`}
              className="block rounded-lg border border-stone-800 bg-stone-900 p-4 transition-colors hover:border-stone-600"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-800 text-xs text-stone-300">
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      p.username.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-stone-100">{p.display_name || p.username}</p>
                    <p className="text-xs text-stone-500">
                      @{p.username}
                      {p.faculty ? ` · ${p.faculty}` : ""}
                    </p>
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-ogien">
                  <Flame className="h-3.5 w-3.5" aria-hidden /> {p.hype_score}
                </span>
              </div>
              {p.skills_have.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wide text-stone-600">Potrafi</span>
                  {p.skills_have.slice(0, 5).map((s) => (
                    <span key={s} className="tag">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between text-sm">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || isLoading}
          className="btn-ghost !px-3 !py-1.5 disabled:opacity-30"
        >
          Poprzednia
        </button>
        <span className="text-stone-600">Strona {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore || isLoading}
          className="btn-ghost !px-3 !py-1.5 disabled:opacity-30"
        >
          Następna
        </button>
      </div>
    </main>
  );
}
