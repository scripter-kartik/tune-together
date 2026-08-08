"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Music4,
  Play,
  Github,
  Twitter,
  Instagram,
  Facebook,
  Youtube,
  Mail,
  Heart,
  Headphones,
} from "lucide-react";
import { resolveCover } from "@/lib/coverPlaceholder";

const columns = [
  {
    title: "Explore",
    links: [
      { label: "Home", href: "/" },
      { label: "Browse", href: "/browse" },
      { label: "Your Library", href: "/" },
      { label: "Search", href: "/" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press", href: "#" },
      { label: "Brand", href: "#" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
];

const socials = [
  { label: "Twitter", href: "#", Icon: Twitter },
  { label: "Instagram", href: "#", Icon: Instagram },
  { label: "Facebook", href: "#", Icon: Facebook },
  { label: "Youtube", href: "#", Icon: Youtube },
  { label: "Github", href: "#", Icon: Github },
];

export default function Footer() {
  const year = new Date().getFullYear();
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const onGlobalState = (e) => {
      const { currentSong: gSong, isPlaying: gIsPlaying } = e.detail;
      if (gSong !== undefined) setCurrentSong(gSong);
      if (gIsPlaying !== undefined) setIsPlaying(gIsPlaying);
    };
    window.addEventListener("tt-global-state", onGlobalState);
    window.dispatchEvent(new CustomEvent("tt-request-global-state"));
    return () => window.removeEventListener("tt-global-state", onGlobalState);
  }, []);

  const cover = currentSong
    ? resolveCover(
        currentSong.album?.cover_medium || currentSong.album?.cover_small,
        currentSong.title || currentSong.id
      )
    : null;

  return (
    <footer className="mt-10 border-t border-[var(--tt-divider)] bg-gradient-to-b from-transparent to-black/60 relative">
      {/* Top accent hairline */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--tt-accent)]/40 to-transparent" />

      <div className="px-6 sm:px-8 py-10 sm:py-12 max-w-7xl mx-auto">
        {/* ─── Now Playing Card ─── */}
        <div className="relative mb-10 rounded-xl overflow-hidden">
          {/* Subtle radial glow behind card */}
          <div
            className="absolute -top-8 left-1/2 -translate-x-1/2 w-80 h-20 rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, var(--tt-accent), transparent 70%)",
            }}
          />

          <div className="relative bg-white/[0.03] border border-[var(--tt-divider)] rounded-xl p-5 sm:p-6">
            {/* Accent hairline on card top */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--tt-accent)]/30 to-transparent rounded-t-xl" />

            <div className="flex items-center gap-4 sm:gap-5">
              {/* Album art / placeholder */}
              {cover ? (
                <div className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shadow-lg shadow-black/40">
                  <img
                    src={cover}
                    alt={currentSong.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {/* Playing indicator overlay */}
                  {isPlaying && (
                    <div className="absolute inset-0 bg-black/30 flex items-end justify-center gap-[2px] pb-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span
                          key={i}
                          className="w-[2.5px] bg-green-400 rounded-full"
                          style={{
                            height: `${30 + Math.random() * 50}%`,
                            animation: `visualizer-bar ${0.5 + i * 0.15}s ease-in-out infinite alternate`,
                            animationDelay: `${i * 0.07}s`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gradient-to-br from-[#2a2a2a] to-[#1e1e1e] border border-[var(--tt-border)] flex items-center justify-center">
                  <Music4 className="w-7 h-7 sm:w-8 sm:h-8 text-green-500/60" />
                </div>
              )}

              {/* Song info */}
              <div className="flex-1 min-w-0">
                {currentSong ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      {isPlaying && (
                        <div className="flex items-end gap-[2px] h-3 flex-shrink-0">
                          {[1, 2, 3].map((i) => (
                            <span
                              key={i}
                              className="w-[2px] bg-green-400 rounded-full"
                              style={{
                                animation: `visualizer-bar ${0.4 + i * 0.15}s ease-in-out infinite alternate`,
                                animationDelay: `${i * 0.1}s`,
                                height: "100%",
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-green-400">
                        {isPlaying ? "Now Playing" : "Last Played"}
                      </span>
                    </div>
                    <p className="text-white text-sm sm:text-base font-semibold truncate">
                      {currentSong.title}
                    </p>
                    <p className="text-neutral-400 text-xs sm:text-sm truncate mt-0.5">
                      {currentSong.artist?.name || "Unknown Artist"}
                    </p>
                  </>
                ) : (
                  <p className="text-neutral-400 text-sm sm:text-base truncate">
                    No song playing — start listening to see it here
                  </p>
                )}
              </div>

              {/* Play indicator / decorative */}
              <div className="flex-shrink-0 hidden sm:flex items-center gap-2 text-neutral-600">
                {currentSong && isPlaying ? (
                  <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <div className="flex items-end gap-[2px] h-4">
                      {[1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className="w-[2.5px] bg-green-400 rounded-full"
                          style={{
                            animation: `visualizer-bar ${0.4 + i * 0.15}s ease-in-out infinite alternate`,
                            animationDelay: `${i * 0.1}s`,
                            height: "100%",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : currentSong ? (
                  <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-[var(--tt-border)] flex items-center justify-center">
                    <Play className="w-4 h-4 text-neutral-400 ml-0.5" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-[var(--tt-border)] flex items-center justify-center">
                    <Music4 className="w-4 h-4 text-neutral-500" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Brand + Link Columns ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6">
          {/* Brand block */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Headphones className="w-6 h-6 text-green-500" />
              <span className="font-black text-xl tracking-tight text-white">
                tune<span className="text-green-500">together</span>
              </span>
            </Link>
            <p className="text-neutral-400 text-sm mt-3 max-w-xs leading-relaxed">
              Listen together. Share a queue, chat in real time, and keep the
              vibe going with friends — anywhere.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-2 mt-5">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  title={label}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 hover:text-green-400 text-neutral-400 flex items-center justify-center transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-white font-bold text-sm tracking-wide uppercase mb-3">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-neutral-400 hover:text-white text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-[var(--tt-divider)] my-8" />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-neutral-500 text-sm">
            <span>© {year} Tune Together</span>
            <span className="hidden sm:inline text-neutral-700">•</span>
            <span className="flex items-center gap-1.5">
              Made with{" "}
              <Heart className="w-3.5 h-3.5 text-green-500 fill-green-500" />{" "}
              for music lovers
            </span>
          </div>

          <div className="flex items-center gap-5 text-neutral-500 text-sm">
            <Link href="#" className="hover:text-white transition-colors">
              Legal
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Privacy Center
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Cookies
            </Link>
          </div>
        </div>

        {/* Contact strip */}
        <div className="mt-6 flex items-center justify-center gap-2 text-neutral-600 text-xs">
          <Mail className="w-3.5 h-3.5" />
          <span>hello@tunetogether.app</span>
        </div>
      </div>
    </footer>
  );
}
