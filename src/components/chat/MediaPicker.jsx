import { useState } from "react";
import { X, Image as ImageIcon, Smile } from "lucide-react";

const DUMMY_GIFS = [
  "https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif",
  "https://media.giphy.com/media/l41YkxvU8c7J7Bba0/giphy.gif",
  "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif",
  "https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/giphy.gif",
  "https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif",
];

const DUMMY_STICKERS = [
  "https://cdn-icons-png.flaticon.com/512/763/763788.png",
  "https://cdn-icons-png.flaticon.com/512/763/763789.png",
  "https://cdn-icons-png.flaticon.com/512/763/763790.png",
  "https://cdn-icons-png.flaticon.com/512/763/763791.png",
  "https://cdn-icons-png.flaticon.com/512/763/763793.png",
];

export default function MediaPicker({ onClose, onPickGif, onPickSticker }) {
  const [tab, setTab] = useState("gifs");

  return (
    <div className="absolute bottom-full mb-2 left-0 right-0 max-w-sm w-full bg-black/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50">
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex gap-4">
          <button
            onClick={() => setTab("gifs")}
            className={`text-sm font-semibold transition ${tab === "gifs" ? "text-white" : "text-neutral-500"}`}
          >
            GIFs
          </button>
          <button
            onClick={() => setTab("stickers")}
            className={`text-sm font-semibold transition ${tab === "stickers" ? "text-white" : "text-neutral-500"}`}
          >
            Stickers
          </button>
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-white transition">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-2 h-48 overflow-y-auto scrollbar">
        {tab === "gifs" ? (
          <div className="grid grid-cols-2 gap-2">
            {DUMMY_GIFS.map((url, i) => (
              <img
                key={i}
                src={url}
                onClick={() => onPickGif(url)}
                className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {DUMMY_STICKERS.map((url, i) => (
              <img
                key={i}
                src={url}
                onClick={() => onPickSticker(url)}
                className="w-full h-20 object-contain p-2 rounded-lg cursor-pointer hover:bg-white/10 transition"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
