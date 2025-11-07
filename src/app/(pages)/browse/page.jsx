// src/app/browse/page.jsx

"use client";

import { useState } from "react";
import Header from "../../../components/Header";
import BrowseGrid from "../../../components/BrowseGrid";
import CategoryCard from "../../../components/CategoryCard";

export default function BrowsePage() {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (query.trim() !== "") {
      // Update the URL and trigger the parent page's search
      window.location.href = `/?q=${encodeURIComponent(query)}`;
    }
  };

  // Browse categories with vibrant colors
  const categories = [
    { id: 1, name: "Pop", color: "from-pink-500 to-pink-700", query: "pop" },
    { id: 2, name: "Hip-Hop", color: "from-purple-500 to-purple-700", query: "hip hop" },
    { id: 3, name: "Rock", color: "from-red-500 to-red-700", query: "rock" },
    { id: 4, name: "Electronic", color: "from-blue-500 to-blue-700", query: "electronic" },
    { id: 5, name: "R&B", color: "from-yellow-500 to-yellow-700", query: "rnb" },
    { id: 6, name: "Jazz", color: "from-indigo-500 to-indigo-700", query: "jazz" },
    { id: 7, name: "Classical", color: "from-teal-500 to-teal-700", query: "classical" },
    { id: 8, name: "Country", color: "from-orange-500 to-orange-700", query: "country" },
    { id: 9, name: "Latin", color: "from-rose-500 to-rose-700", query: "latin" },
    { id: 10, name: "Indie", color: "from-cyan-500 to-cyan-700", query: "indie" },
    { id: 11, name: "Metal", color: "from-gray-600 to-gray-800", query: "metal" },
    { id: 12, name: "Reggae", color: "from-green-500 to-green-700", query: "reggae" },
    { id: 13, name: "Blues", color: "from-blue-600 to-blue-800", query: "blues" },
    { id: 14, name: "Soul", color: "from-amber-500 to-amber-700", query: "soul" },
    { id: 15, name: "Funk", color: "from-fuchsia-500 to-fuchsia-700", query: "funk" },
    { id: 16, name: "Disco", color: "from-violet-500 to-violet-700", query: "disco" },
  ];

  const moods = [
    { id: 17, name: "Chill Vibes", color: "from-emerald-400 to-teal-600", query: "chill" },
    { id: 18, name: "Happy", color: "from-yellow-400 to-orange-500", query: "happy" },
    { id: 19, name: "Sad", color: "from-blue-400 to-indigo-600", query: "sad" },
    { id: 20, name: "Energetic", color: "from-red-400 to-pink-600", query: "energetic" },
    { id: 21, name: "Romantic", color: "from-rose-400 to-red-600", query: "romantic" },
    { id: 22, name: "Focus", color: "from-slate-400 to-slate-600", query: "focus" },
    { id: 23, name: "Party", color: "from-purple-400 to-pink-600", query: "party" },
    { id: 24, name: "Workout", color: "from-orange-400 to-red-600", query: "workout" },
  ];

  const activities = [
    { id: 25, name: "Study", color: "from-blue-300 to-purple-500", query: "study" },
    { id: 26, name: "Sleep", color: "from-indigo-300 to-blue-500", query: "sleep" },
    { id: 27, name: "Driving", color: "from-gray-400 to-gray-600", query: "driving" },
    { id: 28, name: "Cooking", color: "from-amber-400 to-orange-600", query: "cooking" },
    { id: 29, name: "Gaming", color: "from-cyan-400 to-blue-600", query: "gaming" },
    { id: 30, name: "Travel", color: "from-teal-400 to-green-600", query: "travel" },
    { id: 31, name: "Meditation", color: "from-purple-300 to-indigo-500", query: "meditation" },
    { id: 32, name: "Running", color: "from-green-400 to-emerald-600", query: "running" },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      <Header query={query} setQuery={setQuery} handleSearch={handleSearch} />
      
      <div className="flex-1 overflow-y-auto scrollbar-none bg-gradient-to-b from-[#121212] to-black px-6 py-6 my-3 rounded-sm pb-32">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Browse All</h1>
          <p className="text-gray-400 text-sm">Explore music by genre, mood, and activity</p>
        </div>

        {/* Genres Section */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-4">Genres</h2>
          <BrowseGrid>
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                name={category.name}
                color={category.color}
                query={category.query}
              />
            ))}
          </BrowseGrid>
        </section>

        {/* Moods Section */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-4">Moods</h2>
          <BrowseGrid>
            {moods.map((mood) => (
              <CategoryCard
                key={mood.id}
                name={mood.name}
                color={mood.color}
                query={mood.query}
              />
            ))}
          </BrowseGrid>
        </section>

        {/* Activities Section */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-4">Activities</h2>
          <BrowseGrid>
            {activities.map((activity) => (
              <CategoryCard
                key={activity.id}
                name={activity.name}
                color={activity.color}
                query={activity.query}
              />
            ))}
          </BrowseGrid>
        </section>
      </div>
    </div>
  );
}