import { useState, useRef, useEffect, useCallback } from "react";
import { encrypt, decrypt, deriveKey } from "../utils/crypto";
import { MessageSquare, Send, X, Smile, Lock } from "lucide-react";

const EMOJI_LIST = [
  "😀", "😂", "🥹", "😍", "🤩", "😎", "🥳", "😊",
  "🤔", "😅", "😢", "😤", "🔥", "❤️", "👍", "👎",
  "👏", "🎉", "💯", "✅", "❌", "🙏", "💪", "🤝",
  "👋", "✨", "🚀", "💡", "⚡", "🎯", "🏆", "🌟",
];

export default function ChatPanel({ isOpen, onClose, socket, roomId, displayName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [cryptoKey, setCryptoKey] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Derive encryption key on mount
  useEffect(() => {
    if (!roomId) return;
    deriveKey(roomId).then(setCryptoKey);
  }, [roomId]);

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = async ({ encryptedData, senderName, senderId, timestamp }) => {
      if (!cryptoKey) return;

      const text = await decrypt(encryptedData.ciphertext, encryptedData.iv, cryptoKey);
      setMessages((prev) => [
        ...prev,
        { text, senderName, senderId, timestamp, isMine: false },
      ]);
    };

    socket.on("chat-message", handleMessage);
    return () => socket.off("chat-message", handleMessage);
  }, [socket, cryptoKey]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !cryptoKey || !socket) return;

    const encryptedData = await encrypt(text, cryptoKey);
    const timestamp = Date.now();

    socket.emit("chat-message", {
      roomId,
      encryptedData,
      senderName: displayName,
      timestamp,
    });

    setMessages((prev) => [
      ...prev,
      { text, senderName: displayName, senderId: "me", timestamp, isMine: true },
    ]);

    setInput("");
    setShowEmoji(false);
  }, [input, cryptoKey, socket, roomId, displayName]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addEmoji = (emoji) => {
    setInput((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 glass border-l border-dark-500/50 flex flex-col z-30 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-500/50">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-accent-400" />
          <h3 className="text-sm font-display font-semibold text-white">Meeting Chat</h3>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
            <Lock size={10} className="text-green-400" />
            <span className="text-[10px] text-green-400 font-medium">Encrypted</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg glass-light flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-xs mt-8">
            <Lock size={24} className="mx-auto mb-2 text-gray-600" />
            Messages are end-to-end encrypted.
            <br />
            Only participants in this meeting can read them.
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.isMine ? "items-end" : "items-start"}`}
          >
            {!msg.isMine && (
              <span className="text-[10px] text-gray-500 mb-1 ml-1">{msg.senderName}</span>
            )}
            <div
              className={`max-w-[80%] px-3 py-2 rounded-xl text-sm break-words ${
                msg.isMine
                  ? "bg-accent-500/20 border border-accent-500/30 text-accent-100"
                  : "glass-light text-gray-200"
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[10px] text-gray-600 mt-0.5 mx-1">
              {formatTime(msg.timestamp)}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker */}
      {showEmoji && (
        <div className="px-4 py-2 border-t border-dark-500/50">
          <div className="grid grid-cols-8 gap-1.5">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                onClick={() => addEmoji(emoji)}
                className="w-8 h-8 rounded-lg hover:bg-dark-500/50 flex items-center justify-center text-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-dark-500/50 flex items-center gap-2">
        <button
          onClick={() => setShowEmoji((v) => !v)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            showEmoji
              ? "bg-accent-500/20 text-accent-300"
              : "glass-light text-gray-400 hover:text-white"
          }`}
        >
          <Smile size={18} />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          className="flex-1 px-4 py-2.5 rounded-xl bg-dark-700 border border-dark-500 text-white placeholder:text-gray-500 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/40 transition-all text-sm"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
          style={{ background: input.trim() ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(99,102,241,0.15)" }}
        >
          <Send size={16} className="text-white" />
        </button>
      </div>
    </div>
  );
}
