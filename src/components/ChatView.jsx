"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, ArrowLeft, MessageCircle, Circle, Music } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { getSocket } from '@/lib/socket';

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

    fetchChatHistory();

    const socket = getSocket();
    socketRef.current = socket;

    const handleReceiveDM = (data) => {
      if (data.senderId === user.clerkId) {
        const newMessage = {
          id: Date.now(),
          text: data.message,
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
        const formattedMessages = (data.messages || []).map(msg => ({
          id: msg._id,
          text: msg.message,
          sender: msg.senderId === currentUser?.id ? 'me' : 'them',
          timestamp: new Date(msg.createdAt),
          senderName: msg.senderName,
          senderImage: msg.senderImage,
        }));
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
      await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: user.clerkId,
          message,
        }),
      });

      const fullName = [currentUser?.firstName, currentUser?.lastName]
        .filter(Boolean)
        .join(' ') || 'User';
      
      socketRef.current?.emit('send-dm', {
        recipientId: user.clerkId,
        message,
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
      <div className="bg-[#1a1a1a] border-b border-gray-800 p-4 rounded-t-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition p-2 hover:bg-white/10 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="relative">
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.name}
                  className="w-12 h-12 rounded-full border-2 border-gray-700"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold text-lg">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <div className={`absolute bottom-0 right-0 w-3 h-3 ${status.dotColor} rounded-full border-2 border-[#1a1a1a]`}></div>
            </div>
            
            <div>
              <h3 className="text-white font-semibold text-lg">{user.name}</h3>
              {isTyping ? (
                <p className="text-green-400 text-sm italic">typing...</p>
              ) : (
                <div className="flex items-center gap-1">
                  {status.icon}
                  <p className={`text-sm ${status.color}`}>
                    {status.text}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-green-400" />
            </div>
            <p className="text-gray-400 text-lg">No messages yet</p>
            <p className="text-gray-500 text-sm mt-2">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-md rounded-2xl px-4 py-3 ${
                  msg.sender === 'me'
                    ? 'bg-green-600 text-white'
                    : 'bg-[#2a2a2a] text-white border border-gray-700'
                }`}
              >
                <p className="break-words">{msg.text}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.sender === 'me' ? 'text-green-200' : 'text-gray-400'
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-[#1a1a1a] border-t border-gray-800 px-2 py-1 rounded-b-md">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim()}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600 flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}