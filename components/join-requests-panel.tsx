"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProfileLink } from "@/components/profile-link";
import type { JoinRequest, Profile } from "@/types/database";

interface JoinRequestsPanelProps {
  projectId: string;
}

interface RequestWithRequester extends JoinRequest {
  requester: Profile | null;
}

export function JoinRequestsPanel({ projectId }: JoinRequestsPanelProps) {
  const supabase = createClient();
  const router = useRouter();
  const [requests, setRequests] = useState<RequestWithRequester[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("join_requests")
      .select("*, requester:profiles!join_requests_requester_id_fkey(*)")
      .eq("project_id", projectId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    setRequests((data ?? []) as RequestWithRequester[]);
    setIsLoading(false);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`join-requests:${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "join_requests", filter: `project_id=eq.${projectId}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function respond(requestId: string, accept: boolean) {
    setRespondingId(requestId);
    setError(null);

    const { data: roomId, error: rpcError } = await supabase.rpc("respond_to_join_request", {
      request_id: requestId,
      accept,
    });

    if (rpcError) {
      // Surface the real Postgres/PostgREST error instead of swallowing it —
      // a "could not find function" here means the respond_to_join_request RPC
      // wasn't created (partial schema.sql run); anything else is a runtime
      // error raised inside the function.
      console.error("respond_to_join_request failed:", rpcError);
      setError(`Nie udało się przetworzyć odpowiedzi: ${rpcError.message}`);
      setRespondingId(null);
      return;
    }

    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    setRespondingId(null);

    if (accept && roomId) {
      router.push(`/messages/${roomId}`);
    }
  }

  if (isLoading || requests.length === 0) return null;

  return (
    <section className="hairline py-6">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Prośby o dołączenie ({requests.length})
      </h2>
      <div className="flex flex-col gap-3">
        {requests.map((req) => (
          <div key={req.id} className="card">
            <div className="flex items-start justify-between gap-3">
              {req.requester ? <ProfileLink profile={req.requester} size="sm" /> : <span>Nieznany</span>}
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => respond(req.id, true)}
                  disabled={respondingId === req.id}
                  className="accent-surface btn-ogien"
                >
                  Akceptuj
                </button>
                <button
                  onClick={() => respond(req.id, false)}
                  disabled={respondingId === req.id}
                  className="border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-600"
                >
                  Odrzuć
                </button>
              </div>
            </div>
            {req.message && <p className="mt-2 text-sm text-zinc-400">{req.message}</p>}
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-ogien">{error}</p>}
    </section>
  );
}
