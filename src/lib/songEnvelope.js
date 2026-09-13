


const SONG_PREFIX = "⁣TTSONG⁣";
const GIF_PREFIX = "⁣TTGIF⁣";
const STICKER_PREFIX = "⁣TTSTICKER⁣";

export function slimSong(song) {
  return {
    id: song.id,
    title: song.title,
    duration: song.duration || 0,
    youtubeId: song.youtubeId || song.id,
    artist: {
      name: song.artist?.name || "Unknown",
      id: song.artist?.id || null,
    },
    album: {
      id: song.album?.id || null,
      title: song.album?.title || "",
      cover_medium:
        song.album?.cover_medium ||
        song.album?.cover_big ||
        song.album?.cover_small ||
        null,
    },
  };
}


export function encodeSongMessage(song, note = "") {
  return SONG_PREFIX + JSON.stringify({ song: slimSong(song), note });
}

export function encodeGifMessage(url) {
  return GIF_PREFIX + JSON.stringify({ url });
}

export function encodeStickerMessage(url) {
  return STICKER_PREFIX + JSON.stringify({ url });
}


export function parseSongMessage(text) {
  if (typeof text !== "string" || !text.startsWith(SONG_PREFIX)) return null;
  try {
    const { song, note } = JSON.parse(text.slice(SONG_PREFIX.length));
    if (!song?.id || !song?.title) return null;
    return { song, note: typeof note === "string" ? note : "" };
  } catch {
    return null;
  }
}

export function parseGifMessage(text) {
  if (typeof text !== "string" || !text.startsWith(GIF_PREFIX)) return null;
  try {
    return JSON.parse(text.slice(GIF_PREFIX.length));
  } catch {
    return null;
  }
}

export function parseStickerMessage(text) {
  if (typeof text !== "string" || !text.startsWith(STICKER_PREFIX)) return null;
  try {
    return JSON.parse(text.slice(STICKER_PREFIX.length));
  } catch {
    return null;
  }
}

export function withMediaEnvelopes(msg) {
  const songParsed = parseSongMessage(msg.text);
  if (songParsed) {
    return { ...msg, song: songParsed.song, text: songParsed.note };
  }
  const gifParsed = parseGifMessage(msg.text);
  if (gifParsed) {
    return { ...msg, gif: gifParsed.url, text: "" };
  }
  const stickerParsed = parseStickerMessage(msg.text);
  if (stickerParsed) {
    return { ...msg, sticker: stickerParsed.url, text: "" };
  }
  return msg;
}

