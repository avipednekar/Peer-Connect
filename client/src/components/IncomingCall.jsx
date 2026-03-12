import { Phone, PhoneOff, X } from "lucide-react";

export default function IncomingCall({ callerName, onAccept, onReject }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass p-8 max-w-sm w-full mx-4 text-center">
                {/* Pulsing ring animation */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full bg-green-500/20 animate-pulse-ring" />
                    <div className="absolute inset-2 rounded-full bg-green-500/15 animate-pulse-ring" style={{ animationDelay: "0.3s" }} />
                    <div className="absolute inset-4 rounded-full bg-dark-600 flex items-center justify-center">
                        <span className="text-3xl font-display font-bold text-green-400">
                            {callerName?.[0]?.toUpperCase() || "?"}
                        </span>
                    </div>
                </div>

                <h2 className="text-xl font-display font-bold text-white mb-1">
                    {callerName}
                </h2>
                <p className="text-sm text-gray-400 mb-8">is calling you…</p>

                <div className="flex items-center justify-center gap-6">
                    {/* Reject */}
                    <button
                        onClick={onReject}
                        className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all hover:scale-110 active:scale-95 shadow-lg shadow-red-500/30"
                        id="btn-reject-call"
                    >
                        <PhoneOff size={22} />
                    </button>

                    {/* Accept */}
                    <button
                        onClick={onAccept}
                        className="w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-all hover:scale-110 active:scale-95 shadow-lg shadow-green-500/30"
                        id="btn-accept-call"
                    >
                        <Phone size={22} />
                    </button>
                </div>
            </div>
        </div>
    );
}
