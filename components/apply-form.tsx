"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

// Hero gate on the landing page: the application IS the filter. One artifact
// URL, one sentence, one e-mail — reviewed by a human within 48h.
export function ApplyForm() {
  const [artifactUrl, setArtifactUrl] = useState("");
  const [pitch, setPitch] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — hidden from humans
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artifactUrl, pitch, email, website }),
    }).catch(() => null);

    if (!res) {
      setError("Brak połączenia. Spróbuj ponownie.");
      setIsLoading(false);
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Nie udało się wysłać aplikacji. Spróbuj ponownie.");
      setIsLoading(false);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="card mx-auto max-w-md text-left">
        <p className="font-display text-sm font-semibold text-stone-50">Aplikacja wysłana.</p>
        <p className="mt-1 text-sm leading-relaxed text-stone-400">
          Człowiek — nie algorytm — patrzy na twoją robotę. Odpowiedź w 48 godzin na{" "}
          <span className="text-stone-200">{email.trim()}</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-3 text-left">
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <label className="flex flex-col gap-1 text-xs text-stone-500">
        Link do czegoś, co zrobiłeś
        <input
          required
          value={artifactUrl}
          onChange={(e) => setArtifactUrl(e.target.value)}
          className="input"
          placeholder="https://… (deploy, repo, produkt — coś, co istnieje)"
          maxLength={500}
          inputMode="url"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-stone-500">
        Co to robi — jedno zdanie
        <input
          required
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          className="input"
          placeholder="Aplikacja do…"
          minLength={3}
          maxLength={280}
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
          maxLength={254}
        />
      </label>

      {error && <p className="text-xs text-danger">{error}</p>}

      <button type="submit" disabled={isLoading} className="btn-primary mt-1">
        {isLoading ? "Chwila…" : "Aplikuj o dostęp"}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>

      <p className="text-center text-xs text-stone-600">
        Review robi człowiek. Odpowiedź w 48 h — przyjęcie albo jedno zdanie dlaczego nie.
      </p>
    </form>
  );
}
