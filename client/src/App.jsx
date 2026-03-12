import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import { useWebRTC } from "./hooks/useWebRTC";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import LobbyPage from "./pages/LobbyPage";
import NamePrompt from "./components/NamePrompt";
import IncomingCall from "./components/IncomingCall";
import Controls from "./components/Controls";
import { useState } from "react";
import { Loader, WifiOff, AlertCircle, Users } from "lucide-react";

function AppContent() {
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const {
    connectionState, isMuted, isVideoOff, error, peerName,
    localVideoRef, remoteVideoRef, joinRoom, leaveRoom,
    toggleMute, toggleVideo, onlineUsers, incomingCall,
    callFriend, acceptCall, rejectCall, socket,
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
    if (!activeSocket) {
      return;
    }

    activeSocket.once("call-accepted", ({ roomId: acceptedRoomId }) => {
      navigate(`/room/${acceptedRoomId}`);
    });
    callFriend(friend._id, user.name);
  };

  const handleAcceptCall = () => {
    const roomId = acceptCall();
    if (roomId) {
      navigate(`/room/${roomId}`);
    }
  };

  return (
    <>
      {/* Incoming call overlay (shows on any page) */}
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
          path="/"
          element={
            isAuthenticated ? (
              <LobbyPage
                onlineUsers={onlineUsers}
                onCallFriend={handleCallFriend}
              />
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
              peerName={peerName}
              localVideoRef={localVideoRef}
              remoteVideoRef={remoteVideoRef}
              joinRoom={joinRoom}
              leaveRoom={leaveRoom}
              toggleMute={toggleMute}
              toggleVideo={toggleVideo}
            />
          }
        />
      </Routes>
    </>
  );
}

function RoomPage({
  user, connectionState, isMuted, isVideoOff, error, peerName,
  localVideoRef, remoteVideoRef, joinRoom, leaveRoom, toggleMute, toggleVideo,
}) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [showNamePrompt, setShowNamePrompt] = useState(true);
  const [displayName, setDisplayName] = useState(user?.name || "");

  const handleJoinWithName = (name) => {
    setDisplayName(name);
    setShowNamePrompt(false);
    joinRoom(roomId, name);
  };

  const handleLeave = () => {
    leaveRoom();
    navigate("/");
  };

  // Show name prompt first
  if (showNamePrompt && connectionState === "idle") {
    return (
      <div className="min-h-screen relative">
        <div className="mesh-bg" />
        <NamePrompt
          defaultName={user?.name || ""}
          roomId={roomId}
          onJoin={handleJoinWithName}
        />
      </div>
    );
  }

  // Video call view
  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="mesh-bg" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <h1 className="text-lg font-display font-bold bg-gradient-to-r from-accent-300 to-accent-400 bg-clip-text text-transparent">
          Peer Connect
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-400 font-mono glass-light px-3 py-1 rounded-full text-xs">
            #{roomId}
          </span>
          {connectionState === "joining" && (
            <span className="flex items-center gap-2 text-yellow-400 glass-light px-3 py-1.5 rounded-full text-xs animate-fade-in">
              <Loader size={14} className="animate-spin" />
              Waiting for peer…
            </span>
          )}
          {connectionState === "connected" && (
            <span className="flex items-center gap-2 text-green-400 glass-light px-3 py-1.5 rounded-full text-xs animate-fade-in">
              <Users size={14} />
              Connected{peerName ? ` with ${peerName}` : ""}
            </span>
          )}
          {connectionState === "failed" && (
            <span className="flex items-center gap-2 text-red-400 glass-light px-3 py-1.5 rounded-full text-xs animate-fade-in">
              <WifiOff size={14} />
              Disconnected
            </span>
          )}
        </div>
      </header>

      {/* Videos */}
      <main className="flex-1 relative z-10 flex items-center justify-center px-4 pb-4 gap-4">
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
          {/* Local video */}
          <div className="video-container aspect-video">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-dark-700">
                <div className="w-20 h-20 rounded-full bg-dark-500/80 flex items-center justify-center">
                  <span className="text-3xl font-display font-bold text-accent-400">
                    {displayName?.[0]?.toUpperCase() || "Y"}
                  </span>
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full glass-light text-xs font-medium text-accent-300">
              {displayName || "You"}
            </div>
          </div>

          {/* Remote video */}
          <div className="video-container aspect-video">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {connectionState === "joining" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-700/90 gap-3">
                <Loader size={32} className="text-accent-400 animate-spin" />
                <p className="text-sm text-gray-400">Waiting for peer to join…</p>
              </div>
            )}
            <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full glass-light text-xs font-medium text-accent-300">
              {peerName || "Peer"}
            </div>
          </div>
        </div>
      </main>

      {/* Controls */}
      <div className="relative z-10 flex justify-center pb-6 pt-2">
        <div className="glass px-6 py-3 rounded-2xl">
          <Controls
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
            onLeave={handleLeave}
          />
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass px-5 py-3 flex items-center gap-2 text-red-400 text-sm animate-fade-in">
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
