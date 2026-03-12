import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import { UserPlus, Check, X, Phone, UserMinus, Search, Loader, Circle } from "lucide-react";

export default function FriendsList({ onlineUsers, onCallFriend }) {
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [friendEmail, setFriendEmail] = useState("");
    const [message, setMessage] = useState({ text: "", type: "" });
    const [loading, setLoading] = useState(false);

    const loadFriends = useCallback(async () => {
        try {
            const [friendsData, requestsData] = await Promise.all([
                api.getFriends(),
                api.getFriendRequests(),
            ]);
            setFriends(friendsData.friends || []);
            setRequests(requestsData.requests || []);
        } catch (err) {
            console.error("Error loading friends:", err);
        }
    }, []);

    useEffect(() => {
        loadFriends();
    }, [loadFriends]);

    const handleSendRequest = async (e) => {
        e.preventDefault();
        if (!friendEmail.trim()) return;
        setLoading(true);
        setMessage({ text: "", type: "" });

        try {
            const data = await api.sendFriendRequest(friendEmail.trim());
            setMessage({ text: data.message, type: "success" });
            setFriendEmail("");
            if (data.status === "accepted") loadFriends();
        } catch (err) {
            setMessage({ text: err.message, type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (requestId) => {
        try {
            await api.acceptFriendRequest(requestId);
            loadFriends();
        } catch (err) {
            console.error("Error accepting:", err);
        }
    };

    const handleReject = async (requestId) => {
        try {
            await api.rejectFriendRequest(requestId);
            setRequests((prev) => prev.filter((r) => r._id !== requestId));
        } catch (err) {
            console.error("Error rejecting:", err);
        }
    };

    const handleRemove = async (friendId) => {
        try {
            await api.removeFriend(friendId);
            setFriends((prev) => prev.filter((f) => f._id !== friendId));
        } catch (err) {
            console.error("Error removing:", err);
        }
    };

    const isOnline = (friendId) => onlineUsers.has(friendId);

    return (
        <div className="space-y-5">
            {/* Add Friend */}
            <form onSubmit={handleSendRequest} className="flex gap-2">
                <div className="flex-1 relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-400/60" />
                    <input
                        type="email"
                        value={friendEmail}
                        onChange={(e) => setFriendEmail(e.target.value)}
                        placeholder="Add friend by email..."
                        id="friend-email-input"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-dark-700 border border-dark-500 text-white placeholder:text-gray-500 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/40 transition-all text-sm"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || !friendEmail.trim()}
                    id="btn-add-friend"
                    className="px-4 py-2.5 rounded-xl font-medium text-white text-sm flex items-center gap-1.5 transition-all disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                >
                    {loading ? <Loader size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    Add
                </button>
            </form>

            {message.text && (
                <p className={`text-xs px-3 py-2 rounded-lg ${message.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                    {message.text}
                </p>
            )}

            {/* Pending Requests */}
            {requests.length > 0 && (
                <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Friend Requests ({requests.length})
                    </h4>
                    <div className="space-y-2">
                        {requests.map((req) => (
                            <div key={req._id} className="glass-light px-4 py-3 flex items-center justify-between rounded-xl">
                                <div>
                                    <p className="text-sm font-medium text-white">{req.from.name}</p>
                                    <p className="text-xs text-gray-400">{req.from.email}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAccept(req._id)}
                                        className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center hover:bg-green-500/30 transition-colors"
                                    >
                                        <Check size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleReject(req._id)}
                                        className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Friends List */}
            <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Friends ({friends.length})
                </h4>

                {friends.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">
                        No friends yet — add someone by email!
                    </p>
                ) : (
                    <div className="space-y-2">
                        {friends.map((friend) => (
                            <div key={friend._id} className="glass-light px-4 py-3 flex items-center justify-between rounded-xl group">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-9 h-9 rounded-full bg-dark-500 flex items-center justify-center">
                                            <span className="text-sm font-semibold text-accent-400">
                                                {friend.name[0].toUpperCase()}
                                            </span>
                                        </div>
                                        <Circle
                                            size={10}
                                            fill={isOnline(friend._id) ? "#22c55e" : "#6b7280"}
                                            className={`absolute -bottom-0.5 -right-0.5 ${isOnline(friend._id) ? "text-green-500" : "text-gray-500"}`}
                                        />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{friend.name}</p>
                                        <p className="text-xs text-gray-400">
                                            {isOnline(friend._id) ? "Online" : "Offline"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {isOnline(friend._id) && (
                                        <button
                                            onClick={() => onCallFriend(friend)}
                                            className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center hover:bg-green-500/30 transition-colors"
                                            title={`Call ${friend.name}`}
                                        >
                                            <Phone size={14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleRemove(friend._id)}
                                        className="w-8 h-8 rounded-full bg-red-500/10 text-red-400/60 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remove friend"
                                    >
                                        <UserMinus size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
