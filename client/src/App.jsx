import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import { useWebRTC } from "./hooks/useWebRTC";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import OTPPage from "./pages/OTPPage";
import LobbyPage from "./pages/LobbyPage";
import NamePrompt from "./components/NamePrompt";
import IncomingCall from "./components/IncomingCall";
import Controls from "./components/Controls";
import ChatPanel from "./components/ChatPanel";
import { useState, useRef, useEffect } from "react";
import {
  Loader, AlertCircle, Users, Crown, MessageSquare, PhoneOff,
} from "lucide-react";

function AppContent() {
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const {
    connectionState, isMuted, isVideoOff, error, setError,
    localVideoRef, participants, hostId,
    joinRoom, leaveRoom, hostEndMeeting, toggleMute, toggleVideo,
    onlineUsers, incomingCall, callFriend, acceptCall, rejectCall, socket,
  } = useWebRTC(token);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mesh-bg" />
        <Loader size={32} className="text-accent-400 animate-spin relative z-10" />
      </div>
    );
  }

  const handleCallFriend = (friend) => {
    const activeSocket = socket.current;
    if (!activeSocket) return;

    activeSocket.once("call-accepted", ({ roomId: acceptedRoomId }) => {
      navigate(`/room/${acceptedRoomId}`);
    });
    callFriend(friend._id, user.name);
  };

  const handleAcceptCall = () => {
    const roomId = acceptCall();
    if (roomId) navigate(`/room/${roomId}`);
  };

  return (
    <>
      {incomingCall && (
        <IncomingCall
          callerName={incomingCall.callerName}
          onAccept={handleAcceptCall}
          onReject={rejectCall}
        />
      )}

      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />}
        />
        <Route
          path="/verify-otp"
          element={isAuthenticated ? <Navigate to="/" /> : <OTPPage />}
        />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <LobbyPage onlineUsers={onlineUsers} onCallFriend={handleCallFriend} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/room/:roomId"
          element={
            <RoomPage
              user={user}
              connectionState={connectionState}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              error={error}
              setError={setError}
              participants={participants}
              hostId={hostId}
              localVideoRef={localVideoRef}
              joinRoom={joinRoom}
              leaveRoom={leaveRoom}
              hostEndMeeting={hostEndMeeting}
              toggleMute={toggleMute}
              toggleVideo={toggleVideo}
              socket={socket}
            />
          }
        />
      </Routes>
    </>
  );
}

