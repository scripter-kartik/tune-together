// Upgrade a YouTube Music / Google thumbnail URL to a larger, sharper size.
//
// The search API only hands back the thumbnails YTMusic ships in results, which
// are small (often ~120–226px). Stretched across a large modal/hero header they
// look pixelated. Both of Google's thumbnail hosts support on-the-fly resizing
// through the URL, so we rewrite the requested size upward instead of scaling a
// tiny bitmap in the browser.
export function hiResCover(url, size = 600) {
  if (!url || typeof url !== "string") return url;

  // lh3.googleusercontent.com / yt3.ggpht.com — size lives in the URL as
  // "...=w120-h120-l90-rj". Bump just the w/h, keep any trailing flags.
  if (/=w\d+-h\d+/.test(url)) {
    return url.replace(/=w\d+-h\d+/, `=w${size}-h${size}`);
  }

  // i.ytimg.com/vi/<id>/<quality>.jpg — request a larger still. sddefault
  // (640×480) reliably exists for essentially every video.
  const m = url.match(/(https?:\/\/i\.ytimg\.com\/vi\/[^/]+\/)[^/]+\.jpg/);
  if (m) return `${m[1]}sddefault.jpg`;

  return url;
}
