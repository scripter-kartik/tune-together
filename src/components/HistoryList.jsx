"use client";
import { Play, Clock3 } from "lucide-react";
import { resolveCover, coverError } from "@/lib/coverPlaceholder";

export default function HistoryList({ history = [], onPlay }) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-6 animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
          <Clock3 className="w-8 h-8 text-neutral-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-1">No history yet</h3>
          <p className="text-neutral-400 text-sm">Songs you play will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto scrollbar pb-24">
      <div className="p-4 flex flex-col gap-2">
        <h3 className="text-white font-bold mb-2 px-2">Recently Played</h3>
        {history.map((song, index) => (
          <div
            key={`${song.id}-${index}`}
            className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            onClick={() => onPlay && onPlay(song)}
          >
            <div className="relative w-12 h-12 flex-shrink-0 rounded bg-neutral-800 overflow-hidden">
              <img
                src={resolveCover(song.album?.cover_small, song.title)}
                alt={song.title}
                onError={coverError(song.title)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate group-hover:text-green-400 transition-colors">
                {song.title}
              </p>
              <p className="text-neutral-400 text-xs truncate">
                {song.artist?.name || "Unknown Artist"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
