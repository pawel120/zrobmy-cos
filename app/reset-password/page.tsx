"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // The recovery link round-trips through /auth/callback, which exchanges
    // the code for a real session before redirecting here — so by the time
    // this page mounts, getSession() should already reflect it.
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Hasła się nie zgadzają.");
      return;
    }

    setIsSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("Nie udało się zmienić hasła. Poproś o nowy link i spróbuj ponownie.");
      setIsSaving(false);
      return;
    }

    setDone(true);
    setIsSaving(false);
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1500);
  }

  if (hasSession === null) {
    return <main className="mx-auto max-w-sm px-4 py-10 text-sm text-stone-600">Ładowanie…</main>;
  }

  if (!hasSession) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col justify-center px-4">
        <h1 className="mb-2 text-xl font-semibold text-stone-50">Link wygasł</h1>
        <p className="text-sm text-stone-400">
          Ten link do resetu hasła jest nieprawidłowy albo już wygasł. Poproś o nowy.
        </p>
      </main>
    );
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col justify-center px-4">
        <h1 className="mb-2 text-xl font-semibold text-stone-50">Gotowe</h1>
        <p className="text-sm text-stone-400">Hasło zmienione. Przenosimy Cię na stronę główną…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-xl font-semibold text-stone-50">Ustaw nowe hasło</h1>
      <p className="mb-8 text-sm text-stone-500">Ostatni krok.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Nowe hasło
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            className="border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
            placeholder="min. 8 znaków"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Powtórz hasło
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            className="border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
          />
        </label>

        {error && <p className="text-xs text-danger">{error}</p>}

        <button type="submit" disabled={isSaving} className="btn-primary mt-2">
          {isSaving ? "Zapisuję…" : "Zmień hasło"}
        </button>
      </form>
    </main>
  );
}
