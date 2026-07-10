"use client";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getSocket } from "../lib/socket";
import { Send, MessageCircle } from "lucide-react";

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
  const { user } = useUser();

  useEffect(() => {

    const clerkName = user?.fullName || user?.username || user?.firstName;
    if (clerkName) {
      setUsername(clerkName);
      return;
    }
    const stored = localStorage.getItem("chatUsername");
    if (stored) setUsername(stored);
    else {
      const u = "User" + Math.floor(Math.random() * 10000);
      localStorage.setItem("chatUsername", u);
      setUsername(u);
    }
  }, [user]);

  useEffect(() => {
    if (!roomId || !username) return;

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

    if (socket.connected) {
      setIsConnected(true);
      socket.emit("join-room", roomId);
    }

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

    socketRef.current.emit("chat message", { roomId, msg });
    setMessages((prev) => [...prev, msg]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-[#121212]">
      
      <div className="flex items-center justify-between p-4 border-b border-neutral-800 flex-shrink-0">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Group Chat
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-[#1db954]" : "bg-red-500"}`} />
            <span className="text-[11px] text-neutral-400 font-medium">
              {isConnected ? `${userCount} online` : "Connecting..."}
            </span>
          </div>
        </div>
        <div className="text-[10px] bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full border border-neutral-700">
          As: <span className="text-white font-semibold">{username || "..."}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-2">
            <MessageCircle className="w-8 h-8 opacity-50 mb-1" />
            <p className="text-xs">No messages yet. Start the conversation!</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.user === username;
          return (
            <div
              key={idx}
              className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
            >
              {!isMe && (
                <div className="bg-neutral-800 text-neutral-400 rounded-full w-7 h-7 flex items-center justify-center font-bold text-[10px] flex-shrink-0 shadow-sm border border-neutral-700">
                  {getInitials(msg.user)}
                </div>
              )}
              <div
                className={`px-3.5 py-2 max-w-[75%] shadow-sm ${
                  isMe 
                    ? "bg-[#1db954] text-black rounded-2xl rounded-br-sm" 
                    : "bg-[#282828] text-white rounded-2xl rounded-bl-sm border border-neutral-800"
                }`}
              >
                {!isMe && (
                  <div className="font-bold text-[10px] text-neutral-400 mb-0.5 ml-0.5">{msg.user}</div>
                )}
                <div className={`text-sm leading-relaxed ${isMe ? "font-medium" : "font-normal"} break-words`}>
                  {msg.text}
                </div>
                <div className={`text-[9px] mt-1 text-right ${isMe ? "text-black/60" : "text-neutral-500"}`}>
                  {msg.time}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-neutral-800 flex-shrink-0 bg-[#121212]">
        <form onSubmit={sendMessage} className="flex items-center gap-2 relative">
          <input
            type="text"
            className="flex-1 rounded-full pl-4 pr-12 py-2.5 bg-[#282828] text-sm text-white placeholder-neutral-500 outline-none focus:ring-1 focus:ring-neutral-600 transition-all border border-transparent hover:border-neutral-700"
            placeholder={isConnected ? "Message..." : "Connecting..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!isConnected || !username}
            maxLength={500}
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#1db954] rounded-full flex items-center justify-center text-black hover:bg-[#1ed760] transition-colors disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            disabled={!isConnected || input.trim() === "" || !username}
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
