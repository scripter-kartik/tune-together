import { useState, useEffect } from "react";

const lyricsCache = new Map();

export function useLyrics(song) {
  const [lyricsData, setLyricsData] = useState(null);
  const [lyricsStatus, setLyricsStatus] = useState("idle");

  useEffect(() => {
    if (!song) {
      setLyricsData(null);
      setLyricsStatus("idle");
      return;
    }

    const id = song.id;
    if (lyricsCache.has(id)) {
      const cached = lyricsCache.get(id);
      setLyricsData(cached);
      setLyricsStatus(cached ? "ready" : "error");
      return;
    }

    let cancelled = false;
    setLyricsData(null);
    setLyricsStatus("loading");

    const params = new URLSearchParams({
      id: String(id),
      title: song.title || "",
      artist: song.artist?.name || "",
      album: song.album?.title || "",
      duration: song.duration ? String(song.duration) : "",
    });

    fetch(`/api/lyrics?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (res.syncedLyrics || res.plainLyrics) {
          lyricsCache.set(id, res);
          setLyricsData(res);
          setLyricsStatus("ready");
        } else {
          lyricsCache.set(id, null);
          setLyricsData(null);
          setLyricsStatus("error");
        }
      })
      .catch(() => {
        if (!cancelled) setLyricsStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [song?.id]);

  return { lyricsData, lyricsStatus };
}
