'use client'

import { useMemo } from "react";
import { Play } from "lucide-react";
import { resolveCover, coverError } from "../lib/coverPlaceholder";

function coverOf(song) {
  return resolveCover(
    song?.album?.cover_medium ||
      song?.album?.cover_big ||
      song?.album?.cover_small,
    song?.title || song?.id
  );
}

/**
 * Build compact "shortcut" collections (Spotify top-of-home style) from songs.
 * Each tile = square art + a short bold title.
 */
function buildCollections(songs) {
  if (!songs?.length) return [];

  const byArtist = new Map();
  for (const s of songs) {
    const name = s.artist?.name;
    if (!name) continue;
    if (!byArtist.has(name)) byArtist.set(name, []);
    byArtist.get(name).push(s);
  }
  const artistGroups = [...byArtist.entries()]
    .map(([name, arr]) => ({ name, songs: arr }))
    .sort((a, b) => b.songs.length - a.songs.length);

  const tiles = [];

  const themed = [
    { title: 'On Repeat', slice: [0, 20] },
    { title: 'Trending Now', slice: [0, 15] },
    { title: 'Mood Mix', slice: [4, 24] },
    { title: 'Chill Vibes', slice: [8, 28] },
  ];
  themed.forEach((d, i) => {
    const sel = songs.slice(d.slice[0], d.slice[1]);
    if (!sel.length) return;
    tiles.push({ id: 'feat-' + i, title: d.title, cover: coverOf(sel[0]), songs: sel });
  });

  // Fill the rest of the row with per-artist shortcuts.
  artistGroups.slice(0, 4).forEach((g, i) => {
    tiles.push({
      id: 'art-' + i,
      title: `This is ${g.name}`,
      cover: coverOf(g.songs[0]),
      songs: g.songs,
    });
  });

  return tiles;
}

export default function FeaturedCards({ songs, onPlay, onQueue, onOpenCollection }) {
  const tiles = useMemo(() => buildCollections(songs), [songs]);

  const playCollection = (col) => {
    if (!col?.songs?.length) return;
    // Play the mix with its songs as the context so Next/Prev walk it.
    onPlay(col.songs[0], col.songs);
  };

  if (!tiles.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 px-3 sm:px-4">
      {tiles.map((tile) => (
        <div
          key={tile.id}
          onClick={() => onOpenCollection?.(tile)}
          className="group relative flex items-center gap-2.5 sm:gap-3 md:gap-4 rounded-md sm:rounded-lg bg-[#181818] hover:bg-[#282828] overflow-hidden cursor-pointer transition-colors duration-200 h-12 sm:h-14 md:h-16 animate-fade-up touch-manipulation"
        >
          <img referrerPolicy="no-referrer"
            src={tile.cover}
            alt={tile.title}
            onError={coverError(tile.title)}
            className="h-full aspect-square object-cover flex-shrink-0"
          />
          <span className="flex-1 min-w-0 pr-12 sm:pr-14 text-white font-bold text-xs sm:text-sm md:text-base leading-tight line-clamp-2">
            {tile.title}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); playCollection(tile); }}
            aria-label={`Play ${tile.title}`}
            className="absolute right-2 sm:right-3 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-green-500 hover:bg-green-400 hover:scale-105 active:scale-95 rounded-full flex items-center justify-center shadow-xl shadow-green-500/30 opacity-100 md:opacity-0 translate-y-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-200 touch-manipulation"
          >
            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-black text-black ml-0.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
