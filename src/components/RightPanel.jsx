"use client";
import QueueList from "./QueueList";

export default function RightPanel({
  queue = [],
  onRemoveFromQueue,
  onClearQueue,
}) {
  return (
    <div className="w-full h-full flex flex-col bg-[#121212] overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-800 flex-shrink-0">
        <h2 className="text-white text-sm font-bold">
          Queue{queue.length > 0 ? ` (${queue.length})` : ""}
        </h2>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <QueueList
          queue={queue}
          onRemove={onRemoveFromQueue}
          onClear={onClearQueue}
        />
      </div>
    </div>
  );
}
