"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

interface ReportRowActionsProps {
  reportId: string;
}

export function ReportRowActions({ reportId }: ReportRowActionsProps) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  function respond(action: "resolved" | "dismissed", alsoShadowban: boolean) {
    setError(null);
    startTransition(async () => {
      const { error: rpcError } = await supabase.rpc("resolve_report", {
        report_id: reportId,
        action,
        also_shadowban: alsoShadowban,
      });

      if (rpcError) {
        setError("Nie udało się przetworzyć.");
        return;
      }
      setResolved(true);
    });
  }

  if (resolved) return <span className="text-xs text-stone-600">Gotowe</span>;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => respond("resolved", true)}
        disabled={isPending}
        className="border border-danger bg-danger/10 px-2 py-1 text-xs text-danger disabled:opacity-40"
      >
        Shadowban
      </button>
      <button
        onClick={() => respond("resolved", false)}
        disabled={isPending}
        className="border border-stone-800 px-2 py-1 text-xs text-stone-400 hover:border-stone-600 disabled:opacity-40"
      >
        Rozwiąż
      </button>
      <button
        onClick={() => respond("dismissed", false)}
        disabled={isPending}
        className="border border-stone-800 px-2 py-1 text-xs text-stone-600 hover:border-stone-600 disabled:opacity-40"
      >
        Odrzuć
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
