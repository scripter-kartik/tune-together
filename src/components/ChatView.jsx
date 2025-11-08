// ============================================
// FILE 2: src/components/ChatView.jsx (NEW)
// ============================================

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, ArrowLeft, MessageCircle } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { getSocket } from '@/lib/socket';

export default function ChatView({ user, onClose }) {
  const { user: currentUser } = useUser();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    fetchChatHistory();

    const socket = getSocket();
    socketRef.current = socket;

    socket.on('receive-dm', (data) => {
      if (data.senderId === user.clerkId) {
        const newMessage = {
          id: Date.now(),
          text: data.message,
          sender: 'them',
          timestamp: new Date(data.timestamp),
          senderName: data.senderName,
          senderImage: data.senderImage,
        };
        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();
      }
    });

    socket.on('user-typing', (data) => {
      if (data.senderId === user.clerkId) {
        setIsTyping(data.isTyping);
        if (data.isTyping) {
          setTimeout(() => setIsTyping(false), 3000);
        }
      }
    });

    return () => {
      socket.off('receive-dm');
      socket.off('user-typing');
    };
  }, [user.clerkId]);

  const fetchChatHistory = async () => {
    try {
      const response = await fetch(`/api/chat/history?userId=${user.clerkId}`);
      if (response.ok) {
        const data = await response.json();
        const formattedMessages = data.messages.map(msg => ({
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
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const sendMessage = async () => {
    const message = inputValue.trim();
    if (!message) return;

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

    socketRef.current?.emit('typing', {
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
    <div className="h-[calc(100vh-140px)] flex flex-col bg-gradient-to-br from-gray-900 via-purple-900/20 to-black">
      {/* Header */}
      <div className="bg-black/60 backdrop-blur-lg border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition p-2 hover:bg-white/10 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="relative">
              <img
                src={user.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                alt={user.name}
                className="w-12 h-12 rounded-full border-2 border-white/20"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
            </div>
            
            <div>
              <h3 className="text-white font-semibold text-lg">{user.name}</h3>
              {isTyping ? (
                <p className="text-green-400 text-sm italic">typing...</p>
              ) : (
                <p className="text-white/60 text-sm">Online</p>
              )}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-purple-600/20 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-purple-400" />
            </div>
            <p className="text-white/60 text-lg">Start a conversation with {user.name}</p>
            <p className="text-white/40 text-sm mt-2">Send a message to get started</p>
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
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'bg-white/10 backdrop-blur-lg text-white border border-white/10'
                }`}
              >
                <p className="break-words">{msg.text}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.sender === 'me' ? 'text-white/70' : 'text-white/50'
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

      {/* Input Area */}
      <div className="bg-black/60 backdrop-blur-lg border-t border-white/10 p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full hover:from-purple-700 hover:to-pink-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}