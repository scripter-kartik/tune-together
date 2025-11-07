// src/components/ChatSidebar.jsx

"use client";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "../lib/socket";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

function getInitials(name) {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ChatSidebar({ roomId, socketRef: externalSocketRef }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState("");
  const [userCount, setUserCount] = useState(0);
  const messagesEndRef = useRef(null);
  const localSocketRef = useRef(null);
  const socketRef = externalSocketRef || localSocketRef;

  // Load username
  useEffect(() => {
    const stored = localStorage.getItem("chatUsername");
    if (stored) setUsername(stored);
    else {
      const u = "User" + Math.floor(Math.random() * 10000);
      localStorage.setItem("chatUsername", u);
      setUsername(u);
    }
  }, []);

  // Socket setup
  useEffect(() => {
    if (!roomId || !username) return;

    // Ensure socket instance
    let socket;
    if (externalSocketRef?.current) {
      socketRef.current = externalSocketRef.current;
    } else if (!socketRef.current) {
      socketRef.current = getSocket();
    }

    socket = socketRef.current;
    if (!socket) return;   // ✅ <-- Prevents crash

    const onConnect = () => {
      setIsConnected(true);
      socket.emit("join-room", roomId);
    };

    const onDisconnect = () => setIsConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("chat message", (msg) => setMessages((prev) => [...prev, msg]));
    socket.on("user-count", setUserCount);
    socket.on("connect_error", () => setIsConnected(false));

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chat message");
      socket.off("user-count", setUserCount);
      socket.off("connect_error");
    };
  }, [roomId, username, externalSocketRef]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (input.trim() === "" || !socketRef.current || !isConnected || !username) return;

    const msg = {
      user: username,
      text: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Broadcast (others will receive); also append locally
    socketRef.current.emit("chat message", { roomId, msg });
    setMessages((prev) => [...prev, msg]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-[#181818] rounded-md p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-green-400">Group Chat</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-xs text-gray-400">
            {isConnected ? `${userCount} online` : "Offline"}
          </span>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-2">
        Chatting as: <span className="text-green-400">{username || "Loading..."}</span>
      </div>

      <div className="flex-1 overflow-y-auto mb-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-4">No messages yet. Start the conversation!</div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-end gap-2 ${msg.user === username ? "justify-end" : "justify-start"}`}
          >
            {msg.user !== username && (
              <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {getInitials(msg.user)}
              </div>
            )}
            <div
              className={`p-2 rounded-md max-w-[65%] shadow ${msg.user === username ? "bg-green-500 text-white self-end" : "bg-[#23272b] text-gray-200 self-start"
                }`}
            >
              <div className="flex justify-between items-center gap-2">
                <span className="font-semibold text-xs">{msg.user === username ? "You" : msg.user}</span>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">{msg.time}</span>
              </div>
              <div className="mt-1 break-words">{msg.text}</div>
            </div>
            {msg.user === username && (
              <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {getInitials(msg.user)}
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          className="flex-1 rounded px-3 py-2 bg-gray-800 text-white outline-none focus:ring-2 focus:ring-green-500"
          placeholder={isConnected ? "Type a message..." : "Connecting..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!isConnected || !username}
          maxLength={500}
        />
        <button
          type="submit"
          className="bg-green-500 px-4 py-2 rounded text-white font-semibold hover:bg-green-600 transition disabled:bg-gray-600 disabled:cursor-not-allowed"
          disabled={!isConnected || input.trim() === "" || !username}
        >
          Send
        </button>
      </form>
    </div>
  );
}
