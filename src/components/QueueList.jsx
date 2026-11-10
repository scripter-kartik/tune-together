"use client";
import { useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { X, ListMusic, PlusCircle, GripVertical, Play } from "lucide-react";
import { resolveCover, coverError } from "@/lib/coverPlaceholder";
import { getSocket } from "@/lib/socket";

function Bars({ playing }) {
  return (
    <span className="flex items-end gap-[2px] h-3.5" aria-hidden="true">
      {[0, 0.2, 0.4].map((d) => (
        <span
          key={d}
          className="w-[3px] rounded-full bg-green-400"
          style={
            playing
              ? { animation: `equalize 0.9s ease-in-out ${d}s infinite` }
              : { height: 4 }
          }
        />
      ))}
    </span>
  );
}

function Cover({ song, className = "" }) {
  return (
    <img
      referrerPolicy="no-referrer"
      src={resolveCover(song.album?.cover_small || song.album?.cover_medium, song.title || song.id)}
      alt=""
      loading="lazy"
      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-md flex-shrink-0 object-cover bg-neutral-800 ${className}`}
      onError={coverError(song.title || song.id)}
    />
  );
}

// True once the sync server has been unreachable for a few seconds.
function useSyncOffline() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const socket = getSocket();
    let timer = null;
    const check = () => {
      clearTimeout(timer);
      if (socket.connected) setOffline(false);
      else timer = setTimeout(() => setOffline(!socket.connected), 4000);
    };
    check();
    socket.on("connect", check);
    socket.on("disconnect", check);
    socket.on("connect_error", check);
    return () => {
      clearTimeout(timer);
      socket.off("connect", check);
      socket.off("disconnect", check);
      socket.off("connect_error", check);
    };
  }, []);
  return offline;
}

function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 pt-4 pb-2">
      <h3 className="text-sm font-bold text-white">{children}</h3>
      {action}
    </div>
  );
}

export default function QueueList({ queue = [], currentSong, isPlaying, onRemove, onClear }) {
  const offline = useSyncOffline();
  const [fetched, setFetched] = useState([]);
  const [loading, setLoading] = useState(false);
  // Local copy so a drag-reorder shows instantly instead of snapping back
  // until the server's sync-queue echo arrives.
  const [items, setItems] = useState(queue);
  useEffect(() => setItems(queue), [queue]);

  useEffect(() => {
    if (!currentSong?.artist?.name) {
      setFetched([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(currentSong.artist.name)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.songs) {
          const shuffled = [...data.songs].sort(() => 0.5 - Math.random()).slice(0, 12);
          setFetched(shuffled);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentSong?.artist?.name]);

  const suggestions = useMemo(() => {
    const taken = new Set(items.map((s) => String(s.id)));
    if (currentSong) taken.add(String(currentSong.id));
    return fetched.filter((s) => !taken.has(String(s.id))).slice(0, 5);
  }, [fetched, items, currentSong?.id]);

  const handleAddSuggestion = (song) => {
    window.dispatchEvent(new CustomEvent("tt-queue-song", { detail: song }));
  };

  const handlePlayQueued = (song) => {
    window.dispatchEvent(new CustomEvent("tt-play-song", { detail: { song, fromQueue: true } }));
  };

  const handlePlaySuggestion = (song) => {
    window.dispatchEvent(new CustomEvent("tt-play-song", { detail: { song } }));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const fromIndex = result.source.index;
    const toIndex = result.destination.index;
    if (fromIndex === toIndex) return;
    setItems((cur) => {
      const next = [...cur];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    window.dispatchEvent(
      new CustomEvent("tt-reorder-queue", { detail: { fromIndex, toIndex } })
    );
  };

  const isEmpty = !currentSong && items.length === 0 && !loading && suggestions.length === 0;

  if (isEmpty) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8 pb-10">
        <div className="w-16 h-16 rounded-full bg-white/[0.06] flex items-center justify-center mb-4">
          <ListMusic className="w-7 h-7 text-neutral-400" />
        </div>
        <p className="text-white font-bold text-base">Your queue is empty</p>
        <p className="text-neutral-400 text-sm mt-1.5 max-w-[240px]">
          Add songs with <span className="text-green-400 font-semibold">+</span> and they&apos;ll play for everyone in the room.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 sm:px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      {offline && (
        <div role="status" className="mx-2 mt-2 flex items-start gap-2 rounded-md bg-white/[0.06] px-3 py-2 text-xs text-neutral-300">
          <span className="mt-1 w-2 h-2 flex-shrink-0 rounded-full bg-amber-400 animate-pulse" />
          <span>Can&apos;t reach the sync server. Your queue works on this device but won&apos;t sync with others until it reconnects.</span>
        </div>
      )}
      {currentSong && (
        <section>
          <SectionTitle>Now playing</SectionTitle>
          <div className="flex items-center gap-3 p-2 rounded-md bg-white/[0.04]">
            <div className="relative flex-shrink-0">
              <Cover song={currentSong} />
              <span className="absolute inset-0 rounded-md bg-black/45 flex items-center justify-center">
                <Bars playing={isPlaying} />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-green-400 truncate">{currentSong.title}</p>
              <p className="text-[13px] text-neutral-400 truncate">{currentSong.artist?.name}</p>
            </div>
          </div>
        </section>
      )}

      <section>
        <SectionTitle
          action={
            items.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="h-7 px-3 rounded-full text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/[0.08] border border-white/15 transition touch-manipulation"
              >
                Clear queue
              </button>
            )
          }
        >
          Next in queue
        </SectionTitle>

        {items.length === 0 ? (
          <p className="px-2 pb-2 text-[13px] text-neutral-500">
            Nothing queued yet. Tap <span className="text-green-400 font-semibold">+</span> on any song.
          </p>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="queue">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col">
                  {items.map((song, idx) => (
                    <Draggable
                      key={song._uniqueKey || `${song.id}-${idx}`}
                      draggableId={song._uniqueKey || `${song.id}-${idx}`}
                      index={idx}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          onDoubleClick={() => handlePlayQueued(song)}
                          className={`group flex items-center gap-1 sm:gap-2 py-1.5 pl-0.5 pr-1 rounded-md transition-colors ${
                            snapshot.isDragging
                              ? "bg-[#2a2a2a] shadow-2xl shadow-black/60"
                              : "hover:bg-white/[0.07]"
                          }`}
                        >
                          <div
                            {...provided.dragHandleProps}
                            aria-label={`Reorder ${song.title}`}
                            className="tt-reveal w-6 h-9 flex items-center justify-center text-neutral-500 hover:text-white cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePlayQueued(song)}
                            aria-label={`Play ${song.title} now`}
                            title="Play now"
                            className="relative flex-shrink-0 rounded-md overflow-hidden"
                          >
                            <Cover song={song} />
                            <span className="tt-reveal absolute inset-0 bg-black/55 flex items-center justify-center [@media(hover:none)]:hidden">
                              <Play className="w-4 h-4 text-white fill-white" />
                            </span>
                          </button>
                          <div className="flex-1 min-w-0 pl-1.5 cursor-default">
                            <p className="text-[15px] text-white truncate">{song.title}</p>
                            <p className="text-[13px] text-neutral-400 truncate">{song.artist?.name}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemove(song._uniqueKey || song.id)}
                            className="tt-reveal w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition flex-shrink-0 touch-manipulation"
                            aria-label={`Remove ${song.title} from queue`}
                            title="Remove from queue"
                          >
                            <X className="w-[18px] h-[18px]" />
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
      </section>

      {(suggestions.length > 0 || loading) && (
        <section className="mt-2">
          <SectionTitle>Suggested for you</SectionTitle>
          {loading ? (
            <div className="flex flex-col gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-md bg-white/[0.06] animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-white/[0.06] animate-pulse" />
                    <div className="h-2.5 w-1/2 rounded bg-white/[0.06] animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col">
              {suggestions.map((song, idx) => (
                <div
                  key={`sug-${song.id}-${idx}`}
                  className="group flex items-center gap-3 p-2 pr-1 rounded-md hover:bg-white/[0.07] cursor-pointer transition-colors"
                  onClick={() => handlePlaySuggestion(song)}
                >
                  <Cover song={song} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] text-white truncate">{song.title}</p>
                    <p className="text-[13px] text-neutral-400 truncate">{song.artist?.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleAddSuggestion(song); }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-green-400 hover:scale-105 transition flex-shrink-0 touch-manipulation"
                    aria-label={`Add ${song.title} to queue`}
                    title="Add to queue"
                  >
                    <PlusCircle className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
