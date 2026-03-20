import { Mic, MicOff, Video, VideoOff, PhoneOff, DoorOpen, MonitorUp } from "lucide-react";

export default function Controls({ isMuted, isVideoOff, onToggleMute, onToggleVideo, onLeave, isHost, onHostEnd }) {
  return (
    <div className="flex items-center gap-2">
      {/* Mute / Unmute */}
      <button
        onClick={onToggleMute}
        className="meeting-btn group"
        data-active={!isMuted}
        style={{ background: isMuted ? "rgba(239,68,68,0.9)" : "rgba(255,255,255,0.08)" }}
        title={isMuted ? "Unmute" : "Mute"}
        id="btn-toggle-mute"
      >
        <span className="meeting-btn-icon">
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </span>
        <span className="meeting-btn-label">{isMuted ? "Unmute" : "Mute"}</span>
      </button>

      {/* Video On / Off */}
      <button
        onClick={onToggleVideo}
        className="meeting-btn group"
        data-active={!isVideoOff}
        style={{ background: isVideoOff ? "rgba(239,68,68,0.9)" : "rgba(255,255,255,0.08)" }}
        title={isVideoOff ? "Turn on camera" : "Turn off camera"}
        id="btn-toggle-video"
      >
        <span className="meeting-btn-icon">
          {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </span>
        <span className="meeting-btn-label">{isVideoOff ? "Start Video" : "Stop Video"}</span>
      </button>

      {/* Divider */}
      <div className="w-px h-8 bg-white/10 mx-1" />

      {/* Leave / End Meeting */}
      {isHost ? (
        <button
          onClick={onHostEnd}
          className="meeting-btn-end group"
          title="End Meeting for All"
          id="btn-end-meeting"
        >
          <span className="meeting-btn-icon">
            <PhoneOff size={20} />
          </span>
          <span className="meeting-btn-label">End Meeting</span>
        </button>
      ) : (
        <button
          onClick={onLeave}
          className="meeting-btn-leave group"
          title="Leave Meeting"
          id="btn-leave-call"
        >
          <span className="meeting-btn-icon">
            <DoorOpen size={20} />
          </span>
          <span className="meeting-btn-label">Leave</span>
        </button>
      )}
    </div>
  );
}
