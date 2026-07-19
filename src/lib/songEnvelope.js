// A shared song or media rides inside the normal E2EE text payload as a JSON
// "envelope" behind an invisible prefix. They get the exact same encryption, 
// replies, reactions and deletes as plain text — no message schema or server changes.
const SONG_PREFIX = "⁣TTSONG⁣";
const GIF_PREFIX = "⁣TTGIF⁣";
const STICKER_PREFIX = "⁣TTSTICKER⁣";

/** Strip a song object down to what a chat card needs (keeps ciphertext small). */
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

/** Plaintext to encrypt when sharing `song` with an optional text note. */
export function encodeSongMessage(song, note = "") {
  return SONG_PREFIX + JSON.stringify({ song: slimSong(song), note });
}

export function encodeGifMessage(url) {
  return GIF_PREFIX + JSON.stringify({ url });
}

export function encodeStickerMessage(url) {
  return STICKER_PREFIX + JSON.stringify({ url });
}

/** Parse a decrypted text; returns { song, note } or null for ordinary text. */
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

/** Lift an envelope out of a decrypted UI message: sets msg.song/gif/sticker, text = note. */
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

