"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dbError } from "@/lib/utils";
import { ProfileLink } from "@/components/profile-link";
import type { Message, Profile } from "@/types/database";

interface ChatPageProps {
  params: { chatId: string };
}

// Union of a persisted DB message and an optimistic client-only message.
// Optimistic messages get a temporary id prefixed with "tmp-" and are
// reconciled (or dropped) once the real row arrives over realtime.
interface UIMessage extends Message {
  pending?: boolean;
}

export default function ChatPage({ params }: ChatPageProps) {
  const router = useRouter();
  const supabase = createClient();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Tracks ids we've already rendered, across both optimistic and realtime
  // paths, so a message can never be shown twice — the second insert of
  // "the same" message (echoed back over realtime after we already added
  // it optimistically) is dropped rather than appended.
  const seenIds = useRef<Set<string>>(new Set());

  const appendMessage = useCallback((msg: UIMessage) => {
    if (seenIds.current.has(msg.id)) return;
    seenIds.current.add(msg.id);
    setMessages((prev) => [...prev, msg]);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }
      if (!isMounted) return;
      setCurrentUserId(user.id);

      const { data: room, error: roomError } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("id", params.chatId)
        .single();

      if (roomError || !room) {
        setLoadError("Nie znaleziono tego czatu.");
        return;
      }

      const otherUserId = room.user_a === user.id ? room.user_b : room.user_a;
      const { data: otherProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", otherUserId)
        .single();
      if (!otherProfile) {
        // Without this the header shows "Ładowanie…" forever (e.g. the other
        // account's profile was deleted) — fail visibly instead.
        if (isMounted) setLoadError("Nie znaleziono rozmówcy — konto mogło zostać usunięte.");
        return;
      }
      if (isMounted) setOtherUser(otherProfile as Profile);

      const { data: history } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", params.chatId)
        .order("created_at", { ascending: true });

      if (isMounted && history) {
        history.forEach((m) => appendMessage(m as UIMessage));
      }

      // Mark incoming messages as read now that the user has opened the room.
      // Fire-and-forget: it only affects the unread badge, so a failure here
      // shouldn't block rendering the conversation.
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("room_id", params.chatId)
        .neq("sender_id", user.id)
        .is("read_at", null);
    }

    init();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.chatId]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`room:${params.chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${params.chatId}` },
        (payload) => {
          appendMessage(payload.new as UIMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.chatId, currentUserId, appendMessage, supabase]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const content = draft.trim();
    if (!content || !currentUserId || isSending) return;

    setIsSending(true);
    setDraft("");

    // Optimistic bubble with a temp id — replaced/deduped when the real
    // row comes back over the realtime channel above.
    const tempId = `tmp-${crypto.randomUUID()}`;
    const optimistic: UIMessage = {
      id: tempId,
      room_id: params.chatId,
      sender_id: currentUserId,
      content,
      read_at: null,
      created_at: new Date().toISOString(),
      pending: true,
    };
    seenIds.current.add(tempId);
    setMessages((prev) => [...prev, optimistic]);

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({ room_id: params.chatId, sender_id: currentUserId, content })
      .select()
      .single();

    if (error) {
      console.error("message insert failed:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setLoadError(dbError("Wiadomość nie została wysłana", error));
    } else if (inserted) {
      // Swap the temp bubble for the real row (same content, real id) and
      // mark the real id as seen so the realtime echo is ignored.
      seenIds.current.add(inserted.id);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? (inserted as UIMessage) : m)));
    }

    setIsSending(false);
  }

  if (loadError && !otherUser) {
    return <main className="mx-auto max-w-2xl px-4 py-10 text-sm text-danger">{loadError}</main>;
  }

  return (
    <main className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col px-4 py-6">
      <header className="hairline flex items-center justify-between pb-4">
        {otherUser ? <ProfileLink profile={otherUser} /> : <span className="text-stone-600">Ładowanie…</span>}
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={
                  isMine
                    ? "max-w-[75%] border border-ogien/40 bg-ogien/10 px-3 py-2 text-sm text-stone-100"
                    : "max-w-[75%] border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-200"
                }
                style={{ opacity: msg.pending ? 0.6 : 1 }}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {loadError && <p className="pb-2 text-xs text-danger">{loadError}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="hairline flex items-center gap-2 pt-4"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Napisz coś…"
          className="flex-1 border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
          maxLength={4000}
        />
        <button type="submit" disabled={!draft.trim() || isSending} className="btn-primary">
          Wyślij
        </button>
      </form>
    </main>
  );
}
