import { useEffect, useRef } from "react";
import { Crown, MicOff } from "lucide-react";

export default function ParticipantVideo({ participant, isHost, isSpotlight }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (participant.streams?.video && videoRef.current) {
      videoRef.current.srcObject = participant.streams.video;
    }
  }, [participant.streams?.video]);

  const hasVideo = !!participant.streams?.video && !participant.isvideoPaused;

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      <video ref={videoRef} autoPlay playsInline className={`w-full h-full ${isSpotlight ? 'object-contain' : 'object-cover'} ${!hasVideo ? 'hidden' : ''}`} />
      <audio 
        ref={(node) => {
          if (node && participant.streams?.audio && node.srcObject !== participant.streams.audio) {
            node.srcObject = participant.streams.audio;
            // Aggressively attempt playback to bypass strict browser autoplay policies
            node.play().catch(e => console.warn("Audio autoplay blocked by browser:", e));
          }
        }} 
        autoPlay 
        playsInline 
      />

      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-700">
          <div className={`${isSpotlight ? 'w-24 h-24 text-4xl shadow-xl' : 'w-16 h-16 text-2xl'} rounded-full bg-dark-500/80 flex items-center justify-center transition-all`}>
            <span className="font-display font-bold text-accent-400">
              {participant.displayName?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
        </div>
      )}

      <div className={`absolute ${isSpotlight ? 'bottom-4 left-4' : 'bottom-2 left-2'} flex items-center gap-1.5 transition-all`}>
        <span className={`${isSpotlight ? 'px-3 py-1.5 text-sm shadow-lg border border-white/10' : 'px-2 py-1 text-xs shadow-sm'} flex items-center gap-1.5 rounded-lg bg-black/60 font-medium text-white backdrop-blur-md`}>
          {participant.isaudioPaused && <MicOff size={isSpotlight ? 14 : 12} className="text-red-400" />}
          {participant.displayName}
        </span>
        {isHost && (
          <span className={`${isSpotlight ? 'px-2 py-1.5' : 'px-1.5 py-1'} rounded-lg bg-yellow-500/30 border border-yellow-500/40 backdrop-blur-md shadow-sm`}>
            <Crown size={isSpotlight ? 14 : 12} className="text-yellow-400" />
          </span>
        )}
      </div>
    </div>
  );
}
