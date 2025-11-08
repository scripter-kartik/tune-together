// hooks/useActivityTracker.js

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

export function useActivityTracker() {
  const { isSignedIn } = useUser();

  useEffect(() => {
    if (!isSignedIn) return;

    // Update activity on mount
    const updateActivity = async () => {
      try {
        await fetch('/api/users/update-activity', {
          method: 'POST',
        });
      } catch (error) {
        console.error('Failed to update activity:', error);
      }
    };

    updateActivity();

    // Update activity every 5 minutes
    const interval = setInterval(updateActivity, 5 * 60 * 1000);

    // Update activity on user interaction
    const handleActivity = () => {
      updateActivity();
    };

    window.addEventListener('click', handleActivity);
    window.addEventListener('keypress', handleActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keypress', handleActivity);
    };
  }, [isSignedIn]);
}

// Hook to update currently playing song
export function useUpdateNowPlaying() {
  const updateNowPlaying = async (songData) => {
    try {
      await fetch('/api/users/update-activity', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(songData),
      });
    } catch (error) {
      console.error('Failed to update now playing:', error);
    }
  };

  return { updateNowPlaying };
}