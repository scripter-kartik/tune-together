import Link from "next/link";

export default function Header({ query, setQuery, handleSearch }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };
  return (
    <div className="flex items-center mt-3 px-5">
      <img src="/spotify.png" alt="" />
      <div className="flex justify-center items-center ml-160">
        <Link href="/">
          {" "}
          <div className="bg-[#1e1e1e] w-12 h-12 rounded-full flex justify-center items-center p-2">
            <img className="w-7 h-7" src="/home.png" alt="" />
          </div>
        </Link>
        <div className="bg-[#1e1e1e] flex items-center w-115 rounded-full px-3 py-5 h-12 mr-50 ml-5">
          <img className="w-7 h-7 mr-3" src="/search.png" alt="" />
          <input
            type="text"
            placeholder="What do you want to play?"
            className="text-white outline-none border-0 w-90"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <img className="w-5 h-7" src="/line.png" alt="" />
          <img className="w-7 h-7 ml-2" src="/browse.png" alt="" />
        </div>
        <div className="bg-white rounded-full px-3 w-40 h-8 flex justify-center items-center">
          <h1 className="font-extrabold text-[15px]">Explore Premium</h1>
        </div>
        <div className="flex justify-between items-center">
          <img className="w-5 h-5 ml-5 mr-3" src="/download.png" alt="" />
          <h1 className="text-white text-[15px]">Install App</h1>
        </div>
        <div className="flex justify-center items-center gap-8 ml-10">
          <img className="w-5 h-5" src="/notification.png" alt="" />
          <img className="w-5 h-5" src="/friends.png" alt="" />
          <div className="w-8 h-8 bg-green-400 rounded-full flex justify-center items-center shadow-2xl">
            <h1 className="font-bold">K</h1>
          </div>
        </div>
      </div>
    </div>
  );
}
