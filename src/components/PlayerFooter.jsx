"use client";
import { useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";
import { FaPlay, FaPause, FaForward, FaBackward } from "react-icons/fa";
import { BsFillVolumeUpFill, BsFillVolumeMuteFill } from "react-icons/bs";
import { MicVocal, ListMusic } from "lucide-react";
import { useUpdateNowPlaying } from "@/hooks/useActivityTracker";
import { useLyrics } from "@/hooks/useLyrics";
import { resolveCover, coverError } from "@/lib/coverPlaceholder";
import LyricsView from "./LyricsView";
import NowPlayingView from "./NowPlayingView";
import { getSyncSession, endSyncSession } from "@/lib/syncSession";
import { joinRoomId } from "@/lib/room";

export default function PlayerFooter({
  song,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  roomId,
  socketRef,
  hasSongs,
  syncSession,
  onUnsync,
}) {
  const playerRef = useRef(null);
  const [playerUrl, setPlayerUrl] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isSeeking = useRef(false);

  // react-player renders a <Suspense> internally, which mismatches during SSR.
  // Only mount it on the client to avoid a hydration error.
  useEffect(() => setMounted(true), []);

  const [internalSyncSession, setInternalSyncSession] = useState(null);

  useEffect(() => {
    setInternalSyncSession(getSyncSession());
    const onSyncStatus = () => setInternalSyncSession(getSyncSession());
    window.addEventListener("tt-sync-status", onSyncStatus);
    return () => window.removeEventListener("tt-sync-status", onSyncStatus);
  }, []);

  const activeSyncSession = syncSession !== undefined ? syncSession : internalSyncSession;

  const handleUnsync = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (onUnsync) {
      onUnsync();
      return;
    }
    endSyncSession();
    setInternalSyncSession(null);
    const newRoom = crypto.randomUUID?.() || `r-${Date.now().toString(36)}`;
    joinRoomId(newRoom);
    window.dispatchEvent(
      new CustomEvent("tt-join-room", { detail: { roomId: newRoom, carry: true } })
    );
  };

  // Player readiness + a seek we couldn't apply yet (media still loading).
  const playerReadyRef = useRef(false);
  const pendingSeekRef = useRef(null);

  const { updateNowPlaying } = useUpdateNowPlaying();

  // Seek helper: apply now if the media is ready, otherwise defer until onReady.
  const seekTo = (t) => {
    const pos = Math.max(0, t || 0);
    if (playerRef.current && playerReadyRef.current) {
      try {
        playerRef.current.seekTo(pos, "seconds");
      } catch {}
    } else {
      pendingSeekRef.current = pos;
    }
  };

  // Resolve the current Deezer track to a full-length YouTube source.
  // Falls back to Deezer's 30s preview if no match is found.
  useEffect(() => {
    if (!song) {
      setPlayerUrl(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    playerReadyRef.current = false;
    setCurrentTime(0);
    setDuration(0);

    if (song.youtubeId) {
      setPlayerUrl(`https://www.youtube.com/watch?v=${song.youtubeId}`);
      return () => {
        cancelled = true;
      };
    }

    const params = new URLSearchParams({
      id: String(song.id),
      title: song.title || "",
      artist: song.artist?.name || "",
    });

    fetch(`/api/resolve?${params.toString()}`)
      .then((r) => r.json())
      .then(({ youtubeId }) => {
        if (cancelled) return;
        if (youtubeId) {
          setPlayerUrl(`https://www.youtube.com/watch?v=${youtubeId}`);
        } else {
          // Graceful fallback: the 30s preview beats nothing.
          setPlayerUrl(song.preview || null);
        }
      })
      .catch(() => {
        if (!cancelled) setPlayerUrl(song.preview || null);
      });

    return () => {
      cancelled = true;
    };
  }, [song?.id]);

  const { lyricsData, lyricsStatus } = useLyrics(song);

  // Broadcast "now playing" for the activity/presence feature.
  useEffect(() => {
    if (!song || !isPlaying) {
      updateNowPlaying(null);
      return;
    }

    updateNowPlaying({
      id: song.id,
      title: song.title,
      artist: {
        name: song.artist?.name || "Unknown",
      },
      album: {
        cover_small: resolveCover(song.album?.cover_small || song.album?.cover_medium, song.title || song.id),
      },
    });
  }, [song, isPlaying, updateNowPlaying]);

  // Room sync: play/pause state is driven by the `isPlaying` prop (parent
  // updates it from sync-play/sync-song), so here we only apply the shared
  // playback POSITION by seeking.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const applyPosition = (position, at) => {
      const posNow = (position ?? 0) + (Date.now() - (at || Date.now())) / 1000;
      seekTo(posNow);
    };

    const onPlay = ({ position, at }) => applyPosition(position, at);
    const onSong = ({ position, at }) => applyPosition(position, at);
    const onSeek = ({ position, at }) => applyPosition(position, at);

    socket.on("sync-play", onPlay);
    socket.on("sync-song", onSong);
    socket.on("sync-seek", onSeek);

    const onTTSync = (e) => {
      const d = e.detail || {};
      if (d.type === "state" || d.type === "song") {
        applyPosition(d.position, d.at);
      } else if (d.type === "play") {
        applyPosition(d.position, d.at);
      } else if (d.type === "seek") {
        applyPosition(d.position, d.at);
      }
    };
    window.addEventListener("tt-sync", onTTSync);

    // Synchronous position probe: dispatchers read e.detail.position after
    // dispatch (used to carry playback into a shared room).
    const onGetPosition = (e) => {
      if (e.detail) e.detail.position = playerRef.current?.getCurrentTime?.() || 0;
    };
    window.addEventListener("tt-get-position", onGetPosition);

    return () => {
      socket.off("sync-play", onPlay);
      socket.off("sync-song", onSong);
      socket.off("sync-seek", onSeek);
      window.removeEventListener("tt-sync", onTTSync);
      window.removeEventListener("tt-get-position", onGetPosition);
    };
  }, [socketRef, song?.id]);

  const handleReady = () => {
    playerReadyRef.current = true;
    setIsLoading(false);
    if (pendingSeekRef.current != null) {
      const pos = pendingSeekRef.current;
      pendingSeekRef.current = null;
      try {
        playerRef.current?.seekTo(pos, "seconds");
      } catch {}
    }
  };

  const handleProgress = ({ playedSeconds }) => {
    if (!isSeeking.current) setCurrentTime(playedSeconds);
    window.dispatchEvent(new CustomEvent("tt-time-update", { detail: playedSeconds }));
  };

  const handleDuration = (d) => setDuration(d || 0);

  const handlePlayPauseClick = () => {
    const nextPlaying = !isPlaying;
    if (roomId && socketRef.current && song) {
      socketRef.current.emit("toggle-play", {
        roomId,
        isPlaying: nextPlaying,
        position: playerRef.current?.getCurrentTime?.() || 0,
      });
    }
    onPlayPause();
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code !== "Space" && e.key !== " ") return;
      const t = e.target;
      const tag = t?.tagName;
      
      // Only allow spacebar to type normally inside inputs and textareas
      if (
        t?.isContentEditable ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT"
      ) {
        return;
      }
      
      // Prevent default browser behavior (page scrolling) unconditionally
      e.preventDefault();
      
      if (!song || isLoading) return;
      handlePlayPauseClick();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song, isPlaying, isLoading, roomId]);

  const handleSeek = (e) => {
    if (!song) return;
    const newTime = parseFloat(e.target.value);
    isSeeking.current = true;

    seekTo(newTime);
    setCurrentTime(newTime);
    socketRef.current?.emit("seek-time", {
      roomId,
      position: newTime,
    });

    setTimeout(() => {
      isSeeking.current = false;
    }, 100);
  };

  // Jump to a lyric line (Spotify-style click-to-seek), and keep the room in sync.
  const handleLyricSeek = (t) => {
    if (!song) return;
    seekTo(t);
    setCurrentTime(t);
    socketRef.current?.emit("seek-time", { roomId, position: t });
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) setIsMuted(false);
  };

  const toggleMute = () => setIsMuted((m) => !m);

  // Open the Queue tab in the right panel (RightPanel/Home listen for this).
  const openQueue = () => window.dispatchEvent(new CustomEvent("tt-open-queue"));

  // Tapping the mini-player opens the full-screen "Now Playing" sheet — but
  // only on mobile/tablet, where there's no room for the full desktop player.
  const openNowPlaying = () => {
    if (song && typeof window !== "undefined" && window.innerWidth < 768) {
      setShowNowPlaying(true);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60).toString().padStart(2, "0");
    const seconds = Math.floor(time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="relative w-full bg-[#121212]/80 backdrop-blur-xl border-t border-white/5 text-white px-3 md:px-4 flex flex-col md:flex-row items-center justify-between h-[70px] md:h-[90px] shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.5)]">

      <div className="md:hidden absolute top-0 left-0 right-0">
        <div className="flex items-center w-full">
          <input
            type="range"
            min="0"
            max={duration || 30}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className={`w-full h-1 appearance-none bg-neutral-800 cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0 ${!song ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Seek"
            disabled={!song}
            style={{
              background: `linear-gradient(to right, #1db954 ${(currentTime / (duration || 30)) * 100}%, #262626 ${(currentTime / (duration || 30)) * 100}%)`
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between w-full h-full">

        <div className="flex items-center gap-3 md:gap-4 flex-1 md:flex-none md:w-[30%] min-w-0">
          {song ? (
            <div
              onClick={openNowPlaying}
              className="flex items-center gap-3 md:gap-4 min-w-0 flex-1 cursor-pointer md:cursor-default"
            >
              <div className="relative flex-shrink-0 rounded flex items-center shadow-lg shadow-black/50">
                <img
                  src={resolveCover(song.album?.cover_medium || song.album?.cover_small, song.title || song.id)}
                  alt={song.title}
                  className="w-12 h-12 md:w-14 md:h-14 object-cover rounded shadow-md"
                  onError={coverError(song.title || song.id)}
                />
              </div>
              <div className="flex flex-col overflow-hidden min-w-0 justify-center">
                <span className="text-[13px] md:text-[14px] font-normal truncate md:hover:underline cursor-pointer text-white">{song.title}</span>
                <span className="text-[11px] md:text-[12px] text-[#b3b3b3] truncate md:hover:underline cursor-pointer md:hover:text-white transition-colors">{song.artist.name}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded bg-[#282828] flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-[#121212]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
            </>
          )}
        </div>

        <div className="hidden md:flex flex-col items-center justify-center w-[40%] max-w-[722px] gap-2">
          <div className="flex items-center gap-6">
            <button
              onClick={onPrev}
              className={`text-[#b3b3b3] hover:text-white transition-colors ${!song ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Previous"
              disabled={!song}
            >
              <FaBackward size={16} />
            </button>

            <button
              onClick={handlePlayPauseClick}
              className={`bg-white text-black w-8 h-8 rounded-full flex items-center justify-center hover:scale-105 transition-all ${(!song || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!song || isLoading}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <FaPause size={14} />
              ) : (
                <FaPlay size={14} className="ml-1" />
              )}
            </button>

            <button
              onClick={onNext}
              className={`text-[#b3b3b3] hover:text-white transition-colors ${!song ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Next"
              disabled={!song}
            >
              <FaForward size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 w-full group">
            <span className="text-[11px] text-[#a7a7a7] font-normal min-w-[40px] text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 30}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className={`flex-1 h-1 appearance-none bg-[#4d4d4d] rounded-full cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:opacity-0 group-hover:[&::-webkit-slider-thumb]:opacity-100 ${!song ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Seek"
              disabled={!song}
              style={{
                background: `linear-gradient(to right, ${song ? '#ffffff' : '#4d4d4d'} ${(currentTime / (duration || 30)) * 100}%, #4d4d4d ${(currentTime / (duration || 30)) * 100}%)`
              }}
              onMouseEnter={(e) => {
                if(song) e.target.style.background = `linear-gradient(to right, #1db954 ${(currentTime / (duration || 30)) * 100}%, #4d4d4d ${(currentTime / (duration || 30)) * 100}%)`;
              }}
              onMouseLeave={(e) => {
                if(song) e.target.style.background = `linear-gradient(to right, #ffffff ${(currentTime / (duration || 30)) * 100}%, #4d4d4d ${(currentTime / (duration || 30)) * 100}%)`;
              }}
            />
            <span className="text-[11px] text-[#a7a7a7] font-normal min-w-[40px]">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex md:hidden items-center justify-end gap-1 flex-shrink-0 pl-2">
          {activeSyncSession && (
            <button
              onClick={handleUnsync}
              className="p-2 text-green-400 hover:text-red-400 transition"
              title="Leave sync session"
            >
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            </button>
          )}
          <button
            onClick={() => song && setShowLyrics(true)}
            className={`p-2 ${showLyrics ? 'text-green-500' : 'text-neutral-300 hover:text-white'} ${!song ? 'opacity-40 cursor-not-allowed' : ''}`}
            aria-label="Lyrics"
            disabled={!song}
          >
            <MicVocal size={18} />
          </button>
          <button
            onClick={openQueue}
            className="p-2 text-neutral-300 hover:text-white"
            aria-label="Queue"
          >
            <ListMusic size={18} />
          </button>
          <button
            onClick={handlePlayPauseClick}
            className={`bg-white text-black w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${(!song || isLoading) ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'} transition-transform`}
            disabled={!song || isLoading}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <FaPause size={15} />
            ) : (
              <FaPlay size={15} className="ml-0.5" />
            )}
          </button>
          <button
            onClick={onNext}
            className={`text-neutral-300 hover:text-white transition-colors p-2 ${!song ? 'opacity-40 cursor-not-allowed' : ''}`}
            aria-label="Next"
            disabled={!song}
          >
            <FaForward size={18} />
          </button>
        </div>

        <div className="hidden md:flex items-center justify-end gap-3 w-[30%] min-w-[220px] group">
          {activeSyncSession && (
            <div className="flex items-center group/sync relative mr-2">
               <button onClick={handleUnsync} className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 text-green-400 rounded-full text-[11px] font-bold hover:bg-red-500/20 hover:text-red-400 transition-colors whitespace-nowrap border border-green-500/30 hover:border-red-500/30">
                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse group-hover/sync:bg-red-500" />
                 <span className="group-hover/sync:hidden">Sync: {activeSyncSession.partnerName}</span>
                 <span className="hidden group-hover/sync:inline">Leave Session</span>
               </button>
            </div>
          )}
          <button
            onClick={() => song && setShowLyrics(true)}
            className={`transition-colors ${showLyrics ? 'text-green-500' : 'text-[#b3b3b3] hover:text-white'} ${!song ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Lyrics"
            disabled={!song}
            title="Lyrics"
          >
            <MicVocal size={18} />
          </button>
          <button
            onClick={openQueue}
            className="text-[#b3b3b3] hover:text-white transition-colors"
            aria-label="Queue"
            title="Queue"
          >
            <ListMusic size={18} />
          </button>
          <button
            onClick={toggleMute}
            className="text-[#b3b3b3] hover:text-white transition-colors"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? (
              <BsFillVolumeMuteFill size={16} />
            ) : (
              <BsFillVolumeUpFill size={16} />
            )}
          </button>
          <div className="w-[93px] flex items-center group/vol">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-full h-1 appearance-none bg-[#4d4d4d] rounded-full cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:opacity-0 group-hover/vol:[&::-webkit-slider-thumb]:opacity-100"
              aria-label="Volume"
              style={{
                background: `linear-gradient(to right, #ffffff ${(isMuted ? 0 : volume) * 100}%, #4d4d4d ${(isMuted ? 0 : volume) * 100}%)`
              }}
              onMouseEnter={(e) => {
                e.target.style.background = `linear-gradient(to right, #1db954 ${(isMuted ? 0 : volume) * 100}%, #4d4d4d ${(isMuted ? 0 : volume) * 100}%)`;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = `linear-gradient(to right, #ffffff ${(isMuted ? 0 : volume) * 100}%, #4d4d4d ${(isMuted ? 0 : volume) * 100}%)`;
              }}
            />
          </div>
        </div>

      </div>

      <NowPlayingView
        song={song}
        isOpen={showNowPlaying}
        onClose={() => setShowNowPlaying(false)}
        isPlaying={isPlaying}
        isLoading={isLoading}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        onPlayPause={handlePlayPauseClick}
        onPrev={onPrev}
        onNext={onNext}
        onOpenLyrics={() => song && setShowLyrics(true)}
        onOpenQueue={() => { setShowNowPlaying(false); openQueue(); }}
        showLyrics={showLyrics}
      />

      <LyricsView
        song={song}
        currentTime={currentTime}
        isOpen={showLyrics}
        onClose={() => setShowLyrics(false)}
        onSeek={handleLyricSeek}
        lyrics={lyricsData}
        status={lyricsStatus}
      />

      {/* Hidden audio engine. Kept offscreen (but non-zero size) so YouTube keeps
          playing audio. Play/pause follows the shared `isPlaying` state. */}
      <div
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          top: "-9999px",
          left: "-9999px",
          opacity: 0,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        {mounted && (
          <ReactPlayer
            ref={playerRef}
            url={playerUrl}
            playing={isPlaying}
            controls={false}
            volume={isMuted ? 0 : volume}
            muted={isMuted}
            width="1px"
            height="1px"
            progressInterval={500}
            onReady={handleReady}
            onStart={() => setIsLoading(false)}
            onBuffer={() => setIsLoading(true)}
            onBufferEnd={() => setIsLoading(false)}
            onProgress={handleProgress}
            onDuration={handleDuration}
            onEnded={onNext}
            onError={() => setIsLoading(false)}
            config={{
              youtube: {
                playerVars: { playsinline: 1, disablekb: 1, modestbranding: 1 },
              },
            }}
          />
        )}
      </div>
    </div>
  );
}
