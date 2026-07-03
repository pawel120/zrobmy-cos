export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex flex-col gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 w-2/3 bg-zinc-800" />
            <div className="mt-2 h-3 w-full bg-zinc-900" />
            <div className="mt-1 h-3 w-4/5 bg-zinc-900" />
          </div>
        ))}
      </div>
    </main>
  );
}
