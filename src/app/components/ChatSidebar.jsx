"use client";
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SOCKET_URL = "http://localhost:4000";

let socket;

function getInitials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function ChatSidebar({ username }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket = io(SOCKET_URL);

    socket.on("chat message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (input.trim() === "") return;
    const msg = {
      user: username || "Anon",
      text: input,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    socket.emit("chat message", msg);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-[#181818] rounded-md p-4">
      <h2 className="text-lg font-bold text-green-400 mb-2">Group Chat</h2>
      <div className="flex-1 overflow-y-auto mb-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-end gap-2 ${
              msg.user === username ? "justify-end" : "justify-start"
            }`}
          >
            {msg.user !== username && (
              <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                {getInitials(msg.user)}
              </div>
            )}
            <div
              className={`p-2 rounded-md max-w-[65%] shadow ${
                msg.user === username
                  ? "bg-green-500 text-white self-end"
                  : "bg-[#23272b] text-gray-200 self-start"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-xs">
                  {msg.user === username ? "You" : msg.user}
                </span>
                <span className="ml-2 text-[10px] text-gray-400">
                  {msg.time}
                </span>
              </div>
              <div className="mt-1">{msg.text}</div>
            </div>
            {msg.user === username && (
              <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
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
          className="flex-1 rounded px-2 py-1 bg-gray-800 text-white outline-none"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="bg-green-500 px-4 py-1 rounded text-white font-semibold hover:bg-green-600 transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}