function RoomPage({
  user, connectionState, isMuted, isVideoOff, error, setError,
  participants, hostId, localVideoRef,
  joinRoom, leaveRoom, hostEndMeeting, toggleMute, toggleVideo, socket,
}) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [showNamePrompt, setShowNamePrompt] = useState(true);
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const chatOpenRef = useRef(chatOpen);

  useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);

  // Count unread messages when chat is closed
  useEffect(() => {
    const s = socket.current;
    if (!s) return;

    const handler = () => {
      if (!chatOpenRef.current) {
        setUnreadChat((c) => c + 1);
      }
    };

    s.on("chat-message", handler);
    return () => s.off("chat-message", handler);
  }, [socket]);

  const handleJoinWithName = (name) => {
    setDisplayName(name);
    setShowNamePrompt(false);
    joinRoom(roomId, name);
  };

  const handleLeave = () => {
    leaveRoom();
    navigate("/");
  };

  const handleHostEnd = () => {
    hostEndMeeting();
    navigate("/");
  };

  const isHost = user && hostId && user._id === hostId;

  // Name prompt
  if (showNamePrompt && connectionState === "idle") {
    return (
      <div className="min-h-screen relative">
        <div className="mesh-bg" />
        <NamePrompt defaultName={user?.name || ""} roomId={roomId} onJoin={handleJoinWithName} />
      </div>
    );
  }

  // Calculate grid layout
  const totalVideos = 1 + participants.length; // local + remote
  const gridCols =
    totalVideos <= 1 ? "grid-cols-1" :
    totalVideos <= 2 ? "grid-cols-1 md:grid-cols-2" :
    totalVideos <= 4 ? "grid-cols-2" :
    totalVideos <= 6 ? "grid-cols-2 lg:grid-cols-3" :
    "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="mesh-bg" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3">
        <h1 className="text-lg font-display font-bold bg-gradient-to-r from-accent-300 to-accent-400 bg-clip-text text-transparent">
          Peer Connect
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-400 font-mono glass-light px-3 py-1 rounded-full text-xs">
            #{roomId}
          </span>
          <div className="flex items-center gap-1 glass-light px-3 py-1 rounded-full text-xs text-gray-300">
            <Users size={12} />
            {totalVideos}
          </div>
          {connectionState === "joining" && (
            <span className="flex items-center gap-2 text-yellow-400 glass-light px-3 py-1.5 rounded-full text-xs animate-fade-in">
              <Loader size={14} className="animate-spin" />
              Connecting…
            </span>
          )}
        </div>
      </header>

      {/* Video Grid */}
      <main className="flex-1 relative z-10 flex items-center justify-center px-4 pb-4">
        <div className={`w-full max-w-7xl grid ${gridCols} gap-3 animate-fade-in`}>
          {/* Local Video */}
          <div className="video-container aspect-video relative">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-dark-700">
                <div className="w-16 h-16 rounded-full bg-dark-500/80 flex items-center justify-center">
                  <span className="text-2xl font-display font-bold text-accent-400">
                    {displayName?.[0]?.toUpperCase() || "Y"}
                  </span>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full glass-light text-xs font-medium text-accent-300">
                {displayName || "You"} (You)
              </span>
              {isHost && (
                <span className="px-1.5 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                  <Crown size={10} className="text-yellow-400" />
                </span>
              )}
            </div>
          </div>

          {/* Remote Videos */}
          {participants.map((p) => (
            <ParticipantVideo
              key={p.socketId}
              participant={p}
              isHost={p.userId === hostId}
            />
          ))}

          {/* Empty state when waiting */}
          {participants.length === 0 && connectionState === "joining" && (
            <div className="video-container aspect-video flex flex-col items-center justify-center bg-dark-700/90 gap-3">
              <Loader size={28} className="text-accent-400 animate-spin" />
              <p className="text-sm text-gray-400">Waiting for others to join…</p>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        <ChatPanel
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          socket={socket.current}
          roomId={roomId}
          displayName={displayName}
        />
      </main>

      {/* Controls */}
      <div className="relative z-10 flex justify-center pb-6 pt-2">
        <div className="glass px-4 py-3 rounded-2xl flex items-center gap-3">
          <Controls
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
            onLeave={handleLeave}
          />

          {/* Chat Toggle */}
          <button
            onClick={() => {
              setChatOpen((v) => !v);
              setUnreadChat(0);
            }}
            className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              chatOpen
                ? "bg-accent-500/20 text-accent-300"
                : "glass-light text-gray-400 hover:text-white"
            }`}
            title="Toggle Chat"
          >
            <MessageSquare size={18} />
            {unreadChat > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadChat > 9 ? "9+" : unreadChat}
              </span>
            )}
          </button>

          {/* Host End Meeting */}
          {isHost && (
            <button
              onClick={handleHostEnd}
              className="px-4 h-11 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all flex items-center gap-2 text-sm font-medium"
              title="End Meeting for All"
            >
              <PhoneOff size={16} />
              End All
            </button>
          )}
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass px-5 py-3 flex items-center gap-2 text-red-400 text-sm animate-fade-in cursor-pointer"
          onClick={() => setError(null)}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  );
}

function ParticipantVideo({ participant, isHost }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (participant.streams?.video && videoRef.current) {
      videoRef.current.srcObject = participant.streams.video;
    }
  }, [participant.streams?.video]);

  useEffect(() => {
    if (participant.streams?.audio && audioRef.current) {
      audioRef.current.srcObject = participant.streams.audio;
    }
  }, [participant.streams?.audio]);

  const hasVideo = !!participant.streams?.video;

  return (
    <div className="video-container aspect-video relative">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <audio ref={audioRef} autoPlay />

      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-700">
          <div className="w-16 h-16 rounded-full bg-dark-500/80 flex items-center justify-center">
            <span className="text-2xl font-display font-bold text-accent-400">
              {participant.displayName?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        <span className="px-2 py-0.5 rounded-full glass-light text-xs font-medium text-accent-300">
          {participant.displayName}
        </span>
        {isHost && (
          <span className="px-1.5 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30">
            <Crown size={10} className="text-yellow-400" />
          </span>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
