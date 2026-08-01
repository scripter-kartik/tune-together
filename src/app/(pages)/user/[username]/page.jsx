"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Music2,
  Users,
  Clock,
  Headphones,
  ListMusic,
  Disc3,
  Share2,
  Check,
} from "lucide-react";
import Header from "../../../../components/Header";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0][0];
}

function timeAgo(date) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatusDot({ status }) {
  const color =
    status === "online" ? "bg-green-500" : status === "idle" ? "bg-amber-400" : "bg-neutral-600";
  return <span className={`w-2.5 h-2.5 rounded-full ${color}`} />;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    fetch(`/api/profile?username=${encodeURIComponent(username || "")}`)
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (!res.success) {
          setError(res.error || "User not found");
        } else {
          setData(res);
        }
      })
      .catch(() => !cancelled && setError("Could not load this profile"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [username]);

  const shareProfile = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: data.profile.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-0 h-full flex flex-col">
      <Header />
      <div className="flex-1 overflow-y-auto scrollbar bg-[#121212]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          {/* Back */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-neutral-400 hover:text-white text-sm font-medium transition-colors mb-5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to music
          </button>

          {loading && (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-neutral-700 border-t-green-500 rounded-full animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-neutral-500">
              <Disc3 className="w-12 h-12" />
              <p className="text-lg font-semibold">Profile not found</p>
              <p className="text-sm">{error}</p>
              <Link href="/" className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors">
                Go home
              </Link>
            </div>
          )}

          {data && (
            <>
              {/* Profile header */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 mb-8">
                <div className="relative flex-shrink-0">
                  {data.profile.imageUrl ? (
                    <img referrerPolicy="no-referrer"
                      src={data.profile.imageUrl}
                      alt={data.profile.name}
                      className="w-36 h-36 sm:w-44 sm:h-44 rounded-full object-cover shadow-2xl ring-4 ring-white/10"
                    />
                  ) : (
                    <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-green-500 to-indigo-600 flex items-center justify-center text-6xl font-black text-white shadow-2xl">
                      {getInitials(data.profile.name)}
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[#121212] flex items-center justify-center">
                    <StatusDot status={data.profile.onlineStatus} />
                  </span>
                </div>

                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-1">
                    <Headphones className="w-3.5 h-3.5" /> Profile
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-black text-white mb-1 truncate">
                    {data.profile.name}
                  </h1>
                  <p className="text-neutral-400 text-sm mb-3">
                    @{data.profile.username || "no username"}
                    <span className="mx-2 text-neutral-600">•</span>
                    {data.stats.totalPlays > 0
                      ? `${data.stats.totalPlays} plays`
                      : "New listener"}
                  </p>

                  <div className="flex items-center justify-center sm:justify-start gap-4 text-neutral-300 text-sm mb-4">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-neutral-500" />
                      <b className="text-white">{data.counts.followers}</b> followers
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-neutral-500" />
                      <b className="text-white">{data.counts.following}</b> following
                    </span>
                    {data.profile.currentlyPlaying && (
                      <span className="flex items-center gap-1.5 text-green-400">
                        <Music2 className="w-4 h-4" />
                        <span className="truncate max-w-[160px]">
                          Listening to {data.profile.currentlyPlaying.songTitle}
                        </span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={shareProfile}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-green-500 hover:bg-green-400 text-black text-sm font-bold transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    {copied ? "Copied!" : "Share profile"}
                  </button>
                </div>
              </div>

              {/* Top artists */}
              {data.stats.topArtists.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-xl font-bold text-white mb-4">Top artists</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {data.stats.topArtists.map((artist, i) => (
                      <div key={artist.id || artist.name} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="relative flex-shrink-0">
                          {artist.image ? (
                            <img referrerPolicy="no-referrer"
                              src={artist.image}
                              alt={artist.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center">
                              <Disc3 className="w-5 h-5 text-neutral-500" />
                            </div>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 text-black text-[9px] font-bold rounded-full flex items-center justify-center">
                            {i + 1}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{artist.name}</p>
                          <p className="text-neutral-500 text-xs">
                            {artist.count} {artist.count === 1 ? "play" : "plays"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Playlists */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4">Playlists</h2>
                {data.playlists.length === 0 ? (
                  <p className="text-neutral-500 text-sm">No public playlists yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {data.playlists.map((pl) => (
                      <Link
                        key={pl.id}
                        href={`/playlist/${pl.id}`}
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                      >
                        <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-neutral-700 to-neutral-900 mb-2 overflow-hidden flex items-center justify-center">
                          {pl.image ? (
                            <img referrerPolicy="no-referrer"
                              src={pl.image}
                              alt={pl.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ListMusic className="w-8 h-8 text-neutral-500" />
                          )}
                        </div>
                        <p className="text-white text-sm font-semibold truncate group-hover:text-green-400 transition-colors">
                          {pl.name}
                        </p>
                        <p className="text-neutral-500 text-xs truncate">
                          {pl.songCount} songs
                          {pl.isCollaborative && (
                            <span className="ml-1 text-green-400 flex items-center gap-0.5">
                              <Users className="w-3 h-3 inline" /> collaborative
                            </span>
                          )}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* Recently played */}
              {data.stats.recentSongs.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-xl font-bold text-white mb-4">Recently played</h2>
                  <div className="flex flex-col">
                    {data.stats.recentSongs.map((song) => (
                      <div key={song.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <img referrerPolicy="no-referrer"
                          src={song.album.cover_medium}
                          alt={song.title}
                          className="w-11 h-11 rounded object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{song.title}</p>
                          <p className="text-neutral-500 text-xs truncate">{song.artist.name}</p>
                        </div>
                        <span className="text-neutral-500 text-xs flex-shrink-0">
                          {timeAgo(song.playedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
