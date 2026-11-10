"use client";

import { Disc3, Smile, Activity } from "lucide-react";

// Spotify-style "Browse all": colour tiles with the title top-left and a
// tilted artwork block bottom-right. Clicking runs a search in place (no page
// reload, so music keeps playing).
const SECTIONS = [
  {
    title: "Genres",
    icon: Disc3,
    items: [
      ["Pop", "#e13300", "pop"],
      ["Hip-Hop", "#ba5d07", "hip hop"],
      ["Rock", "#e91429", "rock"],
      ["Electronic", "#0d73ec", "electronic"],
      ["R&B", "#dc148c", "rnb"],
      ["Jazz", "#477d95", "jazz"],
      ["Classical", "#7d4b32", "classical"],
      ["Country", "#d84000", "country"],
      ["Latin", "#e1118b", "latin"],
      ["Indie", "#608108", "indie"],
      ["Metal", "#535353", "metal"],
      ["Reggae", "#148a08", "reggae"],
      ["Blues", "#1e3264", "blues"],
      ["Soul", "#b06239", "soul"],
      ["Funk", "#8d67ab", "funk"],
      ["Disco", "#af2896", "disco"],
      ["Bollywood", "#e8115b", "bollywood"],
      ["Punjabi", "#27856a", "punjabi"],
    ],
  },
  {
    title: "Moods",
    icon: Smile,
    items: [
      ["Chill", "#509bf5", "chill"],
      ["Happy", "#e1a03a", "happy"],
      ["Sad", "#2d46b9", "sad"],
      ["Energetic", "#e61e32", "energetic"],
      ["Romantic", "#d84a7b", "romantic"],
      ["Focus", "#503750", "focus"],
      ["Party", "#8c1932", "party"],
      ["Workout", "#777777", "workout"],
    ],
  },
  {
    title: "Activities",
    icon: Activity,
    items: [
      ["Study", "#5179a1", "study"],
      ["Sleep", "#1e3264", "sleep"],
      ["Driving", "#a56752", "driving"],
      ["Cooking", "#ba5d07", "cooking"],
      ["Gaming", "#e8115b", "gaming"],
      ["Travel", "#0d73ec", "travel"],
      ["Meditation", "#477d95", "meditation"],
      ["Running", "#148a08", "running"],
    ],
  },
];

function Tile({ name, color, query, Icon }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("tt-search", { detail: { q: query } }))}
      className="group relative aspect-[16/10] sm:aspect-[5/3] overflow-hidden rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-[0.98] transition-transform"
      style={{ backgroundColor: color }}
    >
      <span className="absolute left-3 top-3 right-12 text-white font-bold text-lg sm:text-xl leading-tight break-words">
        {name}
      </span>
      <span
        aria-hidden="true"
        className="absolute -right-3 -bottom-2 w-[42%] aspect-square rounded-md rotate-[25deg] shadow-[0_6px_16px_rgba(0,0,0,0.4)] flex items-center justify-center transition-transform duration-300 group-hover:rotate-[20deg] group-hover:scale-105"
        style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${color} 55%, #fff), color-mix(in srgb, ${color} 70%, #000))` }}
      >
        <Icon className="w-1/2 h-1/2 text-white/85 -rotate-[25deg]" />
      </span>
    </button>
  );
}

export default function BrowseView() {
  return (
    <div className="px-4 sm:px-6 pt-4 pb-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-5 sm:mb-6">Browse all</h1>
      {SECTIONS.map(({ title, icon: Icon, items }) => (
        <section key={title} className="mb-8 sm:mb-10" aria-label={title}>
          <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">{title}</h2>
          <div className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
            {items.map(([name, color, query]) => (
              <Tile key={name} name={name} color={color} query={query} Icon={Icon} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
