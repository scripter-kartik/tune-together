export default function MusicCards({ songs, onPlay }) {
  return (
    <div className="flex flex-wrap justify-center gap-4 p-2">
      {songs.map((song) => (
        <div
          key={song._uniqueKey || song.id + "-" + song.title_short}
          className="
            relative group 
            p-2 
            bg-[#1c1b1b] hover:bg-[#1e1e1e] 
            rounded-md 
            flex flex-col items-start 
            truncate
            w-40 h-60               /* mobile */
            md:w-48 md:h-64  
            lg:w-[260px] lg:h-72
            xl:w-[230px] xl:h-72   
            2xl:w-[245px] 2xl:h-72        
          "
        >
          <img
            src={song.album.cover_medium}
            alt={song.title}
            className="
              object-cover rounded-lg m-auto 
              w-full h-40
              md:h-48
              lg:h-56
              group-hover:blur-[2px] transition
            "
          />

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <button
              className="bg-green-500 p-2 rounded-full"
              onClick={() => onPlay(song)}
            >
              <img src="/play.png" alt="play" className="w-6 h-6" />
            </button>
          </div>

          <div className="mt-2 w-full px-1">
            <p className="text-white text-sm font-medium truncate">
              {song.title}
            </p>
            <p className="text-gray-400 text-xs truncate">
              {song.artist.name}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
