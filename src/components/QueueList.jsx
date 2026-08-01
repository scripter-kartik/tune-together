"use client";
import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { X, ListMusic, Trash2, Plus, Play, GripVertical } from "lucide-react";
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
          const queueIds = new Set(queue.map((s) => String(s.id)));
          const currentId = String(currentSong.id);
          const filtered = data.songs.filter(
            (s) => String(s.id) !== currentId && !queueIds.has(String(s.id))
          );
          const shuffled = filtered.sort(() => 0.5 - Math.random()).slice(0, 5);
          setSuggestions(shuffled);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentSong?.artist?.name, queue.length]);

  const handleAddSuggestion = (song) => {
    window.dispatchEvent(new CustomEvent("tt-queue-song", { detail: song }));
  };

  const handlePlaySuggestion = (song) => {
    window.dispatchEvent(new CustomEvent("tt-play-song", { detail: { song } }));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const fromIndex = result.source.index;
    const toIndex = result.destination.index;
    if (fromIndex === toIndex) return;
    window.dispatchEvent(
      new CustomEvent("tt-reorder-queue", { detail: { fromIndex, toIndex } })
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[#121212] min-h-0">
      <div className="flex items-center justify-between p-3 border-b border-[var(--tt-divider)] flex-shrink-0">
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
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="queue">
              {(provided) => (
                <div
                  className="p-2 space-y-1"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {queue.map((song, idx) => (
                    <Draggable
                      key={song._uniqueKey || `${song.id}-${idx}`}
                      draggableId={song._uniqueKey || `${song.id}-${idx}`}
                      index={idx}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-2 p-2 rounded group transition-colors ${
                            snapshot.isDragging
                              ? "bg-white/10 shadow-lg shadow-black/40"
                              : "hover:bg-white/5"
                          }`}
                        >
                          {/* Drag handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="hidden md:block md:opacity-0 md:group-hover:opacity-100 text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0 transition-opacity"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs text-gray-500 w-4 text-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <img
                            referrerPolicy="no-referrer"
                            src={resolveCover(
                              song.album?.cover_small || song.album?.cover_medium,
                              song.title || song.id
                            )}
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
                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-gray-400 hover:text-red-400 active:text-red-400 transition flex-shrink-0"
                            title="Remove from queue"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {/* Suggested / Autoplay Section */}
        {(suggestions.length > 0 || loading) && (
          <div className="mt-4 pb-6 border-t border-[var(--tt-divider)]/50">
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
                    className="flex items-center gap-2 p-2 rounded hover:bg-white/5 group cursor-pointer"
                    onClick={() => handlePlaySuggestion(song)}
                  >
                    <div className="relative w-9 h-9 rounded flex-shrink-0 overflow-hidden bg-neutral-800">
                      <img
                        referrerPolicy="no-referrer"
                        src={resolveCover(
                          song.album?.cover_small || song.album?.cover_medium,
                          song.title || song.id
                        )}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={coverError(song.title || song.id)}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{song.title}</p>
                      <p className="text-xs text-gray-400 truncate">{song.artist?.name}</p>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleAddSuggestion(song); }}
                      className="opacity-100 p-1.5 text-neutral-400 hover:text-green-400 active:text-green-400 hover:bg-green-400/10 rounded-full transition-all flex-shrink-0"
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
            Queue is empty. Find a song and hit{" "}
            <span className="text-green-400 font-bold">+</span> to add it for everyone.
          </div>
        )}
      </div>
    </div>
  );
}
