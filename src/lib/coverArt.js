






export function hiResCover(url, size = 600) {
  if (!url || typeof url !== "string") return url;

  
  
  if (/=w\d+-h\d+/.test(url)) {
    return url.replace(/=w\d+-h\d+/, `=w${size}-h${size}`);
  }

  
  
  const m = url.match(/(https?:\/\/i\.ytimg\.com\/vi\/[^/]+\/)[^/]+\.jpg/);
  if (m) return `${m[1]}sddefault.jpg`;

  return url;
}
