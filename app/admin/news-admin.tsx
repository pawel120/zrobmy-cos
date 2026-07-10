"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createNews, deleteNews } from "./actions";

interface NewsItem {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

export function NewsAdmin({ items }: { items: NewsItem[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) {
      setError("Tytuł musi mieć co najmniej 3 znaki.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createNews(title, body);
        setTitle("");
        setBody("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Coś poszło nie tak.");
      }
    });
  }

  function handleDelete(id: string) {
    if (confirmingId !== id) {
      setConfirmingId(id);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteNews(id);
        setConfirmingId(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Coś poszło nie tak.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={handleAdd} className="card flex flex-col gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Tytuł aktualności"
          className="border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Treść (opcjonalnie)"
          className="resize-none border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <button type="submit" disabled={isPending} className="btn-primary self-start">
          {isPending ? "Zapisuję…" : "Opublikuj"}
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-stone-600">Brak aktualności.</p>
      ) : (
        <ul className="divide-y divide-stone-900">
          {items.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-100">{n.title}</p>
                {n.body && <p className="mt-0.5 line-clamp-2 text-sm text-stone-500">{n.body}</p>}
                <p className="mt-1 text-xs text-stone-600">
                  {new Date(n.created_at).toLocaleDateString("pl-PL")}
                </p>
              </div>
              <button
                onClick={() => handleDelete(n.id)}
                onBlur={() => setConfirmingId(null)}
                disabled={isPending}
                className={
                  confirmingId === n.id
                    ? "shrink-0 rounded-full border border-danger bg-danger/10 px-2 py-1 text-xs text-danger"
                    : "shrink-0 rounded-full border border-stone-800 px-2 py-1 text-xs text-stone-400 hover:border-danger hover:text-danger"
                }
              >
                {confirmingId === n.id ? "Na pewno?" : "Usuń"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
