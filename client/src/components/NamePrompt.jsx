import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { Users, Crown, AlertTriangle } from "lucide-react";

export default function NamePrompt({ defaultName, roomId, onJoin }) {
  const [name, setName] = useState(defaultName || "");
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    api.getMeeting(roomId)
      .then((data) => setMeetingInfo(data))
      .catch(() => setMeetingInfo(null))
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) onJoin(name.trim());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-accent-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Meeting has ended
  if (meetingInfo && !meetingInfo.isActive) {
    return (
      <div className="flex items-center justify-center min-h-screen relative">
        <div className="glass w-full max-w-md p-8 text-center animate-fade-in relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <h2 className="text-xl font-display font-bold text-white mb-2">Meeting Ended</h2>
          <p className="text-sm text-gray-400">
            This meeting has been ended by the host.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen relative">
      <div className="glass w-full max-w-md p-8 animate-fade-in relative z-10">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-accent-500/15 flex items-center justify-center mx-auto mb-4">
            <Users size={24} className="text-accent-400" />
          </div>
          <h2 className="text-xl font-display font-bold text-white">Join Meeting</h2>

          {meetingInfo && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-400">
              <Crown size={14} className="text-yellow-400" />
              <span>Hosted by <span className="text-white font-medium">{meetingInfo.hostName}</span></span>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-2 font-mono">Room: #{roomId}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your display name"
            required
            className="w-full px-4 py-3 rounded-xl bg-dark-700 border border-dark-500 text-white placeholder:text-gray-500 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/40 transition-all text-sm mb-4"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3.5 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            Join Meeting
          </button>
        </form>
      </div>
    </div>
  );
}
