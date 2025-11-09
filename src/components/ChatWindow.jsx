"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Minimize2, Maximize2 } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { getSocket } from '@/lib/socket';

export default function ChatWindow({ user, onClose }) {
  const { user: currentUser } = useUser();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
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

    socket.on('dm-sent', (data) => {
      if (data.recipientId === user.clerkId) {
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
      socket.off('dm-sent');
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
    <div className="w-80 bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={user.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
              alt={user.name}
              className="w-10 h-10 rounded-full border-2 border-white"
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{user.name}</h3>
            {isTyping ? (
              <p className="text-white/90 text-xs italic">typing...</p>
            ) : (
              <p className="text-white/80 text-xs">Online</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:bg-white/20 p-1 rounded transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex-1 p-4 bg-gray-50 overflow-y-auto h-96">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 mt-8">
                <Send className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Start a conversation</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-4 flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg p-3 ${
                      msg.sender === 'me'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-800 shadow'
                    }`}
                  >
                    <p className="text-sm break-words">{msg.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.sender === 'me' ? 'text-purple-200' : 'text-gray-400'
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

          <div className="p-4 bg-white border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 text-gray-800"
              />
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim()}
                className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}