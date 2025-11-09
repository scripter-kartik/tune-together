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

    return () => {
    };
  }, [user]);

  return socketRef;
}