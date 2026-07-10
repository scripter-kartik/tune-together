"use client";
import { X, ListMusic, Trash2 } from "lucide-react";

export default function QueueList({ queue = [], onRemove, onClear }) {
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

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {queue.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-6 px-4">
            Queue is empty. Hover a song and hit <span className="text-green-400 font-bold">+</span> to add it for everyone.
          </div>
        ) : (
          queue.map((song, idx) => (
            <div
              key={`${song.id}-${idx}`}
              className="flex items-center gap-2 p-2 rounded hover:bg-white/5 group"
            >
              <span className="text-xs text-gray-500 w-4 text-center flex-shrink-0">
                {idx + 1}
              </span>
              <img
                src={song.album?.cover_small}
                alt=""
                className="w-9 h-9 rounded flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{song.title}</p>
                <p className="text-xs text-gray-400 truncate">{song.artist?.name}</p>
              </div>
              <button
                onClick={() => onRemove(song.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition flex-shrink-0"
                title="Remove from queue"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
