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
  Loader, AlertCircle, Users, Crown, MessageSquare,
} from "lucide-react";

function AppContent() {
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const {
    connectionState, isMuted, isVideoOff, error, setError,
    localVideoRef, participants, hostId,
    joinRoom, leaveRoom, hostEndMeeting, toggleMute, toggleVideo,
    onlineUsers, incomingCall, callFriend, acceptCall, rejectCall, socket,
    setIsMuted, setIsVideoOff,
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
              setIsMuted={setIsMuted}
              setIsVideoOff={setIsVideoOff}
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
  joinRoom, leaveRoom, hostEndMeeting, toggleMute, toggleVideo,
  setIsMuted, setIsVideoOff, socket,
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

  const [pinnedId, setPinnedId] = useState("local");
  const [participantsOpen, setParticipantsOpen] = useState(false);

  // If pinned user leaves, fallback to local
  useEffect(() => {
    if (pinnedId !== "local" && !participants.find(p => p.socketId === pinnedId)) {
      setPinnedId("local");
    }
  }, [participants, pinnedId]);

  const handleJoinWithName = (name, mediaSettings) => {
    setDisplayName(name);
    setShowNamePrompt(false);
    joinRoom(roomId, name, mediaSettings);
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
  const totalVideos = 1 + participants.length;
  const pinnedParticipant = participants.find(p => p.socketId === pinnedId);
  const showLocalSpotlight = pinnedId === "local";

  // Name prompt with pre-join preview
  if (showNamePrompt && connectionState === "idle") {
    return (
      <div className="min-h-screen relative">
        <div className="mesh-bg" />
        <NamePrompt defaultName={user?.name || ""} roomId={roomId} onJoin={handleJoinWithName} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col relative overflow-hidden bg-dark-900">
      {/* Header */}
      <header className="relative z-50 flex items-center justify-between px-6 py-3 border-b border-dark-600/30 bg-dark-900/80 backdrop-blur-md">
        <h1 className="text-lg font-display font-bold bg-gradient-to-r from-accent-300 to-accent-400 bg-clip-text text-transparent">
          Peer Connect
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-400 font-mono glass-light px-3 py-1 rounded-full text-xs">
            #{roomId}
          </span>
          <button
            onClick={() => setParticipantsOpen(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors ${
              participantsOpen ? "bg-accent-500/20 text-accent-300 border border-accent-500/30" : "glass-light text-gray-300 hover:text-white"
            }`}
          >
            <Users size={14} />
            <span className="font-medium">{totalVideos}</span>
          </button>
          {connectionState === "joining" && (
            <span className="flex items-center gap-2 text-yellow-400 glass-light px-3 py-1.5 rounded-full text-xs animate-fade-in">
              <Loader size={14} className="animate-spin" />
              Connecting…
            </span>
          )}
        </div>
      </header>

      {/* Meet Layout Container */}
      <main className="flex-1 relative z-10 meet-container">
        
        {/* Main Content Area (Spotlight + Filmstrip) */}
        <div className="meet-main">
          
          {/* Spotlight (Pinned Video) */}
          <div className="meet-spotlight animate-fade-in flex items-center justify-center">
            {showLocalSpotlight ? (
              <>
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                {isVideoOff && (
                  <div className="absolute inset-0 flex items-center justify-center bg-dark-700">
                    <div className="w-24 h-24 rounded-full bg-dark-500/80 flex items-center justify-center shadow-xl">
                      <span className="text-4xl font-display font-bold text-accent-400">
                        {displayName?.[0]?.toUpperCase() || "Y"}
                      </span>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg glass-light text-sm font-medium text-white shadow-lg backdrop-blur-md bg-black/40">
                    {displayName || "You"} (You)
                  </span>
                  {isHost && (
                    <span className="px-2 py-1.5 rounded-lg bg-yellow-500/30 border border-yellow-500/40 shadow-lg backdrop-blur-md">
                      <Crown size={14} className="text-yellow-400" />
                    </span>
                  )}
                </div>
              </>
            ) : pinnedParticipant ? (
              <ParticipantVideo
                participant={pinnedParticipant}
                isHost={pinnedParticipant.userId === hostId}
                isSpotlight={true}
              />
            ) : null}

            {/* Empty state when waiting */}
            {participants.length === 0 && connectionState === "joining" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-800/80 backdrop-blur-sm gap-4 z-20">
                <Loader size={36} className="text-accent-400 animate-spin" />
                <p className="text-sm text-gray-300 font-medium">Waiting for others to join…</p>
              </div>
            )}
          </div>

          {/* Filmstrip (Other participants + Local if not pinned) */}
          <div className="meet-sidebar">
            <div className="meet-filmstrip">
              {/* Local Tile in Filmstrip */}
              {!showLocalSpotlight && (
                <div 
                  className="meet-filmstrip-tile group"
                  onClick={() => setPinnedId("local")}
                >
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  {isVideoOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-dark-700">
                      <div className="w-12 h-12 rounded-full bg-dark-500/80 flex items-center justify-center">
                        <span className="text-xl font-display font-bold text-accent-400">
                          {displayName?.[0]?.toUpperCase() || "Y"}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-1.5 left-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-medium text-white shadow-sm">
                      You
                    </span>
                  </div>
                </div>
              )}

              {/* Remote Tiles in Filmstrip */}
              {participants.map((p) => {
                if (p.socketId === pinnedId) return null; // Already in spotlight
                return (
                  <div 
                    key={p.socketId}
                    className="meet-filmstrip-tile group"
                    onClick={() => setPinnedId(p.socketId)}
                  >
                    <ParticipantVideo
                      participant={p}
                      isHost={p.userId === hostId}
                      isSpotlight={false}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          {/* Floating Control Bar — absolute within meet-main */}
          <div className="control-bar flex items-center gap-2 animate-fade-in">
            <Controls
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              onToggleMute={toggleMute}
              onToggleVideo={toggleVideo}
              onLeave={handleLeave}
              isHost={isHost}
              onHostEnd={handleHostEnd}
            />

            {/* Divider */}
            <div className="w-px h-10 bg-white/10 mx-1" />

            {/* Built-in Chat Toggle */}
            <button
              onClick={() => {
                setChatOpen((v) => {
                  if (!v) setParticipantsOpen(false); // Map overlapping sidebars
                  return !v;
                });
                setUnreadChat(0);
              }}
              className="meeting-btn"
              style={{ background: chatOpen ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.08)" }}
              title="Toggle Chat"
            >
              <span className="meeting-btn-icon">
                <MessageSquare size={18} />
              </span>
              <span className="meeting-btn-label">Chat</span>
              {unreadChat > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                  {unreadChat > 9 ? "9+" : unreadChat}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Participants Panel */}
        <aside className={`participants-panel ${participantsOpen ? 'open' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
              <Users size={18} className="text-accent-400" />
              People ({totalVideos})
            </h3>
          </div>
          <div className="space-y-2">
            {/* Local User */}
            <div className="participant-item">
              <div className="participant-avatar bg-accent-500/20 text-accent-300 border border-accent-500/30">
                {displayName?.[0]?.toUpperCase() || "Y"}
              </div>
              <div className="flex-1 flex flex-col">
                <span className="text-sm text-white font-medium">{displayName || "You"} (You)</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">{isHost ? "Meeting Host" : "Participant"}</span>
              </div>
            </div>
            
            {/* Remote Users */}
            {participants.map((p) => (
              <div key={p.socketId} className="participant-item">
                <div className="participant-avatar bg-dark-500 text-gray-300">
                  {p.displayName?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 flex flex-col">
                  <span className="text-sm text-gray-200 font-medium">{p.displayName}</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                    {p.userId === hostId ? "Meeting Host" : "Participant"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Chat Panel Overlay */}
        <ChatPanel
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          socket={socket.current}
          roomId={roomId}
          displayName={displayName}
        />
      </main>

      {/* Error Toast */}
      {error && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] glass px-5 py-3 flex items-center gap-2 text-red-400 text-sm animate-fade-in cursor-pointer shadow-xl border-red-500/30 bg-red-500/10"
          onClick={() => setError(null)}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  );
}

function ParticipantVideo({ participant, isHost, isSpotlight }) {
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
    <div className="w-full h-full relative flex items-center justify-center">
      <video ref={videoRef} autoPlay playsInline className={`w-full h-full ${isSpotlight ? 'object-contain' : 'object-cover'}`} />
      <audio ref={audioRef} autoPlay />

      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-700">
          <div className={`${isSpotlight ? 'w-24 h-24 text-4xl shadow-xl' : 'w-12 h-12 text-xl'} rounded-full bg-dark-500/80 flex items-center justify-center transition-all`}>
            <span className="font-display font-bold text-accent-400">
              {participant.displayName?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
        </div>
      )}

      <div className={`absolute ${isSpotlight ? 'bottom-4 left-4' : 'bottom-1.5 left-1.5'} flex items-center gap-1.5 transition-all`}>
        <span className={`${isSpotlight ? 'px-3 py-1.5 text-sm shadow-lg border border-white/10' : 'px-1.5 py-0.5 text-[10px] shadow-sm'} rounded bg-black/60 font-medium text-white backdrop-blur-md`}>
          {participant.displayName}
        </span>
        {isHost && (
          <span className={`${isSpotlight ? 'px-2 py-1.5' : 'px-1 py-0.5'} rounded bg-yellow-500/30 border border-yellow-500/40 backdrop-blur-md shadow-sm`}>
            <Crown size={isSpotlight ? 14 : 8} className="text-yellow-400" />
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
