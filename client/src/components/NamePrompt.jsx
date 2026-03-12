import { useState } from "react";
import { User, ArrowRight } from "lucide-react";

export default function NamePrompt({ defaultName, roomId, onJoin }) {
    const [name, setName] = useState(defaultName || "");

    const handleJoin = () => {
        const trimmed = name.trim();
        if (trimmed) onJoin(trimmed);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="glass p-8 max-w-sm w-full mx-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <h2 className="text-lg font-display font-bold text-white mb-1">
                    About to join
                </h2>
                <p className="text-sm text-gray-400 mb-6">
                    Room: <span className="text-accent-300 font-mono">{roomId}</span>
                </p>

                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Your display name
                </label>
                <div className="relative mb-5">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-400/60" />
                    <input
                        type="text"
                        id="display-name-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                        placeholder="Enter your name"
                        autoFocus
                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-dark-700 border border-dark-500 text-white placeholder:text-gray-500 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/40 transition-all text-sm"
                    />
                </div>

                <button
                    onClick={handleJoin}
                    disabled={!name.trim()}
                    id="btn-confirm-join"
                    className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-40"
                    style={{
                        background: name.trim()
                            ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                            : "rgba(99, 102, 241, 0.2)",
                    }}
                >
                    Join Meeting
                    <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
}
