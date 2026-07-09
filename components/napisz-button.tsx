"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dbError } from "@/lib/utils";

interface NapiszButtonProps {
  targetUserId: string;
  currentUserId: string | null;
}

export function NapiszButton({ targetUserId, currentUserId }: NapiszButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  if (currentUserId === targetUserId) return null;

  async function handleClick() {
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    setIsLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("get_or_create_chat_room", {
      other_user_id: targetUserId,
    });

    if (rpcError || !data) {
      console.error("get_or_create_chat_room failed:", rpcError);
      setError(dbError("Nie udało się otworzyć czatu", rpcError));
      setIsLoading(false);
      return;
    }

    router.push(`/messages/${data}`);
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button onClick={handleClick} disabled={isLoading} className="btn-primary">
        {isLoading ? "Otwieram…" : "[Napisz]"}
      </button>
      {error && <p className="text-xs text-ogien">{error}</p>}
    </div>
  );
}
