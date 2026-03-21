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
import VideoGrid from "./components/VideoGrid";
import SettingsPanel from "./components/SettingsPanel";
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
    setIsMuted, setIsVideoOff, localStream
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
              localStream={localStream}
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
  participants, hostId, localVideoRef, localStream,
  joinRoom, leaveRoom, hostEndMeeting, toggleMute, toggleVideo,
  setIsMuted, setIsVideoOff, socket,
}) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [showNamePrompt, setShowNamePrompt] = useState(true);
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  const handleJoinWithName = (name, mediaSettings, previewStream) => {
    setDisplayName(name);
    setShowNamePrompt(false);
    joinRoom(roomId, name, mediaSettings, previewStream);
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
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-dark-900">
      {/* Header */}
      <header className="flex-shrink-0 relative z-50 flex items-center justify-between px-4 md:px-6 py-3 border-b border-dark-600/50 bg-dark-900/95 backdrop-blur-md">
        <h1 className="text-lg font-display font-bold bg-gradient-to-r from-accent-300 to-accent-400 bg-clip-text text-transparent">
          Peer Connect
        </h1>
        <div className="flex items-center gap-2 md:gap-3 text-sm">
          <span className="text-gray-400 font-mono glass-light px-2.5 md:px-3 py-1 rounded-full text-xs">
            #{roomId}
          </span>
          <button
            onClick={() => {
              setParticipantsOpen(v => {
                if (!v) setChatOpen(false);
                return !v;
              });
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors ${
              participantsOpen ? "bg-accent-500/20 text-accent-300 border border-accent-500/30" : "glass-light text-gray-300 hover:text-white"
            }`}
          >
            <Users size={14} />
            <span className="font-medium hidden sm:inline">{totalVideos}</span>
          </button>
          {connectionState === "joining" && (
            <span className="flex items-center gap-2 text-yellow-400 glass-light px-3 py-1.5 rounded-full text-xs animate-fade-in hidden sm:flex">
              <Loader size={14} className="animate-spin" />
              Connecting…
            </span>
          )}
        </div>
      </header>

      {/* Main Content Area (Video + Sidebars) */}
      <main className="flex-1 flex min-h-0 relative overflow-hidden bg-black">
        
        {/* Center Video Area (takes up all space not used by sidebars) */}
        <div className="flex-1 flex flex-col relative min-w-0 h-full">
          <VideoGrid
            localVideoRef={localVideoRef}
            localStream={localStream}
            displayName={displayName}
            isVideoOff={isVideoOff}
            isMuted={isMuted}
            isHost={isHost}
            hostId={hostId}
            participants={participants}
          />
          
          {/* Controls Bar perfectly centered inside the video area */}
          <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-auto">
            <div className="flex items-center gap-1.5 md:gap-2 p-1.5 rounded-2xl bg-dark-900/85 backdrop-blur-xl border border-white/10 shadow-2xl">
              <Controls
                isMuted={isMuted}
                isVideoOff={isVideoOff}
                onToggleMute={toggleMute}
                onToggleVideo={toggleVideo}
                onLeave={handleLeave}
                isHost={isHost}
                onHostEnd={handleHostEnd}
                onOpenSettings={() => setSettingsOpen(true)}
              />

              <div className="w-px h-10 bg-white/10 mx-1" />

              <button
                onClick={() => {
                  setChatOpen((v) => {
                    if (!v) setParticipantsOpen(false);
                    return !v;
                  });
                  setUnreadChat(0);
                }}
                className="meeting-btn !min-w-[4rem]"
                style={{ background: chatOpen ? "rgba(99,102,241,0.25)" : "transparent" }}
                title="Toggle Chat"
              >
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors">
                  <MessageSquare size={18} />
                  {unreadChat > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm border-2 border-dark-900">
                      {unreadChat > 9 ? "9+" : unreadChat}
                    </span>
                  )}
                </div>
                <span className="meeting-btn-label">Chat</span>
              </button>
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className={`absolute sm:relative inset-0 sm:inset-auto z-[60] sm:z-40 w-full sm:w-80 md:w-96 flex-shrink-0 h-full border-l border-dark-700 bg-dark-800/95 ${chatOpen ? 'block' : 'hidden'}`}>
          <ChatPanel
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
            socket={socket.current}
            roomId={roomId}
            displayName={displayName}
          />
        </div>

        {/* Participants Sidebar */}
        <aside className={`absolute sm:relative inset-0 sm:inset-auto z-[60] sm:z-40 w-full sm:w-80 md:w-96 flex-shrink-0 h-full overflow-y-auto px-4 py-6 border-l border-dark-700 bg-dark-800/95 animate-fade-in ${participantsOpen ? 'block' : 'hidden'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                <Users size={18} className="text-accent-400" />
                People ({totalVideos})
              </h3>
              <button onClick={() => setParticipantsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400">
                ✕
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                <div className="w-10 h-10 rounded-full bg-accent-500/20 text-accent-300 border border-accent-500/30 flex items-center justify-center font-bold">
                  {displayName?.[0]?.toUpperCase() || "Y"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{displayName || "You"} (You)</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{isHost ? "Host" : "Participant"}</p>
                </div>
              </div>
              
              {participants.map((p) => (
                <div key={p.socketId} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-dark-600 text-gray-300 flex items-center justify-center font-bold">
                    {p.displayName?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 font-medium truncate">{p.displayName}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{p.userId === hostId ? "Host" : "Participant"}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
      </main>

      <SettingsPanel 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />

      {/* Error Toast */}
      {error && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] glass px-5 py-3 flex items-center gap-2 text-red-400 text-sm animate-fade-in shadow-xl"
          onClick={() => setError(null)}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}
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
