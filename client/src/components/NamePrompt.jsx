import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { Users, Crown, AlertTriangle, Mic, MicOff, Video, VideoOff } from "lucide-react";

export default function NamePrompt({ defaultName, roomId, onJoin }) {
  const [name, setName] = useState(defaultName || "");
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [previewStream, setPreviewStream] = useState(null);
  const videoPreviewRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch meeting info
  useEffect(() => {
    api.getMeeting(roomId)
      .then((data) => setMeetingInfo(data))
      .catch(() => setMeetingInfo(null))
      .finally(() => setLoading(false));
  }, [roomId]);

  const [permissionError, setPermissionError] = useState(null);

  const isJoiningRef = useRef(false);

  // Stop tracks on unmount (unless we are joining the room)
  useEffect(() => {
    return () => {
      if (previewStream && !isJoiningRef.current) {
        previewStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [previewStream]);

  const requestPermissions = async () => {
    try {
      setPermissionError(null);
      
      // HTTPS warning check
      if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
        console.warn("WebRTC requires HTTPS or localhost. getUserMedia may fail.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setPreviewStream(stream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      setCamOn(true);
      setMicOn(true);
    } catch (err) {
      console.error("Permission error:", err);
      if (err.name === "NotAllowedError") {
        setPermissionError("Camera/Mic access denied. Please allow permissions in your browser settings and try again.");
      } else if (err.name === "NotFoundError") {
        setPermissionError("No camera or microphone found on this device.");
      } else {
        setPermissionError(`Could not access devices: ${err.message}. Note: Mobile requires HTTPS.`);
      }
      setCamOn(false);
      setMicOn(false);
    }
  };

  // Sync preview with toggles
  useEffect(() => {
    if (!previewStream) return;
    previewStream.getVideoTracks().forEach((t) => { t.enabled = camOn; });
  }, [camOn, previewStream]);

  useEffect(() => {
    if (!previewStream) return;
    previewStream.getAudioTracks().forEach((t) => { t.enabled = micOn; });
  }, [micOn, previewStream]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    // Flag this transition so unmount doesn't destroy the stream
    isJoiningRef.current = true;
    
    // Pass the existing stream cleanly into the active room to strictly bypass mobile permission loss
    onJoin(name.trim(), { micOn, camOn }, previewStream);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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
          <p className="text-sm text-gray-400">This meeting has been ended by the host.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen relative">
      <div className="glass w-full max-w-lg p-8 animate-fade-in relative z-10">
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-accent-500/15 flex items-center justify-center mx-auto mb-3">
            <Users size={24} className="text-accent-400" />
          </div>
          <h2 className="text-xl font-display font-bold text-white">Join Meeting</h2>

          {meetingInfo && (
            <div className="mt-2 flex items-center justify-center gap-2 text-sm text-gray-400">
              <Crown size={14} className="text-yellow-400" />
              <span>Hosted by <span className="text-white font-medium">{meetingInfo.hostName}</span></span>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-1 font-mono">Room: #{roomId}</p>
        </div>

        {/* Camera Preview */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-dark-700 mb-4 flex items-center justify-center flex-col">
          <video
            ref={videoPreviewRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!camOn || !previewStream ? 'hidden' : ''}`}
          />
          
          {!previewStream ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-800/90 p-4 text-center z-20">
              <div className="w-16 h-16 rounded-full bg-dark-600/50 flex items-center justify-center mb-4 text-gray-400">
                <VideoOff size={24} />
              </div>
              <p className="text-sm text-gray-300 font-medium mb-4">
                We need access to your camera and microphone.
              </p>
              {permissionError && (
                <div className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg w-full max-w-xs">
                  {permissionError}
                </div>
              )}
              <button
                type="button"
                onClick={requestPermissions}
                className="px-5 py-2.5 bg-accent-600 hover:bg-accent-500 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Enable Camera & Mic
              </button>
            </div>
          ) : !camOn ? (
            <div className="absolute inset-0 flex items-center justify-center bg-dark-800">
              <div className="w-20 h-20 rounded-full bg-dark-500/80 flex items-center justify-center shadow-lg">
                <span className="text-3xl font-display font-bold text-accent-400">
                  {name?.[0]?.toUpperCase() || "?"}
                </span>
              </div>
            </div>
          ) : null}

          {/* Mic/Cam toggles overlaid on preview (only show if permissions granted) */}
          {previewStream && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-30">
            <button
              onClick={() => setMicOn((v) => !v)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all"
              style={{ background: micOn ? "rgba(99,102,241,0.35)" : "#ef4444" }}
              title={micOn ? "Mute mic" : "Unmute mic"}
            >
              {micOn ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button
              onClick={() => setCamOn((v) => !v)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all"
              style={{ background: camOn ? "rgba(99,102,241,0.35)" : "#ef4444" }}
              title={camOn ? "Turn off camera" : "Turn on camera"}
            >
              {camOn ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
          </div>
          )}
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
