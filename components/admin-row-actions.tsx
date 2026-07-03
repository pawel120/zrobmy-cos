"use client";

import { useState, useTransition } from "react";

interface AdminRowActionsProps {
  isShadowbanned: boolean;
  onToggleShadowban: (next: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
  deleteConfirmLabel: string;
}

export function AdminRowActions({
  isShadowbanned,
  onToggleShadowban,
  onDelete,
  deleteConfirmLabel,
}: AdminRowActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      try {
        await onToggleShadowban(!isShadowbanned);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Coś poszło nie tak.");
      }
    });
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await onDelete();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Coś poszło nie tak.");
        setConfirmingDelete(false);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        disabled={isPending}
        className="border border-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-600 disabled:opacity-40"
      >
        {isShadowbanned ? "Cofnij shadowban" : "Shadowban"}
      </button>
      <button
        onClick={handleDelete}
        onBlur={() => setConfirmingDelete(false)}
        disabled={isPending}
        className={
          confirmingDelete
            ? "border border-ogien bg-ogien/10 px-2 py-1 text-xs text-ogien disabled:opacity-40"
            : "border border-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:border-ogien hover:text-ogien disabled:opacity-40"
        }
      >
        {confirmingDelete ? deleteConfirmLabel : "Usuń"}
      </button>
      {error && <span className="text-xs text-ogien">{error}</span>}
    </div>
  );
}
