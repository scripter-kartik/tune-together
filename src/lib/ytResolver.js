






const YT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};


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
