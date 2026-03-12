import { useState } from "react";
import { Video, Hash, ArrowRight, Sparkles } from "lucide-react";

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function RoomJoin({ onJoin }) {
    const [roomInput, setRoomInput] = useState("");
    const [isHovered, setIsHovered] = useState(false);

    const handleJoin = () => {
        const id = roomInput.trim();
        if (id) onJoin(id);
    };

    const handleGenerate = () => {
        const id = generateRoomId();
        setRoomInput(id);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative">
            {/* Mesh background */}
            <div className="mesh-bg" />

            <div className="relative z-10 w-full max-w-md animate-fade-in">
                {/* Branding */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-500/15 mb-5 animate-float">
                        <Video size={30} className="text-accent-400" />
                    </div>
                    <h1 className="text-4xl font-display font-bold tracking-tight bg-gradient-to-r from-accent-300 via-accent-400 to-purple-400 bg-clip-text text-transparent">
                        Peer Connect
                    </h1>
                    <p className="text-sm text-gray-400 mt-2">
                        Instant 1-to-1 video calls — no sign-up required
                    </p>
                </div>

                {/* Card */}
                <div className="glass p-8">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Room ID
                    </label>

                    {/* Input row */}
                    <div className="flex gap-2 mb-4">
                        <div className="flex-1 relative">
                            <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-400/60" />
                            <input
                                type="text"
                                id="room-id-input"
                                value={roomInput}
                                onChange={(e) => setRoomInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                                placeholder="Enter or generate a room ID"
                                className="w-full pl-9 pr-4 py-3 rounded-xl bg-dark-700 border border-dark-500 text-white placeholder:text-gray-500 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/40 transition-all text-sm"
                            />
                        </div>

                        <button
                            onClick={handleGenerate}
                            id="btn-generate-room"
                            className="px-4 py-3 rounded-xl glass-light text-accent-300 hover:text-accent-200 transition-colors flex items-center gap-1.5 text-sm font-medium shrink-0"
                            title="Generate random room ID"
                        >
                            <Sparkles size={16} />
                            <span className="hidden sm:inline">Generate</span>
                        </button>
                    </div>

                    {/* Join button */}
                    <button
                        onClick={handleJoin}
                        id="btn-join-room"
                        disabled={!roomInput.trim()}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                            background: roomInput.trim()
                                ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                                : "rgba(99, 102, 241, 0.2)",
                            boxShadow: roomInput.trim() && isHovered
                                ? "0 8px 30px rgba(99, 102, 241, 0.35)"
                                : "none",
                            transform: isHovered && roomInput.trim() ? "translateY(-1px)" : "none",
                        }}
                    >
                        Join Room
                        <ArrowRight size={18} className={`transition-transform duration-300 ${isHovered && roomInput.trim() ? "translate-x-1" : ""}`} />
                    </button>

                    {/* Info */}
                    <p className="text-xs text-gray-500 text-center mt-4">
                        Share the room ID with your peer — both enter it to connect
                    </p>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-600 mt-6">
                    Powered by WebRTC &middot; Peer-to-peer &middot; End-to-end encrypted
                </p>
            </div>
        </div>
    );
}
