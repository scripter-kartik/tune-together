"use client";

import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { getSocket } from '@/lib/socket';

export function useChat() {
  const { user } = useUser();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    socketRef.current = socket;

    socket.emit('register-user', user.id);

    const handleReceiveDM = (data) => {
      // Check if it's an invite link
      const isInvite = data.message?.includes('?room=');
      if (isInvite) {
        window.dispatchEvent(new CustomEvent('tt-invite', { detail: data }));
      }
    };

    socket.on('receive-dm', handleReceiveDM);

    return () => {
      socket.off('receive-dm', handleReceiveDM);
    };
  }, [user]);

  return socketRef;
}