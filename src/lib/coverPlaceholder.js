// The user requested to remove the generated placeholders.
// If a cover fails to load or is missing, we just return the url
// or a transparent pixel/default icon, and let the browser handle it.

export function resolveCover(url, seed) {
  if (!url || typeof url !== "string" || url === "/icon2.png") {
    // If there is no URL, you can return a transparent pixel or empty string.
    // We'll return an empty string so the alt text or a broken image shows.
    return "";
  }
  return url;
}

export function coverError(seed) {
  return (e) => {
    console.error("Cover image failed to load:", e.target.src);
    // e.target.onerror = null;
    // You could set a default static fallback image here if desired:
    // e.target.src = "/icon2.png";
  };
}
