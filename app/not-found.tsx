import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-sm text-ogien">404</p>
      <h1 className="mt-2 text-xl font-semibold text-stone-50">Nic tu nie ma</h1>
      <p className="mt-2 text-sm text-stone-500">
        Strona, projekt albo profil, którego szukasz, nie istnieje — albo zniknął.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Wróć na start
      </Link>
    </main>
  );
}
