

export function onlineStatusFrom(lastActive) {
  const minutes = (Date.now() - new Date(lastActive || 0).getTime()) / 60000;
  if (minutes < 5) return "online";
  if (minutes < 30) return "idle";
  return "offline";
}


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
