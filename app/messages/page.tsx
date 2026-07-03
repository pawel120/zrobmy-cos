"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProfileLink } from "@/components/profile-link";
import type { Profile } from "@/types/database";

interface InboxRow {
  room_id: string;
  other_user_id: string;
  last_message_at: string;
  last_message_content: string | null;
  unread_count: number;
}

interface InboxEntry extends InboxRow {
  otherUser: Profile | null;
}

export default function MessagesInboxPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<InboxEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=/messages");
        return;
      }
      if (!isMounted) return;
      setUserId(user.id);

      const { data: rows, error: rpcError } = await supabase.rpc("get_inbox");
      if (rpcError || !rows) {
        if (isMounted) {
          setError("Nie udało się wczytać wiadomości.");
          setIsLoading(false);
        }
        return;
      }

      const inboxRows = rows as InboxRow[];
      const otherIds = [...new Set(inboxRows.map((r) => r.other_user_id))];

      let profilesById = new Map<string, Profile>();
      if (otherIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("*").in("id", otherIds);
        profilesById = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));
      }

      if (isMounted) {
        setEntries(
          inboxRows.map((r) => ({ ...r, otherUser: profilesById.get(r.other_user_id) ?? null }))
        );
        setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live-refresh the inbox when a new message lands in any room this user
  // is part of. Re-running get_inbox() is simplest and cheap at this scale;
  // a heavier app would patch just the affected row instead.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`inbox:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async () => {
        const { data: rows } = await supabase.rpc("get_inbox");
        if (!rows) return;
        const inboxRows = rows as InboxRow[];
        const otherIds = [...new Set(inboxRows.map((r) => r.other_user_id))];
        const { data: profiles } = otherIds.length
          ? await supabase.from("profiles").select("*").in("id", otherIds)
          : { data: [] };
        const profilesById = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));
        setEntries(inboxRows.map((r) => ({ ...r, otherUser: profilesById.get(r.other_user_id) ?? null })));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-xl font-semibold text-zinc-50">Wiadomości</h1>

      {error && <p className="mb-4 text-xs text-ogien">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-zinc-600">Ładowanie…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-zinc-600">
          Brak rozmów. Wejdź na czyjś profil i kliknij [Napisz], żeby zacząć.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-900">
          {entries.map((entry) => (
            <li key={entry.room_id}>
              <button
                onClick={() => router.push(`/messages/${entry.room_id}`)}
                className="flex w-full items-center justify-between gap-3 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  {entry.otherUser ? (
                    <ProfileLink profile={entry.otherUser} />
                  ) : (
                    <span className="text-zinc-600">Nieznany użytkownik</span>
                  )}
                  <p className="mt-0.5 truncate pl-8 text-sm text-zinc-500">
                    {entry.last_message_content ?? "Zacznijcie rozmowę…"}
                  </p>
                </div>
                {entry.unread_count > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center bg-ogien px-1.5 text-xs font-semibold text-black">
                    {entry.unread_count > 9 ? "9+" : entry.unread_count}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
