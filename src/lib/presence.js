// Derive a coarse online status from a user's last-active timestamp — the same
// thresholds the active-users endpoint uses, kept in one place.
export function onlineStatusFrom(lastActive) {
  const minutes = (Date.now() - new Date(lastActive || 0).getTime()) / 60000;
  if (minutes < 5) return "online";
  if (minutes < 30) return "idle";
  return "offline";
}

// Shape a User document into the compact profile the friends UI consumes.
export function toPublicProfile(user) {
  return {
    clerkId: user.clerkId,
    name: user.name,
    username: user.username || null,
    imageUrl: user.imageUrl || null,
    onlineStatus: onlineStatusFrom(user.lastActive),
    currentlyPlaying: user.currentlyPlaying?.songTitle
      ? {
          songTitle: user.currentlyPlaying.songTitle,
          artist: user.currentlyPlaying.artist,
          albumArt: user.currentlyPlaying.albumArt,
        }
      : null,
  };
}
