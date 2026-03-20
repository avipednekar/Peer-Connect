import { Mic, MicOff, Video, VideoOff, PhoneOff, DoorOpen } from "lucide-react";

export default function Controls({ isMuted, isVideoOff, onToggleMute, onToggleVideo, onLeave, isHost, onHostEnd }) {
  return (
    <div className="flex items-center justify-center gap-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
      {/* Mute / Unmute */}
      <button
        onClick={onToggleMute}
        className="control-btn"
        style={{ background: isMuted ? "#ef4444" : "rgba(99, 102, 241, 0.25)" }}
        title={isMuted ? "Unmute" : "Mute"}
        id="btn-toggle-mute"
      >
        {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
      </button>

      {/* Video On / Off */}
      <button
        onClick={onToggleVideo}
        className="control-btn"
        style={{ background: isVideoOff ? "#ef4444" : "rgba(99, 102, 241, 0.25)" }}
        title={isVideoOff ? "Turn on camera" : "Turn off camera"}
        id="btn-toggle-video"
      >
        {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
      </button>

      {/* Leave / End Meeting — single button, different behaviour for host */}
      {isHost ? (
        <button
          onClick={onHostEnd}
          className="control-btn px-5 gap-2 flex items-center"
          style={{ background: "#ef4444" }}
          title="End Meeting for All"
          id="btn-end-meeting"
        >
          <PhoneOff size={20} />
          <span className="text-sm font-semibold hidden sm:inline">End All</span>
        </button>
      ) : (
        <button
          onClick={onLeave}
          className="control-btn"
          style={{ background: "#ef4444" }}
          title="Leave call"
          id="btn-leave-call"
        >
          <DoorOpen size={22} />
        </button>
      )}
    </div>
  );
}
