// src/components/MusicCards.jsx

export default function MusicCards({ songs, onPlay }) {
  return (
    <div className="flex flex-wrap gap-6 p-2">
      {songs.map((song) => (
        <div
          key={song._uniqueKey || song.id + "-" + song.title_short}
          className="relative group p-1 w-60 h-72 hover:bg-[#1e1e1e] flex flex-col items-start px-2 py-5 rounded-md truncate"
        >
          <img
            src={song.album.cover_medium}
            alt={song.title}
            className="w-52 h-64 rounded-lg object-cover group-hover:blur-[2px] transition m-auto"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <button
              className="bg-green-500 p-2 rounded-full"
              onClick={() => onPlay(song)}
            >
              <img src="/play.png" alt="play" className="w-6 h-6" />
            </button>
          </div>
          <div className="ml-2">
            <p className="text-white text-sm font-medium truncate mt-2 w-52">
              {song.title}
            </p>
            <p className="text-gray-400 text-xs w-52 truncate">{song.artist.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
