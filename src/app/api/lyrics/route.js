import { connectDB } from "@/lib/db";
import Lyrics from "@/lib/models/Lyrics";
import { getYTMusic } from "@/lib/ytmusic";











const LRCLIB_HEADERS = {
  
  "User-Agent": "tune-together (https://github.com/scripter-kartik/tune-together)",
};

async function lrclibGet({ title, artist, album, duration }) {
  const params = new URLSearchParams({
    track_name: title,
    artist_name: artist,
  });
  if (album) params.set("album_name", album);
  if (duration) params.set("duration", String(duration));

  const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
    headers: LRCLIB_HEADERS,
  });
  if (!res.ok) return null;
  return res.json();
}

async function lrclibSearch({ title, artist }) {
  const params = new URLSearchParams({
    track_name: title,
    artist_name: artist,
  });
  const res = await fetch(`https://lrclib.net/api/search?${params.toString()}`, {
    headers: LRCLIB_HEADERS,
  });
  if (!res.ok) return null;
  const results = await res.json();
  if (!Array.isArray(results) || results.length === 0) return null;
  
  return results.find((r) => r.syncedLyrics) || results[0];
}






async function fetchYoutubeLyrics({ title, artist, videoId }) {
  const getLines = async (vid) => {
    if (!vid) return null;
    try {
      const yt = await getYTMusic();
      const lines = await yt.getLyrics(vid);
      if (Array.isArray(lines) && lines.length > 0) {
        const text = lines
          .map((l) => String(l).trim())
          .filter(Boolean)
          .join("\n");
        if (text) return text;
      }
    } catch (err) {
      console.error("lyrics: youtube fetch failed", err);
    }
    return null;
  };

  const direct = await getLines(videoId);
  if (direct) return direct;

  if (!title) return null;
  try {
    const yt = await getYTMusic();
    const songs = await yt.searchSongs(`${title} ${artist}`.trim()).catch(() => []);
    for (const song of songs.slice(0, 3)) {
      const text = await getLines(song.videoId);
      if (text) return text;
    }
  } catch (err) {
    console.error("lyrics: youtube search failed", err);
  }
  return null;
}



async function fetchGeniusLyrics(title, artist) {
  if (!title) return null;
  try {
    const { Client } = await import("genius-lyrics");
    const genius = new Client();
    const songs = await genius.songs.search(`${title} ${artist}`.trim());
    if (songs?.[0]) {
      const lyrics = await songs[0].lyrics();
      if (lyrics && lyrics.trim()) return lyrics.trim();
    }
  } catch {
    
  }
  return null;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const deezerId = searchParams.get("id");
  const title = searchParams.get("title") || "";
  const artist = searchParams.get("artist") || "";
  const album = searchParams.get("album") || "";
  const duration = searchParams.get("duration") || "";
  const youtubeId = searchParams.get("youtubeId") || "";

  if (!deezerId || !title) {
    return Response.json({ error: "id and title are required" }, { status: 400 });
  }

  
  try {
    await connectDB();
    const cached = await Lyrics.findOne({ deezerId: String(deezerId) });
    if (cached && (cached.syncedLyrics || cached.plainLyrics)) {
      return jsonCached({
        syncedLyrics: cached.syncedLyrics,
        plainLyrics: cached.plainLyrics,
        provider: cached.provider || "lrclib",
        cached: true,
      });
    }
  } catch (err) {
    console.error("lyrics: cache lookup failed", err);
  }

  
  
  let record = null;
  try {
    const [getRes, searchRes] = await Promise.allSettled([
      lrclibGet({ title, artist, album, duration }),
      lrclibSearch({ title, artist }),
    ]);
    const getVal = getRes.status === "fulfilled" ? getRes.value : null;
    const searchVal = searchRes.status === "fulfilled" ? searchRes.value : null;

    
    if (getVal?.syncedLyrics) record = getVal;
    else if (searchVal?.syncedLyrics) record = searchVal;
    else record = getVal || searchVal;
  } catch (err) {
    console.error("lyrics: LRCLIB request failed", err);
  }

  let syncedLyrics = record?.syncedLyrics || null;
  let plainLyrics = record?.plainLyrics || null;
  let provider = record ? "lrclib" : null;

  
  
  if (!syncedLyrics && !plainLyrics) {
    const [ytRes, geniusRes] = await Promise.allSettled([
      fetchYoutubeLyrics({ title, artist, videoId: youtubeId }),
      fetchGeniusLyrics(title, artist),
    ]);
    const ytPlain = ytRes.status === "fulfilled" ? ytRes.value : null;
    const geniusPlain = geniusRes.status === "fulfilled" ? geniusRes.value : null;

    if (ytPlain) {
      plainLyrics = ytPlain;
      provider = "youtube";
    } else if (geniusPlain) {
      plainLyrics = geniusPlain;
      provider = "genius";
    }
  }

  
  if (syncedLyrics || plainLyrics) {
    try {
      await Lyrics.findOneAndUpdate(
        { deezerId: String(deezerId) },
        {
          deezerId: String(deezerId),
          syncedLyrics,
          plainLyrics,
          provider,
          title,
          artist,
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error("lyrics: cache write failed", err);
    }
  }

  return jsonCached({ syncedLyrics, plainLyrics, provider });
}



function jsonCached(body) {
  return Response.json(body, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400",
    },
  });
}
