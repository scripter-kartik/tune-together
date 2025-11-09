// src/hooks/useActivityTracker.js

import { useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

// Hook to track user activity
export function useActivityTracker(currentSong = null) {
  const { isSignedIn } = useUser();
  const lastUpdateRef = useRef(0);
  const UPDATE_INTERVAL = 60000; // Update every 60 seconds

  const updateActivity = useCallback(async (songData = null) => {
    if (!isSignedIn) return;

    const now = Date.now();
    // Throttle updates to avoid excessive API calls
    if (now - lastUpdateRef.current < UPDATE_INTERVAL) return;
    
    lastUpdateRef.current = now;

    try {
      const body = {
        status: 'online',
      };

      // Add currently playing song if available
      if (songData) {
        body.currentlyPlaying = {
          songId: songData.id,
          songTitle: songData.title,
          artist: songData.artist?.name,
          albumArt: songData.album?.cover_small,
          startedAt: new Date(),
        };
      }

      await fetch('/api/users/update-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  }, [isSignedIn]);

  // Update activity on mount and when song changes
  useEffect(() => {
    if (!isSignedIn) return;

    updateActivity(currentSong);

    // Set up periodic updates
    const interval = setInterval(() => {
      updateActivity(currentSong);
    }, UPDATE_INTERVAL);

    // Update on user interaction
    const handleInteraction = () => {
      updateActivity(currentSong);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [isSignedIn, currentSong, updateActivity]);

  return { updateActivity };
}

// Separate hook for updating "now playing" status
export function useUpdateNowPlaying() {
  const { isSignedIn } = useUser();

  const updateNowPlaying = useCallback(async (songData) => {
    if (!isSignedIn) return;

    try {
      const body = {
        status: 'online',
      };

      // Add currently playing song if available
      if (songData) {
        body.currentlyPlaying = {
          songId: songData.id,
          songTitle: songData.title,
          artist: songData.artist?.name,
          albumArt: songData.album?.cover_small || songData.album?.cover_medium,
          startedAt: new Date(),
        };
      } else {
        // Clear currently playing
        body.currentlyPlaying = null;
      }

      await fetch('/api/users/update-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error('Failed to update now playing:', error);
    }
  }, [isSignedIn]);

  const clearNowPlaying = useCallback(async () => {
    if (!isSignedIn) return;

    try {
      await fetch('/api/users/update-activity', {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to clear now playing:', error);
    }
  }, [isSignedIn]);

  return { updateNowPlaying, clearNowPlaying };
}