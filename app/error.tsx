"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Swap for real error reporting (Sentry, etc.) — logging here at minimum
    // keeps failures from disappearing silently in production.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-sm text-ogien">Coś się posypało</p>
      <h1 className="mt-2 text-xl font-semibold text-zinc-50">Wystąpił błąd</h1>
      <p className="mt-2 text-sm text-zinc-500">
        To nie Twoja wina. Spróbuj jeszcze raz — jeśli się powtarza, daj nam znać.
      </p>
      <button onClick={reset} className="btn-primary mt-6">
        Spróbuj ponownie
      </button>
    </main>
  );
}
