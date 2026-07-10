"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    // Always show the same success state regardless of whether the email
    // exists — this endpoint must not leak which addresses have accounts.
    if (resetError) {
      setError("Coś poszło nie tak. Spróbuj ponownie za chwilę.");
      setIsLoading(false);
      return;
    }

    setSent(true);
    setIsLoading(false);
  }

  if (sent) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col justify-center px-4">
        <h1 className="mb-2 text-xl font-semibold text-stone-50">Sprawdź skrzynkę</h1>
        <p className="text-sm text-stone-400">
          Jeśli <span className="text-stone-50">{email}</span> ma u nas konto, wysłaliśmy link do resetu hasła.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-xl font-semibold text-stone-50">Zapomniałeś hasła?</h1>
      <p className="mb-8 text-sm text-stone-500">Wyślemy Ci link do ustawienia nowego.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-stone-500">
          E-mail
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
            placeholder="ty@email.com"
          />
        </label>

        {error && <p className="text-xs text-danger">{error}</p>}

        <button type="submit" disabled={isLoading} className="btn-primary mt-2">
          {isLoading ? "Wysyłam…" : "Wyślij link"}
        </button>
      </form>

      <p className="mt-8 text-sm text-stone-500">
        <Link href="/login" className="text-stone-100 underline hover:text-ogien">
          Wróć do logowania
        </Link>
      </p>
    </main>
  );
}
