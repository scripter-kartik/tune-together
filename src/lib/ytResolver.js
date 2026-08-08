// Shared YouTube resolver helpers.
//
// Deezer's public API only exposes 30s previews, so for full songs (and for
// finding a YouTube source whose lyrics we can fetch) we look the track up on
// YouTube. Used by /api/resolve (playback source) and /api/lyrics (lyrics
// fallback). The scrape needs no API key / quota.

const YT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

// Scrape the first video id off a YouTube results page.
export async function searchYouTube(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    query
  )}&hl=en&gl=US`;

  const res = await fetch(url, { headers: YT_HEADERS });
  if (!res.ok) return null;

  const html = await res.text();
  const match = html.match(/"videoId":"([\w-]{11})"/);
  return match ? match[1] : null;
}
