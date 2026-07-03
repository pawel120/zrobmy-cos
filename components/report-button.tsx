"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ReportTarget = { reportedProfileId: string } | { reportedProjectId: string };

interface ReportButtonProps {
  target: ReportTarget;
  currentUserId: string | null;
}

const REASON_PRESETS = ["Spam", "Nękanie", "Fałszywy profil/projekt", "Nieodpowiednia treść", "Inne"];

export function ReportButton({ target, currentUserId }: ReportButtonProps) {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return <p className="text-xs text-zinc-600">Zgłoszenie wysłane. Dziękujemy.</p>;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          if (!currentUserId) {
            window.location.href = "/login";
            return;
          }
          setIsOpen(true);
        }}
        className="text-xs text-zinc-600 hover:text-ogien"
      >
        Zgłoś
      </button>
    );
  }

  async function handleSubmit() {
    if (!currentUserId) return;
    const composedReason = detail.trim() ? `${reason}: ${detail.trim()}` : reason;
    if (composedReason.trim().length < 3) {
      setError("Wybierz powód zgłoszenia.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("reports").insert({
      reporter_id: currentUserId,
      reason: composedReason,
      ...("reportedProfileId" in target
        ? { reported_profile_id: target.reportedProfileId }
        : { reported_project_id: target.reportedProjectId }),
    });

    if (insertError) {
      setError("Nie udało się wysłać zgłoszenia.");
      setIsSubmitting(false);
      return;
    }

    setSent(true);
    setIsSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-2 border border-zinc-800 bg-zinc-950 p-3">
      <p className="text-xs text-zinc-500">Dlaczego zgłaszasz?</p>
      <div className="flex flex-wrap gap-1.5">
        {REASON_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setReason(preset)}
            className={
              reason === preset
                ? "border border-ogien/60 bg-ogien/10 px-2 py-1 text-xs text-ogien"
                : "border border-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-600"
            }
          >
            {preset}
          </button>
        ))}
      </div>
      <textarea
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        rows={2}
        maxLength={400}
        placeholder="Szczegóły (opcjonalnie)"
        className="resize-none border border-zinc-800 bg-black px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-ogien"
      />
      {error && <p className="text-xs text-ogien">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !reason}
          className="border border-ogien bg-ogien/10 px-3 py-1.5 text-xs text-ogien disabled:opacity-40"
        >
          {isSubmitting ? "Wysyłam…" : "Wyślij zgłoszenie"}
        </button>
        <button onClick={() => setIsOpen(false)} className="text-xs text-zinc-600 hover:text-zinc-300">
          Anuluj
        </button>
      </div>
    </div>
  );
}
