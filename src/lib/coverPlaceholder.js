// Generates an album-cover-style placeholder as an inline SVG data URI.
// Used instead of the app logo when a track/artist/album has no artwork
// (or its remote image fails to load), so empty slots still read as covers.

// Curated gradient pairs — deterministic per seed so the same title always
// gets the same "cover" instead of flickering between renders.
const PALETTES = [
  ["#6d28d9", "#c026d3"],
  ["#2563eb", "#06b6d4"],
  ["#059669", "#84cc16"],
  ["#ea580c", "#f59e0b"],
  ["#db2777", "#f43f5e"],
  ["#4f46e5", "#0ea5e9"],
  ["#7c3aed", "#ec4899"],
  ["#0d9488", "#22d3ee"],
];

function hash(str) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// A simple music-note glyph so the placeholder still says "music".
const NOTE_PATH =
  "M180 40v96a34 34 0 1 1-16-28V72l-64 16v76a34 34 0 1 1-16-28V72a12 12 0 0 1 9-11.6l80-20A12 12 0 0 1 180 52z";

export function coverPlaceholder(seed) {
  const [a, b] = PALETTES[hash(seed) % PALETTES.length];
  const id = "g" + (hash(seed) % 1000);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 240 240">
<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
</linearGradient></defs>
<rect width="240" height="240" fill="url(#${id})"/>
<path d="${NOTE_PATH}" transform="translate(-3 24)" fill="rgba(255,255,255,0.85)"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
