// GIF & sticker search proxy. Keeps the API key server-side and gives the
// client one stable shape: { results: [{ id, url, preview, width, height }], next }.
//
// Provider: Tenor v2 (Google) — free key from Google Cloud Console
// (enable "Tenor API", create an API key, set TENOR_API_KEY in .env.local).
// Legacy: GIPHY_API_KEY still works if you have an old Giphy key.
// No key at all? Falls back to a curated, tag-searchable set so the picker
// is never empty.

const TENOR_KEY = process.env.TENOR_API_KEY;
const GIPHY_KEY = process.env.GIPHY_API_KEY;
const PAGE_SIZE = 24;

// Curated fallback — media.giphy.com URLs are stable and hotlinkable.
// Tags make the local "search" feel real instead of returning nothing.
const CURATED = {
  gifs: [
    { id: "dance1", tags: "dance party groove happy", url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" },
    { id: "music1", tags: "music headphones vibe listen", url: "https://media.giphy.com/media/tqfS3mgQU28ko/giphy.gif" },
    { id: "cat1", tags: "cat vibe bob head nod", url: "https://media.giphy.com/media/GeimqsH0TLDt4tScGw/giphy.gif" },
    { id: "excited1", tags: "excited yes happy woo", url: "https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif" },
    { id: "laugh1", tags: "laugh lol funny haha", url: "https://media.giphy.com/media/O5NyCibf93upy/giphy.gif" },
    { id: "love1", tags: "love heart aww", url: "https://media.giphy.com/media/LnKonMpVzWSpW/giphy.gif" },
    { id: "sad1", tags: "sad cry crying tears", url: "https://media.giphy.com/media/ROF8OQvDmxytW/giphy.gif" },
    { id: "wow1", tags: "wow shocked omg surprised", url: "https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif" },
    { id: "party1", tags: "party celebrate confetti", url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif" },
    { id: "cool1", tags: "cool sunglasses deal with it", url: "https://media.giphy.com/media/62PP2yEIAZF6g/giphy.gif" },
    { id: "guitar1", tags: "guitar rock music jam", url: "https://media.giphy.com/media/FnsbzAybylCs8/giphy.gif" },
    { id: "sing1", tags: "sing singing mic karaoke", url: "https://media.giphy.com/media/l2R09YlIRnGJenPLW/giphy.gif" },
    { id: "no1", tags: "no nope shake head", url: "https://media.giphy.com/media/gnE4FFhtFoLKM/giphy.gif" },
    { id: "yes1", tags: "yes nod agree thumbs up", url: "https://media.giphy.com/media/GCLlQnV7wzKLu/giphy.gif" },
    { id: "clap1", tags: "clap applause bravo", url: "https://media.giphy.com/media/7rj2ZgttvgomY/giphy.gif" },
    { id: "hello1", tags: "hello hi wave hey", url: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif" },
    { id: "bye1", tags: "bye goodbye wave leaving", url: "https://media.giphy.com/media/UQaRUOLveyjNC/giphy.gif" },
    { id: "eyeroll1", tags: "eye roll annoyed whatever", url: "https://media.giphy.com/media/Rhhr8D5mKSX7O/giphy.gif" },
    { id: "fire1", tags: "fire lit flames hot", url: "https://media.giphy.com/media/l0IylOPCNkiqOgMyA/giphy.gif" },
    { id: "mindblown1", tags: "mind blown explosion wow", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
  ],
  stickers: [
    { id: "s-heart", tags: "heart love", url: "https://media.giphy.com/media/ZERoCqBAaBjEbUrTmO/giphy.gif" },
    { id: "s-fire", tags: "fire lit", url: "https://media.giphy.com/media/J2xzzMoBBeGfCP2exZ/giphy.gif" },
    { id: "s-lol", tags: "lol laugh funny", url: "https://media.giphy.com/media/h4OGa0npayrJX2NRPT/giphy.gif" },
    { id: "s-party", tags: "party celebrate", url: "https://media.giphy.com/media/RfPyGvbTuxQqR0k2ZE/giphy.gif" },
    { id: "s-music", tags: "music note vibe", url: "https://media.giphy.com/media/tvGOBZKNEX0ac/giphy.gif" },
    { id: "s-cry", tags: "cry sad tears", url: "https://media.giphy.com/media/W3aoxXCbNBIhcBNTIa/giphy.gif" },
    { id: "s-thumbs", tags: "thumbs up ok yes", url: "https://media.giphy.com/media/UqZ4imFIoljlr5O2sM/giphy.gif" },
    { id: "s-wow", tags: "wow omg shocked", url: "https://media.giphy.com/media/XEyXIfu7IRQivZl1Mw/giphy.gif" },
    { id: "s-hi", tags: "hi hello wave", url: "https://media.giphy.com/media/xTiN0CNHgoRf1Ha7CM/giphy.gif" },
    { id: "s-100", tags: "100 percent keep it real", url: "https://media.giphy.com/media/26gsjCZpPolPr3sBy/giphy.gif" },
    { id: "s-star", tags: "star sparkle shine", url: "https://media.giphy.com/media/l0HFkA6omUyjVYqw8/giphy.gif" },
    { id: "s-dance", tags: "dance groove", url: "https://media.giphy.com/media/3ohc10nduj1irsuzgA/giphy.gif" },
  ],
};

function curatedResults(type, q, pos) {
  const offset = Math.max(0, parseInt(pos || "0", 10) || 0);
  const pool = CURATED[type] || CURATED.gifs;
  const needle = (q || "").trim().toLowerCase();
  const filtered = needle
    ? pool.filter((g) => g.tags.includes(needle) || needle.split(/\s+/).some((w) => g.tags.includes(w)))
    : pool;
  const page = filtered.slice(offset, offset + PAGE_SIZE);
  return {
    results: page.map((g) => ({ id: g.id, url: g.url, preview: g.url, width: 200, height: 200 })),
    next: offset + page.length < filtered.length ? String(offset + page.length) : null,
    curated: true,
  };
}

// --- Tenor v2 -------------------------------------------------------------

async function tenorResults(type, q, pos) {
  const endpoint = q ? "search" : "featured";
  const url = new URL(`https://tenor.googleapis.com/v2/${endpoint}`);
  url.searchParams.set("key", TENOR_KEY);
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("media_filter", "gif,tinygif");
  url.searchParams.set("contentfilter", "medium");
  if (q) url.searchParams.set("q", q);
  if (pos) url.searchParams.set("pos", pos);
  if (type === "stickers") url.searchParams.set("searchfilter", "sticker");

  const res = await fetch(url, { next: { revalidate: q ? 0 : 300 } });
  if (!res.ok) throw new Error(`Tenor ${res.status}`);
  const data = await res.json();

  const results = (data.results || [])
    .map((g) => {
      // tinygif keeps grid bandwidth sane; full gif goes into the message.
      const tiny = g.media_formats?.tinygif;
      const full = g.media_formats?.gif || tiny;
      if (!full?.url) return null;
      return {
        id: g.id,
        url: full.url,
        preview: tiny?.url || full.url,
        width: tiny?.dims?.[0] || 200,
        height: tiny?.dims?.[1] || 200,
      };
    })
    .filter(Boolean);

  return { results, next: data.next && results.length > 0 ? data.next : null };
}

// --- Giphy (legacy, only if an old key is configured) ---------------------

async function giphyResults(type, q, pos) {
  const offset = Math.max(0, parseInt(pos || "0", 10) || 0);
  const endpoint = q ? "search" : "trending";
  const url = new URL(`https://api.giphy.com/v1/${type}/${endpoint}`);
  url.searchParams.set("api_key", GIPHY_KEY);
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("rating", "pg-13");
  if (q) url.searchParams.set("q", q);

  const res = await fetch(url, { next: { revalidate: q ? 0 : 300 } });
  if (!res.ok) throw new Error(`Giphy ${res.status}`);
  const data = await res.json();

  const results = (data.data || [])
    .map((g) => {
      const preview = g.images?.fixed_width?.url || g.images?.original?.url;
      const full = g.images?.original?.url || preview;
      if (!preview) return null;
      return {
        id: g.id,
        url: full,
        preview,
        width: parseInt(g.images?.fixed_width?.width || "200", 10),
        height: parseInt(g.images?.fixed_width?.height || "200", 10),
      };
    })
    .filter(Boolean);

  const total = data.pagination?.total_count ?? 0;
  const nextOffset = offset + results.length;
  return { results, next: nextOffset < total && results.length > 0 ? String(nextOffset) : null };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") === "stickers" ? "stickers" : "gifs";
  const q = searchParams.get("q")?.trim() || "";
  // Opaque cursor: Tenor's `next` token, or a numeric offset for Giphy/curated.
  const pos = searchParams.get("offset") || "";

  try {
    if (TENOR_KEY) return Response.json(await tenorResults(type, q, pos));
    if (GIPHY_KEY) return Response.json(await giphyResults(type, q, pos));
  } catch (err) {
    console.error("GIF proxy error:", err.message);
  }
  // No key, provider down, or key invalid — degrade to curated instead of an empty picker.
  return Response.json(curatedResults(type, q, pos));
}
