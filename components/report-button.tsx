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
    return <p className="text-xs text-stone-600">Zgłoszenie wysłane. Dziękujemy.</p>;
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
        className="text-xs text-stone-600 hover:text-danger"
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
    <div className="flex flex-col gap-2 border border-stone-800 bg-stone-950 p-3">
      <p className="text-xs text-stone-500">Dlaczego zgłaszasz?</p>
      <div className="flex flex-wrap gap-1.5">
        {REASON_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setReason(preset)}
            className={
              reason === preset
                ? "border border-danger/60 bg-danger/10 px-2 py-1 text-xs text-danger"
                : "border border-stone-800 px-2 py-1 text-xs text-stone-400 hover:border-stone-600"
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
        className="resize-none border border-stone-800 bg-base-bg px-2 py-1.5 text-xs text-stone-100 outline-none focus:border-ogien"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !reason}
          className="border border-danger bg-danger/10 px-3 py-1.5 text-xs text-danger disabled:opacity-40"
        >
          {isSubmitting ? "Wysyłam…" : "Wyślij zgłoszenie"}
        </button>
        <button onClick={() => setIsOpen(false)} className="text-xs text-stone-600 hover:text-stone-300">
          Anuluj
        </button>
      </div>
    </div>
  );
}
