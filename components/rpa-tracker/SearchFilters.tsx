"use client";

import { FilterOptions, TrackerTheme } from "./types";

type Props = {
  theme: TrackerTheme;

  sport: string;
  setSport: (value: string) => void;

  player: string;
  setPlayer: (value: string) => void;

  year: string;
  setYear: (value: string) => void;

  brand: string;
  setBrand: (value: string) => void;

  variation: string;
  setVariation: (value: string) => void;

  sort: string;
  setSort: (value: string) => void;

  options: FilterOptions;

  onReset: () => void;
};

export default function SearchFilters({
  theme,
  sport,
  setSport,
  player,
  setPlayer,
  year,
  setYear,
  brand,
  setBrand,
  variation,
  setVariation,
  sort,
  setSort,
  options,
  onReset,
}: Props) {
  const filterBg = theme.filter_bg_color || "#1d4ed8";
  const filterHover = theme.filter_hover_color || "#1e40af";
  const filterBorder = theme.filter_border_color || "#60a5fa";
  const filterText = theme.filter_text_color || "#ffffff";

  const resetBg = theme.reset_bg_color || "#9c7a2d";
  const resetHover = theme.reset_hover_color || "#dc2626";
  const resetBorder = theme.reset_border_color || "#d4af37";
  const resetText = theme.reset_text_color || "#ffffff";

  const controlStyle = {
    backgroundColor: filterBg,
    borderColor: filterBorder,
    color: filterText,
  };

  const controlClass =
    "h-9 w-36 rounded border px-2 text-center text-sm font-bold outline-none transition focus:ring-2 focus:ring-blue-400";

  function hoverIn(e: React.MouseEvent<HTMLSelectElement>) {
    e.currentTarget.style.backgroundColor = filterHover;
  }

  function hoverOut(e: React.MouseEvent<HTMLSelectElement>) {
    e.currentTarget.style.backgroundColor = filterBg;
  }

  return (
    <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
      <select
        value={sport}
        onChange={(e) => setSport(e.target.value)}
        className={controlClass}
        style={controlStyle}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
      >
        <option value="">Sport</option>
        {options.sports.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>

      <select
        value={player}
        onChange={(e) => setPlayer(e.target.value)}
        className={controlClass}
        style={controlStyle}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
      >
        <option value="">Player</option>
        {options.players.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>

      <select
        value={year}
        onChange={(e) => setYear(e.target.value)}
        className={controlClass}
        style={controlStyle}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
      >
        <option value="">Year</option>
        {options.years.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>

      <select
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
        className={controlClass}
        style={controlStyle}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
      >
        <option value="">Brand</option>
        {options.brands.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>

      <select
        value={variation}
        onChange={(e) => setVariation(e.target.value)}
        className={controlClass}
        style={controlStyle}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
      >
        <option value="">Variation</option>
        {options.variations.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>

      <select
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        className={controlClass}
        style={controlStyle}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
      >
        <option value="">Sort</option>
        <option value="yearNewest">Newest</option>
        <option value="yearOldest">Oldest</option>
        <option value="playerAZ">Player A-Z</option>
        <option value="playerZA">Player Z-A</option>
        <option value="mostTracked">Most Tracked</option>
        <option value="leastTracked">Least Tracked</option>
      </select>

      <button
        onClick={onReset}
        className="h-9 w-36 rounded border px-4 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-red-500"
        style={{
          backgroundColor: resetBg,
          borderColor: resetBorder,
          color: resetText,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = resetHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = resetBg;
        }}
      >
        Reset
      </button>
    </div>
  );
}