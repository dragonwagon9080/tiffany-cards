export default function Loading() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 text-center text-white">
        Loading RPA Tracker...
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
          >
            <div className="h-72 bg-black" />

            <div className="space-y-3 p-4">
              <div className="h-5 rounded bg-zinc-700" />
              <div className="h-4 w-2/3 rounded bg-zinc-700" />
              <div className="h-4 w-1/2 rounded bg-zinc-700" />
              <div className="h-10 rounded bg-zinc-700" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}