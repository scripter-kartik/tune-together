// The user requested to remove the generated placeholders.
// If a cover fails to load or is missing, we just return the url
// or a transparent pixel/default icon, and let the browser handle it.

export function resolveCover(url, seed) {
  if (!url || typeof url !== "string" || url === "/icon2.png") {
    // Return null instead of "" to prevent Next.js "empty string" warning
    return null;
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
