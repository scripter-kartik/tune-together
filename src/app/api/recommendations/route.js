import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import PlayHistory from "@/lib/models/PlayHistory";
import { getYTMusic } from "@/lib/ytmusic";

const lastThumb = (item) => item.thumbnails?.[item.thumbnails.length - 1]?.url || "/icon2.png";

// Generic discovery seeds mixed in when the user has little/no history, so the
// recommendations section is never empty.
const DISCOVERY_SEEDS = ["chill", "focus", "indie", "lofi", "pop", "electronic"];

// Time-of-day mood seed — keeps "Made for you" feeling fresh.
function moodSeed() {
  const h = new Date().getHours();
  if (h < 5) return "late night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

function toSong(item) {
  const thumb = (n) => item.thumbnails?.[n]?.url || lastThumb(item);
  return {
    id: item.videoId,
    title: item.name,
    artist: { name: item.artist?.name || "Unknown", id: item.artist?.artistId || null },
    album: {
      id: item.album?.albumId || null,
      title: item.album?.name || "Unknown",
      cover_small: thumb(0),
      cover_medium: thumb(1),
      cover_big: lastThumb(item),
      cover_xl: lastThumb(item),
    },
    duration: item.duration || 0,
    youtubeId: item.videoId,
  };
}

export async function GET() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return Response.json({ songs: [], topArtists: [], mixes: [] });
    }

    await connectDB();

    // Top artists from listening history — these drive the seed searches.
    const artistRows = await PlayHistory.aggregate([
      { $match: { clerkId: clerkUser.id } },
      { $sort: { playedAt: -1 } },
      {
        $group: {
          _id: "$artistName",
          count: { $sum: 1 },
          artistId: { $first: "$artistId" },
          lastPlayed: { $max: "$playedAt" },
        },
      },
      { $sort: { count: -1, lastPlayed: -1 } },
      { $limit: 5 },
    ]);

    const topArtists = artistRows
      .filter((r) => r._id && r._id !== "Unknown Artist")
      .map((r) => ({ id: r.artistId, name: r._id }));

    // Recently-played ids — never re-recommend these.
    const recent = await PlayHistory.find({ clerkId: clerkUser.id })
      .sort({ playedAt: -1 })
      .limit(25)
      .select("songId")
      .lean();
    const recentIds = new Set(recent.map((r) => r.songId));

    // Seed searches: top artists (as "artist X" queries) + discovery + mood.
    const artistQueries = topArtists.slice(0, 3).map((a) => a.name);
    const seeds = [...artistQueries, ...DISCOVERY_SEEDS.slice(0, 2), moodSeed()];

    // Daily Mixes — a dedicated per-artist search so each mix is a clean,
    // personalized "made for you" collection.
    const mixArtists = topArtists.slice(0, 4);
    const mixQueries = mixArtists.map((a) => `${a.name} songs`);

    const ytmusic = await getYTMusic();
    const results = await Promise.all(
      [...seeds, ...mixQueries].map((q) => ytmusic.searchSongs(q).catch(() => []))
    );
    const seedBatches = results.slice(0, seeds.length);
    const mixBatches = results.slice(seeds.length);

    // Flatten, normalize, filter out history + placeholders, dedupe.
    const seen = new Set(recentIds);
    const out = [];
    for (const batch of seedBatches) {
      for (const item of batch || []) {
        if (!item?.videoId) continue;
        if (seen.has(item.videoId)) continue;
        seen.add(item.videoId);
        out.push(toSong(item));
      }
    }

    // Build Daily Mixes from the per-artist batches. Each mix is isolated in
    // its own try/catch so one bad batch can never sink the whole route.
    let mixes = [];
    try {
      const mixSeen = new Set(recentIds);
      for (let i = 0; i < mixBatches.length; i++) {
        try {
          const artist = mixArtists[i];
          const batch = mixBatches[i] || [];
          const mixSongs = [];
          for (const item of batch) {
            if (!item?.videoId) continue;
            if (mixSeen.has(item.videoId)) continue;
            mixSeen.add(item.videoId);
            mixSongs.push(toSong(item));
            if (mixSongs.length >= 12) break;
          }
          if (mixSongs.length < 3) continue;
          mixes.push({
            id: `mix-${i}`,
            title: `Daily Mix ${i + 1}`,
            subtitle: artist?.name || "",
            cover: mixSongs[0].album?.cover_medium || mixSongs[0].album?.cover_small,
            songs: mixSongs,
          });
        } catch (mixErr) {
          console.error(`Recommendations: mix ${i} failed:`, mixErr);
        }
      }
    } catch (mixErr) {
      console.error("Recommendations: Daily Mix build failed:", mixErr);
      mixes = [];
    }

    // Interleave artist-matched tracks toward the front for relevance, then
    // cap the payload.
    const byArtistId = new Set(topArtists.map((a) => a.id).filter(Boolean));
    const byArtistName = new Set(topArtists.map((a) => a.name.toLowerCase()));
    const scored = out.map((s) => ({
      s,
      score:
        (byArtistId.has(s.artist.id) || byArtistName.has((s.artist.name || "").toLowerCase()) ? 1 : 0) +
        (s.album?.title && s.album.title !== "Unknown" ? 0.5 : 0),
    }));
    scored.sort((a, b) => b.score - a.score);
    const songs = scored.slice(0, 40).map((x) => x.s);

    return Response.json({ songs, topArtists, mixes });
  } catch (error) {
    console.error("Recommendations error:", error);
    return Response.json({ songs: [], topArtists: [], mixes: [] });
  }
}
