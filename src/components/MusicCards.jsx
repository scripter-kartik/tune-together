// src/components/MusicCards.jsx

export default function MusicCards({ songs, onPlay }) {
  return (
    <div className="flex flex-wrap gap-2 p-2">
      {songs.map((song) => (
        <div
          key={song._uniqueKey || song.id + "-" + song.title_short}
          className="relative group p-1 w-45 h-60 hover:bg-[#1e1e1e] flex flex-col rounded-md"
        >
          <img
            src={song.album.cover_medium}
            alt={song.title}
            className="w-40 h-40 rounded-lg object-cover group-hover:blur-[2px] transition m-auto"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <button
              className="bg-green-500 p-2 rounded-full"
              onClick={() => onPlay(song)}
            >
              <img src="/play.png" alt="play" className="w-4 h-4" />
            </button>
          </div>
          <div className="ml-2">
            <p className="text-white text-sm font-medium truncate mt-2">
              {song.title}
            </p>
            <p className="text-gray-400 text-xs truncate">{song.artist.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
