"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

type Mode = "password" | "magic-link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/projekty";
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "Zły e-mail lub hasło."
          : "Nie udało się zalogować. Spróbuj ponownie."
      );
      setIsLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (otpError) {
      setError("Nie udało się wysłać linku. Sprawdź adres e-mail.");
      setIsLoading(false);
      return;
    }

    setMagicLinkSent(true);
    setIsLoading(false);
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-xl font-semibold text-stone-50">Wejdź do gry</h1>
      <p className="mb-6 text-sm text-stone-500">Zaloguj się i zobacz, co się kroi.</p>

      <GoogleSignInButton />

      <div className="my-6 flex items-center gap-3 text-xs text-stone-600">
        <span className="hairline h-px flex-1" />
        albo
        <span className="hairline h-px flex-1" />
      </div>

      <div className="hairline mb-6 flex gap-4 pb-3 text-sm">
        <button
          onClick={() => setMode("password")}
          className={mode === "password" ? "text-ogien" : "text-stone-500 hover:text-stone-300"}
        >
          Hasło
        </button>
        <button
          onClick={() => setMode("magic-link")}
          className={mode === "magic-link" ? "text-ogien" : "text-stone-500 hover:text-stone-300"}
        >
          Magic link
        </button>
      </div>

      {magicLinkSent ? (
        <p className="text-sm text-stone-300">
          Wysłaliśmy link na <span className="text-stone-50">{email}</span>. Sprawdź skrzynkę.
        </p>
      ) : (
        <form onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink} className="flex flex-col gap-3">
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

          {mode === "password" && (
            <label className="flex flex-col gap-1 text-xs text-stone-500">
              Hasło
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ogien"
                placeholder="••••••••"
              />
              <Link href="/forgot-password" className="mt-1 self-end text-xs text-stone-500 hover:text-ogien">
                Zapomniałeś hasła?
              </Link>
            </label>
          )}

          {error && <p className="text-xs text-danger">{error}</p>}

          <button type="submit" disabled={isLoading} className="btn-primary mt-2">
            {isLoading ? "Chwila…" : mode === "password" ? "Zaloguj się" : "Wyślij magic link"}
          </button>
        </form>
      )}

      <p className="mt-8 text-sm text-stone-500">
        Nie masz konta?{" "}
        <Link href="/signup" className="text-stone-100 underline hover:text-ogien">
          Zrób sobie jedno
        </Link>
      </p>
    </main>
  );
}
