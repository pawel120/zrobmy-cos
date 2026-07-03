"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface JoinRequestButtonProps {
  projectId: string;
  currentUserId: string | null;
  alreadyRequested: boolean;
}

export function JoinRequestButton({ projectId, currentUserId, alreadyRequested }: JoinRequestButtonProps) {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(alreadyRequested);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return <p className="text-xs text-zinc-500">Prośba wysłana. Czekaj na odzew.</p>;
  }

  async function handleSubmit() {
    if (!currentUserId) {
      window.location.href = "/login";
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("join_requests")
      .insert({ project_id: projectId, requester_id: currentUserId, message: message.trim() });

    if (insertError) {
      // 23505 = unique_violation → a request already exists for this pair,
      // which is functionally the same as success from the user's view.
      if (insertError.code === "23505") {
        setSent(true);
      } else {
        setError("Nie udało się wysłać prośby.");
      }
      setIsSubmitting(false);
      return;
    }

    setSent(true);
    setIsSubmitting(false);
  }

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="btn-primary">
        Chcę dołączyć
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        maxLength={300}
        placeholder="Kilka słów o tym, co wnosisz (opcjonalnie)"
        className="resize-none border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-ogien"
      />
      <div className="flex items-center gap-2">
        <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? "Wysyłam…" : "Wyślij prośbę"}
        </button>
        <button onClick={() => setIsOpen(false)} className="text-xs text-zinc-500 hover:text-zinc-300">
          Anuluj
        </button>
      </div>
      {error && <p className="text-xs text-ogien">{error}</p>}
    </div>
  );
}
