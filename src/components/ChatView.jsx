"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, ArrowLeft, MessageCircle, Circle, Music, Lock } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { getSocket } from '@/lib/socket';
import { ensureIdentityPublished, encryptDmTo, decryptDmRow } from '@/lib/e2eeClient';

export default function ChatView({ user, onClose }) {
  const { user: currentUser } = useUser();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  if (!user) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-transparent">
        <p className="text-gray-400">No user selected</p>
      </div>
    );
  }

  const getUserStatusDisplay = () => {
    if (user.currentlyPlaying?.songTitle) {
      return {
        text: `Playing: ${user.currentlyPlaying.songTitle}`,
        color: 'text-green-400',
        dotColor: 'bg-green-500',
        icon: <Music className="w-3 h-3" />
      };
    }
    
    if (user.onlineStatus === 'online') {
      return {
        text: 'Online',
        color: 'text-green-400',
        dotColor: 'bg-green-500',
        icon: <Circle className="w-3 h-3 fill-current" />
      };
    } else if (user.onlineStatus === 'idle') {
      return {
        text: `Active ${user.minutesSinceActive}m ago`,
        color: 'text-yellow-400',
        dotColor: 'bg-yellow-500',
        icon: <Circle className="w-3 h-3 fill-current" />
      };
    } else {
      return {
        text: 'Offline',
        color: 'text-gray-400',
        dotColor: 'bg-gray-500',
        icon: <Circle className="w-3 h-3 fill-current" />
      };
    }
  };

  const status = getUserStatusDisplay();

  useEffect(() => {
    if (!user?.clerkId) return;

    // Make sure this device's E2EE keys exist + are published before chatting.
    ensureIdentityPublished().catch((e) => console.error('E2EE setup failed:', e));

    fetchChatHistory();

    const socket = getSocket();
    socketRef.current = socket;

    const handleReceiveDM = async (data) => {
      if (data.senderId === user.clerkId) {
        const text = await decryptDmRow(currentUser?.id, user.clerkId, data);
        const newMessage = {
          id: Date.now(),
          text: text ?? "🔒 Can't decrypt — sent to another device's keys",
          sender: 'them',
          timestamp: new Date(data.timestamp || new Date()),
          senderName: data.senderName,
          senderImage: data.senderImage,
        };
        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();
      }
    };

    const handleUserTyping = (data) => {
      if (data.senderId === user.clerkId) {
        setIsTyping(data.isTyping);
        if (data.isTyping) {
          setTimeout(() => setIsTyping(false), 3000);
        }
      }
    };

    socket.on('receive-dm', handleReceiveDM);
    socket.on('user-typing', handleUserTyping);

    return () => {
      socket.off('receive-dm', handleReceiveDM);
      socket.off('user-typing', handleUserTyping);
    };
  }, [user?.clerkId]);

  const fetchChatHistory = async () => {
    if (!user?.clerkId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/chat/history?userId=${user.clerkId}`);
      if (response.ok) {
        const data = await response.json();
        const formattedMessages = await Promise.all(
          (data.messages || []).map(async (msg) => {
            const otherId = msg.senderId === currentUser?.id ? msg.recipientId : msg.senderId;
            const text = await decryptDmRow(currentUser?.id, otherId, msg);
            return {
              id: msg._id,
              text: text ?? "🔒 Can't decrypt — sent to another device's keys",
              sender: msg.senderId === currentUser?.id ? 'me' : 'them',
              timestamp: new Date(msg.createdAt),
              senderName: msg.senderName,
              senderImage: msg.senderImage,
            };
          })
        );
        setMessages(formattedMessages);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
      setMessages([]); 
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const sendMessage = async () => {
    const message = inputValue.trim();
    if (!message || !user?.clerkId) return;

    const tempMessage = {
      id: Date.now(),
      text: message,
      sender: 'me',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, tempMessage]);
    setInputValue('');
    scrollToBottom();

    try {
      // Encrypt on-device; the server only ever sees ciphertext.
      const encrypted = await encryptDmTo(currentUser?.id, user.clerkId, message);
      if (!encrypted) {
        setMessages(prev => [
          ...prev.filter(m => m.id !== tempMessage.id),
          {
            id: Date.now(),
            text: `${user.name} hasn't opened the new chat yet — they need to sign in once before you can message them securely.`,
            sender: 'them',
            timestamp: new Date(),
          },
        ]);
        return;
      }

      await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: user.clerkId,
          ...encrypted,
        }),
      });

      const fullName = [currentUser?.firstName, currentUser?.lastName]
        .filter(Boolean)
        .join(' ') || 'User';

      socketRef.current?.emit('send-dm', {
        recipientId: user.clerkId,
        ...encrypted,
        senderName: fullName,
        senderImage: currentUser?.imageUrl,
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);

    if (!user?.clerkId || !socketRef.current) return;

    socketRef.current.emit('typing', {
      recipientId: user.clerkId,
      isTyping: true,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', {
        recipientId: user.clerkId,
        isTyping: false,
      });
    }, 2000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-transparent overflow-hidden">
      {/* Compact header — sized for the narrow right panel */}
      <div className="bg-[#1a1a1a] border-b border-neutral-800 px-2 py-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-1.5 hover:bg-white/10 rounded-lg flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="relative flex-shrink-0">
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.name}
                className="w-9 h-9 rounded-full"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold text-sm">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${status.dotColor} rounded-full border-2 border-[#1a1a1a]`}></div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm truncate">{user.name}</h3>
            {isTyping ? (
              <p className="text-green-400 text-[11px] italic">typing...</p>
            ) : (
              <p className={`text-[11px] truncate ${status.color}`}>{status.text}</p>
            )}
          </div>

          <div className="flex-shrink-0 text-neutral-600" title="End-to-end encrypted">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Messages — tight padding, bubbles sized for a narrow column */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1.5 scrollbar min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400"></div>
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center mb-3">
              <MessageCircle className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-gray-400 text-sm">No messages yet</p>
            <p className="text-gray-500 text-[11px] mt-1.5 flex items-center gap-1">
              <Lock className="w-3 h-3" /> End-to-end encrypted
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const prev = messages[i - 1];
            // Stack consecutive same-sender bubbles closer together.
            const chained = prev && prev.sender === msg.sender;
            return (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} ${chained ? '' : 'pt-1.5'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-1.5 text-sm ${
                    msg.sender === 'me'
                      ? `bg-green-600 text-white rounded-2xl ${chained ? 'rounded-tr-md' : ''}`
                      : `bg-[#2a2a2a] text-white rounded-2xl ${chained ? 'rounded-tl-md' : ''}`
                  }`}
                >
                  <p className="break-words whitespace-pre-wrap leading-snug">{msg.text}</p>
                  <p
                    className={`text-[10px] mt-0.5 text-right ${
                      msg.sender === 'me' ? 'text-green-200/80' : 'text-gray-500'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Compact input — single pill with inline send */}
      <div className="border-t border-neutral-800 p-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 bg-[#2a2a2a] border border-neutral-700 rounded-full px-3 py-1 focus-within:border-green-500/60 transition-colors">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            maxLength={2000}
            placeholder="Message..."
            className="flex-1 min-w-0 bg-transparent py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 hover:bg-green-500 disabled:bg-transparent disabled:text-neutral-600 text-white flex items-center justify-center transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}