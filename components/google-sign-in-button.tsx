"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dbError } from "@/lib/utils";

// Self-contained "Continue with Google" button. OAuth redirects the whole
// browser to Google and back to /auth/callback, which exchanges the code for a
// session (same route the magic link uses). redirectTo carries no query so a
// plain /auth/callback matches the Supabase redirect allowlist cleanly — a
// ?next=… tail has broken that match before and dropped users on the root.
export function GoogleSignInButton() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setIsLoading(true);
    setError(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (oauthError) {
      console.error("google sign-in failed:", oauthError);
      setError(dbError("Nie udało się zalogować przez Google", oauthError));
      setIsLoading(false);
    }
    // On success the browser navigates away — nothing else to do here.
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 border border-stone-800 px-3 py-2 text-sm text-stone-100 hover:border-stone-600 disabled:opacity-40"
      >
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.6 26.9 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.6 5.1C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.6 5.6C39.9 36.5 44 31 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {isLoading ? "Przekierowuję…" : "Kontynuuj z Google"}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
