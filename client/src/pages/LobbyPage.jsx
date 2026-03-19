import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { api } from "../api";
import FriendsList from "../components/FriendsList";
import {
  Video, Plus, Hash, ArrowRight, LogOut, Copy, Check, Link as LinkIcon, Sparkles,
} from "lucide-react";

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function LobbyPage({ onlineUsers, onCallFriend }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [joinRoomId, setJoinRoomId] = useState("");
  const [createdRoomId, setCreatedRoomId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreateMeeting = async () => {
    setCreating(true);
    const id = generateRoomId();
    try {
      await api.createMeeting(id);
      setCreatedRoomId(id);
      setCopied(false);
    } catch (err) {
      // If meeting already exists with this ID, try again
      if (err.message?.includes("already active")) {
        const id2 = generateRoomId();
        try {
          await api.createMeeting(id2);
          setCreatedRoomId(id2);
          setCopied(false);
        } catch {
          console.error("Failed to create meeting");
        }
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/room/${createdRoomId}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinCreated = () => {
    if (createdRoomId) navigate(`/room/${createdRoomId}`);
  };

  const handleJoinExisting = () => {
    const id = joinRoomId.trim();
    if (!id) return;
    const match = id.match(/\/room\/([A-Za-z0-9]+)/);
    const roomId = match ? match[1] : id;
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen relative">
      <div className="mesh-bg" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-dark-600/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-500/15 flex items-center justify-center">
            <Video size={18} className="text-accent-400" />
          </div>
          <h1 className="text-lg font-display font-bold bg-gradient-to-r from-accent-300 to-accent-400 bg-clip-text text-transparent">
            Peer Connect
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 hidden sm:block">
            Hey, <span className="text-white font-medium">{user?.name}</span>
          </span>
          <button
            onClick={logout}
            className="w-9 h-9 rounded-xl glass-light flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            title="Logout"
            id="btn-logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Meeting Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Meeting */}
            <div className="glass p-6 animate-fade-in">
              <h2 className="text-base font-display font-semibold text-white mb-4 flex items-center gap-2">
                <Plus size={18} className="text-accent-400" />
                New Meeting
              </h2>

              {!createdRoomId ? (
                <button
                  onClick={handleCreateMeeting}
                  disabled={creating}
                  id="btn-create-meeting"
                  className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-accent-500/20 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
                >
                  <Sparkles size={18} />
                  {creating ? "Creating..." : "Create Meeting Room"}
                </button>
              ) : (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-700 border border-dark-500">
                      <LinkIcon size={14} className="text-accent-400/60 shrink-0" />
                      <span className="text-sm text-gray-300 font-mono truncate">
                        {window.location.origin}/room/{createdRoomId}
                      </span>
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-2.5 rounded-xl glass-light text-accent-300 hover:text-accent-200 transition-colors flex items-center gap-1.5 text-sm font-medium shrink-0"
                      id="btn-copy-link"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <button
                    onClick={handleJoinCreated}
                    id="btn-join-created"
                    className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                  >
                    Join Now
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Join Existing */}
            <div className="glass p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <h2 className="text-base font-display font-semibold text-white mb-4 flex items-center gap-2">
                <Hash size={18} className="text-accent-400" />
                Join Meeting
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="join-room-input"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinExisting()}
                  placeholder="Paste room ID or link"
                  className="flex-1 px-4 py-3 rounded-xl bg-dark-700 border border-dark-500 text-white placeholder:text-gray-500 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/40 transition-all text-sm"
                />
                <button
                  onClick={handleJoinExisting}
                  disabled={!joinRoomId.trim()}
                  id="btn-join-existing"
                  className="px-6 py-3 rounded-xl font-semibold text-white flex items-center gap-2 transition-all disabled:opacity-40"
                  style={{
                    background: joinRoomId.trim()
                      ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                      : "rgba(99, 102, 241, 0.2)",
                  }}
                >
                  Join
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Right — Friends */}
          <div className="glass p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <h2 className="text-base font-display font-semibold text-white mb-4">
              Friends
            </h2>
            <FriendsList onlineUsers={onlineUsers} onCallFriend={onCallFriend} />
          </div>
        </div>
      </main>
    </div>
  );
}
