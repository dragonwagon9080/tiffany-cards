"use client";

type Props = {
  searchDraft: string;
  setSearchDraft: (value: string) => void;
  onSearch: () => void;

  variation: string;
  setVariation: (value: string) => void;

  sortMode: string;
  setSortMode: (value: string) => void;

  variations: any[];
  registryTitle: string;

  onReset: () => void;
};

export default function GroupFilters({
  searchDraft,
  setSearchDraft,
  onSearch,
  variation,
  setVariation,
  sortMode,
  setSortMode,
  variations,
  registryTitle,
}: Props) {
  return (
    <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-3 text-center text-sm font-black uppercase tracking-widest text-blue-400">
        Registry Search
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
        className="grid gap-3 md:grid-cols-[minmax(0,1fr)_90px_190px_190px]"
      >
        <input
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder={`Search ${registryTitle}...`}
          className="h-11 rounded border border-blue-700 bg-black px-4 text-sm font-bold text-white outline-none transition placeholder:text-zinc-400 focus:border-blue-400"
        />

        <button
          type="submit"
          className="h-11 whitespace-nowrap rounded border border-blue-500 bg-blue-700 px-4 text-sm font-black uppercase text-white transition hover:bg-blue-600"
        >
          Search
        </button>

        <select
          value={variation}
          onChange={(e) => setVariation(e.target.value)}
          className="h-11 rounded border border-blue-700 bg-black px-3 text-sm font-bold text-white outline-none transition focus:border-blue-400"
        >
          <option value="">All Variations</option>

          {variations.map((item) => (
            <option key={item.name} value={item.name}>
              {item.label || item.name}
            </option>
          ))}
        </select>

        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value)}
          className="h-11 rounded border border-blue-700 bg-black px-3 text-sm font-bold text-white outline-none transition focus:border-blue-400"
        >
          <option value="serial">View: Serial Number</option>
          <option value="variation">View: Variation</option>
          <option value="grade">View: Highest Grade</option>
          <option value="recent">View: Recently Added</option>
          <option value="lowestSerial">View: Lowest Serial</option>
        </select>
      </form>
    </section>
  );
}