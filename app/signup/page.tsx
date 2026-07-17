"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password.length < 8) {
      setError("Hasło musi mieć co najmniej 8 znaków.");
      setIsLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: username },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(
        signUpError.message.includes("already registered")
          ? "Ten e-mail już istnieje. Zaloguj się."
          : "Nie udało się założyć konta. Spróbuj ponownie."
      );
      setIsLoading(false);
      return;
    }

    // If email confirmation is required, Supabase returns a user with no
    // active session — send them to check their inbox instead of redirecting.
    if (data.session) {
      router.push("/projekty");
      router.refresh();
    } else {
      setCheckEmail(true);
      setIsLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col justify-center px-4">
        <h1 className="mb-2 text-xl font-semibold text-stone-50">Prawie gotowe</h1>
        <p className="text-sm text-stone-400">
          Wysłaliśmy link potwierdzający na <span className="text-stone-50">{email}</span>. Kliknij go, żeby
          odpalić konto.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-xl font-semibold text-stone-50">BuildTogether</h1>
      <p className="mb-6 text-sm text-stone-500">Załóż konto i znajdź ekipę.</p>

      <GoogleSignInButton />

      <div className="my-6 flex items-center gap-3 text-xs text-stone-600">
        <span className="hairline h-px flex-1" />
        albo
        <span className="hairline h-px flex-1" />
      </div>

      <form onSubmit={handleSignup} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Nazwa użytkownika
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            className="input"
            placeholder="mikolaj_koduje"
            minLength={3}
            maxLength={24}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          E-mail
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="ty@email.com"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Hasło
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="min. 8 znaków"
            minLength={8}
          />
        </label>

        {error && <p className="text-xs text-danger">{error}</p>}

        <button type="submit" disabled={isLoading} className="btn-primary mt-2">
          {isLoading ? "Chwila…" : "Załóż konto"}
        </button>
      </form>

      <p className="mt-8 text-sm text-stone-500">
        Masz już konto?{" "}
        <Link href="/login" className="text-stone-100 underline hover:text-ogien">
          Zaloguj się
        </Link>
      </p>
    </main>
  );
}
