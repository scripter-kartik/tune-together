"use client";
import { useEffect, useState } from "react";
import { X, ListMusic, Trash2, Plus, Play } from "lucide-react";
import { resolveCover, coverError } from "@/lib/coverPlaceholder";

export default function QueueList({ queue = [], currentSong, onRemove, onClear }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentSong?.artist?.name) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(currentSong.artist.name)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.songs) {
          // Filter out the current song and any songs already in the queue
          const queueIds = new Set(queue.map((s) => String(s.id)));
          const currentId = String(currentSong.id);
          const filtered = data.songs.filter(
            (s) => String(s.id) !== currentId && !queueIds.has(String(s.id))
          );
          // Shuffle and pick 5
          const shuffled = filtered.sort(() => 0.5 - Math.random()).slice(0, 5);
          setSuggestions(shuffled);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentSong?.artist?.name, queue.length]);

  const handleAddSuggestion = (song) => {
    window.dispatchEvent(new CustomEvent("tt-queue-song", { detail: song }));
  };

  const handlePlaySuggestion = (song) => {
    window.dispatchEvent(new CustomEvent("tt-play-song", { detail: { song } }));
  };
  return (
    <div className="flex flex-col h-full bg-[#181818]">
      <div className="flex items-center justify-between p-3 border-b border-neutral-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-green-400" />
          <h2 className="text-sm font-bold text-green-400">Up Next</h2>
          <span className="text-xs text-gray-500">({queue.length})</span>
        </div>
        {queue.length > 0 && (
          <button
            onClick={onClear}
            className="text-gray-400 hover:text-red-400 transition"
            title="Clear queue"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {queue.length > 0 && (
          <div className="p-2 space-y-1">
            {queue.map((song, idx) => (
              <div
                key={`${song.id}-${idx}`}
                className="flex items-center gap-2 p-2 rounded hover:bg-white/5 group"
              >
                <span className="text-xs text-gray-500 w-4 text-center flex-shrink-0">
                  {idx + 1}
                </span>
                <img referrerPolicy="no-referrer"
                  src={resolveCover(song.album?.cover_small || song.album?.cover_medium, song.title || song.id)}
                  alt=""
                  className="w-9 h-9 rounded flex-shrink-0 object-cover bg-neutral-800"
                  onError={coverError(song.title || song.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{song.title}</p>
                  <p className="text-xs text-gray-400 truncate">{song.artist?.name}</p>
                </div>
                <button
                  onClick={() => onRemove(song._uniqueKey || song.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition flex-shrink-0"
                  title="Remove from queue"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Suggested / Autoplay Section */}
        {(suggestions.length > 0 || loading) && (
          <div className="mt-4 pb-6 border-t border-neutral-800/50">
            <div className="px-4 py-3">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Suggested for you
              </h3>
            </div>
            
            {loading ? (
              <div className="flex justify-center p-4">
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {suggestions.map((song, idx) => (
                  <div
                    key={`sug-${song.id}-${idx}`}
                    className="flex items-center gap-2 p-2 rounded hover:bg-white/5 group"
                  >
                    <div className="relative w-9 h-9 rounded flex-shrink-0 overflow-hidden bg-neutral-800">
                      <img referrerPolicy="no-referrer"
                        src={resolveCover(song.album?.cover_small || song.album?.cover_medium, song.title || song.id)}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={coverError(song.title || song.id)}
                      />
                      <div 
                        onClick={() => handlePlaySuggestion(song)}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{song.title}</p>
                      <p className="text-xs text-gray-400 truncate">{song.artist?.name}</p>
                    </div>
                    
                    <button
                      onClick={() => handleAddSuggestion(song)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-green-400 hover:bg-green-400/10 rounded-full transition-all flex-shrink-0"
                      title="Add to queue"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {queue.length === 0 && !loading && suggestions.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-10 px-4">
            Queue is empty. Find a song and hit <span className="text-green-400 font-bold">+</span> to add it for everyone.
          </div>
        )}
      </div>
    </div>
  );
}
