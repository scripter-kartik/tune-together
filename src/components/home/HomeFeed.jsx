"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Check, MoreHorizontal, Music4, PlusCircle, Shuffle } from "lucide-react";
import Shelf from "./Shelf";
import { MediaCard, MixOverlay, PlayButton, ShortcutTile } from "./Cards";
import SongMenu from "./SongMenu";
import SongDetailsModal from "../SongDetailsModal";
import { resolveCover } from "@/lib/coverPlaceholder";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "songs", label: "Songs" },
  { id: "mixes", label: "Mixes" },
  { id: "artists", label: "Artists" },
  { id: "albums", label: "Albums" },
];

const MIX_TINTS = ["#1e3264", "#8d67ab", "#e8115b", "#148a08", "#e1a03a", "#509bf5", "#af2896", "#ba5d07"];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const coverOf = (song) =>
  resolveCover(song?.album?.cover_big || song?.album?.cover_xl || song?.album?.cover_medium || song?.album?.cover_small);

const dedupeById = (arr = []) => {
  const seen = new Set();
  return arr.filter((x) => x && x.id != null && !seen.has(String(x.id)) && seen.add(String(x.id)));
};

// Stable colour per title, for the header wash and mix artwork.
function tintFor(key = "") {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 48% 34%)`;
}

const artistLine = (songs = [], max = 3) => {
  const names = [...new Set(songs.map((s) => s.artist?.name).filter(Boolean))];
  if (!names.length) return `${songs.length} songs`;
  return names.length > max ? `${names.slice(0, max).join(", ")} and more` : names.join(", ");
};

// Mood mixes + "This is <artist>" built from the feed's songs.
function buildCollections(songs) {
  if (!songs?.length) return [];
  const themed = [
    { title: "On Repeat", from: 0, to: 20 },
    { title: "Trending Now", from: 20, to: 40 },
    { title: "Mood Mix", from: 4, to: 24 },
    { title: "Chill Vibes", from: 8, to: 28 },
  ];
  const out = [];
  themed.forEach((t, i) => {
    const sel = songs.slice(t.from, t.to);
    if (sel.length >= 4) out.push({ id: `mood-${i}`, title: t.title, cover: coverOf(sel[0]), songs: sel });
  });
  const byArtist = new Map();
  for (const s of songs) {
    const n = s.artist?.name;
    if (!n) continue;
    if (!byArtist.has(n)) byArtist.set(n, []);
    byArtist.get(n).push(s);
  }
  [...byArtist.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6)
    .forEach(([name, arr], i) => {
      out.push({ id: `this-is-${i}`, title: `This is ${name}`, cover: coverOf(arr[0]), songs: arr });
    });
  return out;
}

function scrollParentOf(el) {
  return el?.closest(".overflow-y-auto") || null;
}

export default function HomeFeed({
  songs = [],
  artists = [],
  albums = [],
  topArtists = [],
  historySongs = [],
  recommendations = [],
  recentHistory = [],
  mixes = [],
  onPlay,
  onQueue,
  currentSongId,
  isPlaying,
  onOpenArtist,
  onOpenAlbum,
  onOpenCollection,
  isLoading,
}) {
  const { user } = useUser();
  const rootRef = useRef(null);
  const sentinelRef = useRef(null);
  const [filter, setFilter] = useState("all");
  const [openSection, setOpenSection] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [hoverTint, setHoverTint] = useState(null);
  const [menu, setMenu] = useState(null);
  const [details, setDetails] = useState(null);
  const [addedKey, setAddedKey] = useState(null);
  // What the last card-level play started, so album/artist cards can show
  // "playing" and toggle pause instead of restarting.
  const [playCtx, setPlayCtx] = useState({ key: null, ids: new Set() });
  const [busyKey, setBusyKey] = useState(null);

  // ---------- data ----------
  const data = useMemo(() => {
    const recent = dedupeById(recentHistory);
    const collections = buildCollections(songs);
    const freshPicks = songs.slice(0, 30);
    const moreSongs = songs.slice(30);

    const normArtist = (a, subtitle) => ({
      id: a.id,
      name: a.name,
      image: resolveCover(a.image || a.picture_medium || a.picture_xl || a.picture_small, a.name),
      subtitle,
    });
    const top = topArtists
      .filter((a) => a?.name)
      .map((a) => normArtist(a, a.count ? `Artist · ${a.count} play${a.count === 1 ? "" : "s"}` : "Artist"));
    const popular = dedupeById(artists).map((a) => normArtist(a, "Artist"));

    // Shortcut grid: what you played last, then mixes/collections to fill 8.
    const shortcuts = [
      ...recent.slice(0, 4).map((s) => ({ kind: "song", key: `s-${s.id}`, item: s, list: recent })),
      ...mixes.map((m) => ({ kind: "mix", key: `m-${m.id || m.title}`, item: m })),
      ...collections.map((c) => ({ kind: "mix", key: `c-${c.id}`, item: c })),
    ].slice(0, 8);

    return {
      shortcuts,
      sections: [
        { key: "recent", kind: "song", title: "Recently played", items: recent, filters: ["all", "songs"] },
        { key: "mixes", kind: "mix", title: "Made for you", eyebrow: "Mixed from your top artists", items: mixes, filters: ["all", "mixes"] },
        { key: "recommended", kind: "song", title: "Recommended for you", eyebrow: "Picked from the artists you love", items: dedupeById(recommendations), filters: ["all", "songs"] },
        { key: "top-artists", kind: "artist", title: "Your top artists", items: top, filters: ["all", "artists"] },
        { key: "fresh", kind: "song", title: "Fresh picks for you", eyebrow: "A blend across the moods you love", items: freshPicks, filters: ["all", "songs"] },
        { key: "moods", kind: "mix", title: "Mixes for every mood", items: collections, filters: ["all", "mixes"] },
        { key: "artists", kind: "artist", title: "Popular artists", items: popular, filters: ["all", "artists"] },
        { key: "albums", kind: "album", title: "Popular albums", items: dedupeById(albums), filters: ["all", "albums"] },
        { key: "history", kind: "song", title: "Because you've been listening", eyebrow: "More from the artists you keep coming back to", items: dedupeById(historySongs), filters: ["all", "songs"] },
        { key: "more", kind: "song", title: "More to explore", items: moreSongs, filters: ["all", "songs"] },
      ],
    };
  }, [songs, artists, albums, topArtists, historySongs, recommendations, recentHistory, mixes]);

  // ---------- header behaviour ----------
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), {
      root: scrollParentOf(el),
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [openSection, isLoading]);

  // Header/sidebar Home: back to the "All" feed from a "Show all" page or filter.
  useEffect(() => {
    const goHome = () => {
      setOpenSection(null);
      setFilter("all");
      setMenu(null);
      setDetails(null);
      setHoverTint(null);
    };
    window.addEventListener("tt-go-home", goHome);
    return () => window.removeEventListener("tt-go-home", goHome);
  }, []);

    const goTo = (section) => {
    setOpenSection(section);
    setMenu(null);
    scrollParentOf(rootRef.current)?.scrollTo({ top: 0 });
  };

  const pickFilter = (id) => {
    setFilter((cur) => (cur === id ? "all" : id));
    setOpenSection(null);
    scrollParentOf(rootRef.current)?.scrollTo({ top: 0 });
  };

  // ---------- playback ----------
  const togglePlayback = () =>
    window.dispatchEvent(new CustomEvent("tt-player-command", { detail: { action: isPlaying ? "pause" : "play" } }));

  const startList = (key, list, first = list[0]) => {
    if (!list?.length || !first) return;
    setPlayCtx({ key, ids: new Set(list.map((s) => String(s.id))) });
    onPlay(first, list);
  };

  // A collection counts as "playing" only if it was started from its own card
  // (mixes overlap, so membership alone would light up several at once).
  const isCtxCurrent = (key) =>
    currentSongId != null && playCtx.key === key && playCtx.ids.has(String(currentSongId));

  const playSong = (song, list) => {
    if (String(song.id) === String(currentSongId)) togglePlayback();
    else onPlay(song, list);
  };

  const playCollection = (key, songsInIt) => {
    if (isCtxCurrent(key, songsInIt)) togglePlayback();
    else startList(key, songsInIt);
  };

  // Albums/artists don't carry their tracks; fetch them on first play.
  const playRemote = async (key, url, pick) => {
    if (playCtx.key === key && currentSongId != null && playCtx.ids.has(String(currentSongId))) {
      togglePlayback();
      return;
    }
    setBusyKey(key);
    try {
      const res = await fetch(url);
      const json = res.ok ? await res.json() : null;
      const tracks = json ? pick(json) : [];
      if (tracks?.length) startList(key, tracks);
    } catch {
      /* leave as is; the card simply doesn't start */
    } finally {
      setBusyKey((k) => (k === key ? null : k));
    }
  };

  const queueSong = (song) => {
    onQueue(song);
    const key = String(song.id);
    setAddedKey(key);
    setTimeout(() => setAddedKey((k) => (k === key ? null : k)), 1400);
  };

  const openMenuAt = (x, y, song) =>
    setMenu({
      song,
      x: Math.max(8, Math.min(x, window.innerWidth - 220)),
      y: Math.max(8, Math.min(y, window.innerHeight - 300)),
    });

  // ---------- cards ----------
  const renderCard = (kind, item, list) => {
    if (kind === "song") {
      const active = currentSongId != null && String(item.id) === String(currentSongId);
      const added = addedKey === String(item.id);
      return (
        <MediaCard
          key={item._uniqueKey || `${item.id}-${item.title}`}
          image={coverOf(item)}
          title={item.title}
          subtitle={item.artist?.name || "Unknown artist"}
          active={active}
          playing={active && isPlaying}
          onOpen={() => setDetails({ song: item, list })}
          onDoubleClick={() => playSong(item, list)}
          onPlay={() => playSong(item, list)}
          onContextMenu={(e) => {
            e.preventDefault();
            openMenuAt(e.clientX, e.clientY, item);
          }}
          coverActions={
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  queueSong(item);
                }}
                aria-label={added ? `${item.title} added to queue` : `Add ${item.title} to queue`}
                title={added ? "Added to queue" : "Add to queue"}
                className={`w-8 h-8 rounded-full flex items-center justify-center bg-black/65 backdrop-blur-sm shadow-lg transition hover:scale-105 hover:bg-black/80 ${
                  added ? "text-green-400" : "tt-reveal text-white"
                }`}
              >
                {added ? <Check className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const r = e.currentTarget.getBoundingClientRect();
                  openMenuAt(r.right - 200, r.bottom + 4, item);
                }}
                aria-label={`More options for ${item.title}`}
                title="More options"
                className="tt-reveal w-8 h-8 rounded-full flex items-center justify-center bg-black/65 backdrop-blur-sm shadow-lg text-white transition hover:scale-105 hover:bg-black/80"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </>
          }
          actions={
            // Touch screens have no hover: keep a slim "more" button by the title.
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                openMenuAt(r.right - 200, r.bottom + 4, item);
              }}
              aria-label={`More options for ${item.title}`}
              className="flex-shrink-0 w-7 h-7 -mt-0.5 -mr-1 rounded-full flex items-center justify-center text-neutral-400 active:text-white [@media(hover:hover)]:hidden"
            >
              <MoreHorizontal className="w-[18px] h-[18px]" />
            </button>
          }
        />
      );
    }

    if (kind === "mix") {
      const key = `mix-${item.id || item.title}`;
      const active = isCtxCurrent(key, item.songs);
      const isDaily = !!item.subtitle || item.id?.toString().startsWith("mix");
      return (
        <MediaCard
          key={key}
          image={resolveCover(item.cover, item.title)}
          title={item.title}
          subtitle={item.subtitle ? `${item.subtitle} and more` : artistLine(item.songs)}
          active={active}
          playing={active && isPlaying}
          onOpen={() => onOpenCollection?.(item)}
          onPlay={item.songs?.length ? () => playCollection(key, item.songs) : undefined}
          overlay={isDaily ? <MixOverlay title={item.title} tint={MIX_TINTS[Math.abs(item.title?.length || 0) % MIX_TINTS.length]} /> : null}
        />
      );
    }

    if (kind === "artist") {
      const key = `artist-${item.id || item.name}`;
      const active = playCtx.key === key && currentSongId != null && playCtx.ids.has(String(currentSongId));
      return (
        <MediaCard
          key={key}
          round
          image={item.image}
          title={item.name}
          subtitle={item.subtitle}
          active={active}
          playing={active && isPlaying}
          busy={busyKey === key}
          onOpen={item.id ? () => onOpenArtist?.(item.id) : undefined}
          onPlay={
            item.id
              ? () => playRemote(key, `/api/artist?id=${encodeURIComponent(item.id)}`, (d) => d.topSongs || [])
              : undefined
          }
        />
      );
    }

    // album
    const key = `album-${item.id}`;
    const active = playCtx.key === key && currentSongId != null && playCtx.ids.has(String(currentSongId));
    return (
      <MediaCard
        key={key}
        image={resolveCover(item.cover_big || item.cover_medium || item.cover_small)}
        title={item.title}
        subtitle={item.artist?.name ? `Album · ${item.artist.name}` : "Album"}
        active={active}
        playing={active && isPlaying}
        busy={busyKey === key}
        onOpen={item.id ? () => onOpenAlbum?.(item.id) : undefined}
        onPlay={
          item.id
            ? () => playRemote(key, `/api/album?id=${encodeURIComponent(item.id)}`, (d) => d.songs || [])
            : undefined
        }
      />
    );
  };

  const renderShortcut = ({ kind, key, item, list }) => {
    if (kind === "song") {
      const active = currentSongId != null && String(item.id) === String(currentSongId);
      return (
        <ShortcutTile
          key={key}
          image={coverOf(item)}
          title={item.title}
          active={active}
          playing={active && isPlaying}
          onHover={() => setHoverTint(tintFor(item.title))}
          onOpen={() => playSong(item, list)}
          onPlay={() => playSong(item, list)}
        />
      );
    }
    const ctxKey = `mix-${item.id || item.title}`;
    const active = isCtxCurrent(ctxKey, item.songs);
    return (
      <ShortcutTile
        key={key}
        image={resolveCover(item.cover, item.title)}
        title={item.title}
        active={active}
        playing={active && isPlaying}
        onHover={() => setHoverTint(tintFor(item.title))}
        onOpen={() => onOpenCollection?.(item)}
        onPlay={item.songs?.length ? () => playCollection(ctxKey, item.songs) : undefined}
      />
    );
  };

  // ---------- layout pieces ----------
  const defaultTint = "color-mix(in srgb, var(--tt-accent) 26%, #181818)";
  const tint = hoverTint || defaultTint;

  const wash = (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[320px] -z-10">
      <div className="absolute inset-0 transition-[background-color] duration-700 ease-out" style={{ backgroundColor: tint }} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#121212]" />
    </div>
  );

  const stickyBar = (children) => (
    <div
      className="sticky top-0 z-30 px-3 sm:px-5 py-2.5 sm:py-3 transition-[background-color,box-shadow] duration-300"
      style={{
        backgroundColor: scrolled ? `color-mix(in srgb, ${tint} 45%, #121212)` : "transparent",
        boxShadow: scrolled ? "0 6px 16px rgba(0,0,0,0.35)" : "none",
      }}
    >
      {children}
    </div>
  );

  const overlays = (
    <>
      {menu && (
        <SongMenu
          song={menu.song}
          position={{ x: menu.x, y: menu.y }}
          onClose={() => setMenu(null)}
          onPlay={(s) => onPlay(s, [s])}
          onQueue={queueSong}
          onOpenArtist={onOpenArtist}
        />
      )}
      {details && (
        <SongDetailsModal
          song={details.song}
          onClose={() => setDetails(null)}
          onPlay={(s) => onPlay(s, details.list || [s])}
          onQueue={onQueue}
          onOpenArtist={onOpenArtist}
        />
      )}
    </>
  );

  // ---------- loading / empty ----------
  if (isLoading) {
    return (
      <div className="relative isolate px-3 sm:px-5 pt-3 pb-10" aria-busy="true" aria-label="Loading your feed">
        {wash}
        <div className="flex gap-2 mb-6">
          {FILTERS.map((f) => (
            <div key={f.id} className="h-8 w-16 rounded-full bg-white/[0.07] animate-pulse" />
          ))}
        </div>
        <div className="tt-shortcuts mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 sm:h-14 lg:h-16 rounded-[4px] bg-white/[0.07] animate-pulse" />
          ))}
        </div>
        {[0, 1].map((row) => (
          <div key={row} className="mb-8">
            <div className="h-6 w-48 rounded bg-white/[0.07] animate-pulse mb-3 mx-2 sm:mx-3" />
            <div className="tt-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`p-2 sm:p-3 ${i > 1 ? "hidden sm:block" : ""}`}>
                  <div className="aspect-square rounded-md bg-white/[0.06] animate-pulse" />
                  <div className="h-3 w-3/4 rounded bg-white/[0.06] animate-pulse mt-3" />
                  <div className="h-3 w-1/2 rounded bg-white/[0.04] animate-pulse mt-2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!songs.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-white/[0.06] flex items-center justify-center">
          <Music4 className="w-7 h-7 text-neutral-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Nothing here yet</h2>
        <p className="text-neutral-400 text-sm max-w-xs">Search for a song, artist or mood to fill your home.</p>
      </div>
    );
  }

  // ---------- "Show all" page ----------
  if (openSection) {
    const sec = data.sections.find((s) => s.key === openSection);
    if (sec) {
      const isSongs = sec.kind === "song";
      const playAllKey = `section-${sec.key}`;
      const allActive = isSongs && isCtxCurrent(playAllKey);
      return (
        <>
        <div ref={rootRef} className="relative isolate min-h-full pb-10">
          {wash}
          <div ref={sentinelRef} className="h-px" />
          {stickyBar(
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => goTo(null)}
                aria-label="Back to Home"
                title="Back"
                className="w-8 h-8 flex-shrink-0 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition"
              >
                <ArrowLeft className="w-[18px] h-[18px]" />
              </button>
              <p className={`font-bold text-white truncate transition-opacity duration-200 ${scrolled ? "opacity-100" : "opacity-0"}`}>
                {sec.title}
              </p>
            </div>
          )}
          <div className="px-3 sm:px-5">
            <div className="flex items-end justify-between gap-4 px-2 sm:px-3 pt-2 pb-4 sm:pb-6">
              <div className="min-w-0">
                {sec.eyebrow && <p className="text-xs sm:text-sm font-semibold text-neutral-300 mb-1">{sec.eyebrow}</p>}
                <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">{sec.title}</h1>
                <p className="text-sm text-neutral-400 mt-2">{sec.items.length} {sec.kind === "song" ? "songs" : sec.kind === "artist" ? "artists" : sec.kind === "album" ? "albums" : "mixes"}</p>
              </div>
              {isSongs && sec.items.length > 0 && (
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const shuffled = [...sec.items].sort(() => Math.random() - 0.5);
                      startList(playAllKey, shuffled);
                    }}
                    aria-label={`Shuffle ${sec.title}`}
                    title="Shuffle"
                    className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-300 hover:text-white hover:scale-105 transition"
                  >
                    <Shuffle className="w-5 h-5" />
                  </button>
                  <PlayButton
                    visible
                    playing={allActive && isPlaying}
                    label={allActive && isPlaying ? `Pause ${sec.title}` : `Play ${sec.title}`}
                    onClick={() => (allActive ? togglePlayback() : startList(playAllKey, sec.items))}
                    className="!w-12 !h-12 sm:!w-14 sm:!h-14"
                  />
                </div>
              )}
            </div>
            <div className="tt-grid">{sec.items.map((item) => renderCard(sec.kind, item, sec.items))}</div>
          </div>
        </div>
        {overlays}
        </>
      );
    }
  }

  // ---------- home ----------
  const visibleSections = data.sections.filter((s) => s.items.length && s.filters.includes(filter));

  return (
    <>
    <div ref={rootRef} className="relative isolate min-h-full pb-10">
      {wash}
      <div ref={sentinelRef} className="h-px" />
      {stickyBar(
        <div role="tablist" aria-label="Filter home" className="flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => {
            const on = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => pickFilter(f.id)}
                className={`flex-shrink-0 h-8 px-3 rounded-full text-[13px] sm:text-sm font-medium transition-colors ${
                  on ? "bg-white text-black" : "bg-white/[0.07] text-white hover:bg-white/[0.12]"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="px-3 sm:px-5 flex flex-col gap-6 sm:gap-8">
        {filter === "all" && data.shortcuts.length > 0 && (
          <div className="pt-1">
            <h1 className="sr-only">{getGreeting()}{user?.firstName ? `, ${user.firstName}` : ""}</h1>
            <div className="tt-shortcuts" onMouseLeave={() => setHoverTint(null)}>
              {data.shortcuts.map(renderShortcut)}
            </div>
          </div>
        )}

        {visibleSections.map((sec) => (
          <Shelf
            key={sec.key}
            title={sec.title}
            eyebrow={sec.eyebrow}
            items={sec.items}
            onShowAll={() => goTo(sec.key)}
            renderItem={(item, _i, list) => renderCard(sec.kind, item, list)}
          />
        ))}

        {visibleSections.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-white font-bold">Nothing here yet</p>
            <p className="text-sm text-neutral-400 mt-1">Play a few songs and this fills up.</p>
          </div>
        )}
      </div>
    </div>
    {overlays}
    </>
  );
}
