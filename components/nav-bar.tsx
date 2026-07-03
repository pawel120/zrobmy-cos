"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function NavBar() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isMounted) return;
      setUserId(user?.id ?? null);

      if (user) {
        const { count } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false);
        if (isMounted) setUnreadCount(count ?? 0);
      }
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`nav-notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => setUnreadCount((c) => c + 1)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  // Visiting the notification center clears the badge locally — the page
  // itself marks rows read; this just keeps the nav in sync without a refetch.
  useEffect(() => {
    if (pathname === "/notifications") setUnreadCount(0);
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const linkClass = (href: string) =>
    pathname === href ? "text-ogien" : "text-zinc-500 hover:text-zinc-300";

  return (
    <header className="hairline sticky top-0 z-40 bg-black/90 backdrop-blur">
      <nav className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 text-sm">
        <Link href="/" className="font-display font-semibold text-zinc-50">
          Zróbmy coś
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/students" className={linkClass("/students")}>
            Ludzie
          </Link>

          {userId === undefined ? null : userId ? (
            <>
              <Link href="/messages" className={linkClass("/messages")}>
                Wiadomości
              </Link>
              <Link href="/notifications" className={`relative ${linkClass("/notifications")}`}>
                Powiadomienia
                {unreadCount > 0 && (
                  <span className="absolute -right-3 -top-1.5 flex h-4 min-w-4 items-center justify-center bg-ogien px-1 text-[10px] font-semibold text-black">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <Link href="/settings" className={linkClass("/settings")}>
                Ustawienia
              </Link>
              <button onClick={handleLogout} className="text-zinc-500 hover:text-ogien">
                Wyloguj
              </button>
            </>
          ) : (
            <Link href="/login" className={linkClass("/login")}>
              Zaloguj się
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
