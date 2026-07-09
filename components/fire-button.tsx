"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { dbError } from "@/lib/utils";

interface FireButtonProps {
  projectId: string;
  initialFireCount: number;
  initialHasFired: boolean;
  currentUserId: string | null;
}

export function FireButton({
  projectId,
  initialFireCount,
  initialHasFired,
  currentUserId,
}: FireButtonProps) {
  const [fireCount, setFireCount] = useState(initialFireCount);
  const [hasFired, setHasFired] = useState(initialHasFired);
  const [isPending, startTransition] = useTransition();
  // Guards against rapid double-clicks firing two inserts before React state
  // (which is async/batched) has re-rendered the disabled button.
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleFire() {
    if (!currentUserId) {
      window.location.href = "/login";
      return;
    }
    if (hasFired || isLocked || isPending) return;

    setIsLocked(true);
    setError(null);
    // Optimistic update — reverted on failure
    setHasFired(true);
    setFireCount((c) => c + 1);

    startTransition(async () => {
      const { error: insertError } = await supabase
        .from("fires")
        .insert({ project_id: projectId, user_id: currentUserId });

      if (insertError) {
        // 23505 = unique_violation → user already fired this project from
        // another tab/device; treat as success rather than an error.
        if (insertError.code === "23505") {
          setIsLocked(false);
          return;
        }
        // Any other failure: roll back the optimistic update.
        console.error("fires insert failed:", insertError);
        setHasFired(false);
        setFireCount((c) => Math.max(c - 1, 0));
        setError(dbError("Nie udało się dać 🔥", insertError));
      }
      setIsLocked(false);
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleFire}
        disabled={hasFired || isLocked || isPending}
        aria-pressed={hasFired}
        className={
          hasFired
            ? "btn-ogien accent-surface animate-fire-pop cursor-default"
            : "btn-ogien border-zinc-800 text-zinc-400 hover:border-ogien hover:text-ogien"
        }
      >
        <span aria-hidden>🔥</span>
        <span>{fireCount}</span>
      </button>
      {error && <p className="text-xs text-ogien">{error}</p>}
    </div>
  );
}
