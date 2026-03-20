import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { api } from "../api";
import FriendsList from "../components/FriendsList";
import {
  Video, Plus, Hash, ArrowRight, LogOut, Copy, Check,
  Link as LinkIcon, Sparkles, Shield, Users, Zap,
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
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-dark-600/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-500/15 flex items-center justify-center">
            <Video size={20} className="text-accent-400" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold bg-gradient-to-r from-accent-300 to-accent-400 bg-clip-text text-transparent">
              Peer Connect
            </h1>
            <p className="text-[10px] text-gray-500 -mt-0.5">Encrypted Video Meetings</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 glass-light px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-300">{user?.name}</span>
          </div>
          <button
            onClick={logout}
            className="w-9 h-9 rounded-xl glass-light flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-500/15 transition-all"
            title="Logout"
            id="btn-logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-2">
            Hi, {user?.name?.split(" ")[0]} 👋
          </h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Start a new meeting, join an existing one, or call a friend directly.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-8 animate-fade-in" style={{ animationDelay: "0.05s" }}>
          {[
            { icon: Shield, label: "End-to-End Encrypted", color: "text-emerald-400" },
            { icon: Users, label: "Multi-Party Meetings", color: "text-blue-400" },
            { icon: Zap, label: "Low-Latency SFU", color: "text-yellow-400" },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl glass-light">
              <Icon size={16} className={color} />
              <span className="text-[10px] text-gray-400 text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Meeting Actions */}
          <div className="lg:col-span-2 space-y-5">
            {/* Create Meeting */}
            <div className="glass p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <h3 className="text-sm font-display font-semibold text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
                <div className="w-7 h-7 rounded-lg bg-accent-500/15 flex items-center justify-center">
                  <Plus size={14} className="text-accent-400" />
                </div>
                New Meeting
              </h3>

              {!createdRoomId ? (
                <button
                  onClick={handleCreateMeeting}
                  disabled={creating}
                  id="btn-create-meeting"
                  className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-accent-500/25 disabled:opacity-50 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)" }}
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
                    className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                  >
                    Join Now
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Join Existing */}
            <div className="glass p-6 animate-fade-in" style={{ animationDelay: "0.15s" }}>
              <h3 className="text-sm font-display font-semibold text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
                <div className="w-7 h-7 rounded-lg bg-accent-500/15 flex items-center justify-center">
                  <Hash size={14} className="text-accent-400" />
                </div>
                Join Meeting
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="join-room-input"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinExisting()}
                  placeholder="Paste room ID or full link"
                  className="flex-1 px-4 py-3 rounded-xl bg-dark-700 border border-dark-500 text-white placeholder:text-gray-500 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/40 transition-all text-sm"
                />
                <button
                  onClick={handleJoinExisting}
                  disabled={!joinRoomId.trim()}
                  id="btn-join-existing"
                  className="px-6 py-3 rounded-xl font-semibold text-white flex items-center gap-2 transition-all disabled:opacity-30 active:scale-[0.97]"
                  style={{
                    background: joinRoomId.trim()
                      ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                      : "rgba(99, 102, 241, 0.15)",
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
            <h3 className="text-sm font-display font-semibold text-white mb-4 uppercase tracking-wide">
              Friends
            </h3>
            <FriendsList onlineUsers={onlineUsers} onCallFriend={onCallFriend} />
          </div>
        </div>
      </main>
    </div>
  );
}
