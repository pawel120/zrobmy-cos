"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types/database";

const TYPE_ICON: Record<string, string> = {
  fire_received: "🔥",
  join_request: "🤝",
  new_message: "💬",
  system: "📣",
};

function notificationHref(n: Notification): string {
  if (n.type === "new_message" && n.room_id) return `/messages/${n.room_id}`;
  if (n.project_id) return `/project/${n.project_id}`;
  return "#";
}

export default function NotificationsPage() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toast, setToast] = useState<Notification | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !isMounted) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (isMounted) {
        setNotifications((data ?? []) as Notification[]);
        setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const notif = payload.new as Notification;
          setNotifications((prev) => [notif, ...prev]);
          setToast(notif);
          window.setTimeout(() => setToast((current) => (current?.id === notif.id ? null : current)), 4000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  }, [userId, supabase]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      {toast && (
        <div className="animate-toast-in fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 border border-ogien/50 bg-base-bg px-4 py-2 text-sm text-stone-100 shadow-lg">
          <span aria-hidden>{TYPE_ICON[toast.type]}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="hairline flex items-center justify-between pb-4">
        <h1 className="text-lg font-semibold text-stone-50">Powiadomienia</h1>
        <button onClick={markAllRead} className="text-xs text-stone-500 hover:text-ogien">
          Oznacz wszystkie jako przeczytane
        </button>
      </div>

      {isLoading ? (
        <p className="py-6 text-sm text-stone-600">Ładowanie…</p>
      ) : notifications.length === 0 ? (
        <p className="py-6 text-sm text-stone-600">Na razie cisza. Wróć tu, gdy coś się wydarzy.</p>
      ) : (
        <ul className="divide-y divide-stone-800">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link
                href={notificationHref(n)}
                className={`flex items-start gap-3 py-3 ${n.is_read ? "opacity-60" : ""}`}
              >
                <span className="text-lg" aria-hidden>
                  {TYPE_ICON[n.type]}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-stone-200">{n.message}</p>
                  <p className="mt-0.5 text-xs text-stone-600">
                    {new Date(n.created_at).toLocaleString("pl-PL")}
                  </p>
                </div>
                {!n.is_read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ogien" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
