
"use client";

export default function CategoryCard({ name, color, query }) {
  const handleClick = () => {
    // Store the query and navigate to home page
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('browseQuery', query);
      window.location.href = '/';
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative overflow-hidden rounded-lg cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl group h-32`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${color}`} />
      
      <div className="relative h-full flex items-center justify-center p-4">
        <h3 className="text-white font-bold text-xl text-center z-10 drop-shadow-lg">
          {name}
        </h3>
      </div>

      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-black/20 rounded-full transform rotate-12 group-hover:scale-110 transition-transform duration-300" />
    </div>
  );
}