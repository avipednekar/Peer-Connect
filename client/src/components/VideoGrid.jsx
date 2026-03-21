import { useState, useEffect } from "react";
import ParticipantVideo from "./ParticipantVideo";
import { MicOff } from "lucide-react";

export default function VideoGrid({ 
  localVideoRef,
  localStream,
  displayName, 
  isVideoOff, 
  isMuted,
  isHost, 
  hostId, 
  participants 
}) {
  const totalVideos = 1 + participants.length;

  // Determine grid classes dynamically based on the number of participants
  let gridClasses = "w-full h-full p-2 gap-2 bg-black pb-24 md:pb-2 grid ";
  
  if (totalVideos === 1) {
    // 1 user -> full screen centered (grid-cols-1)
    gridClasses += "grid-cols-1 max-w-5xl mx-auto h-full items-center";
  } else if (totalVideos === 2) {
    // 2 users -> Mobile: stacked vertically (grid-rows-2). Tablet/Desktop: side-by-side (grid-cols-2)
    gridClasses += "grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1";
  } else if (totalVideos === 3 || totalVideos === 4) {
    // 3-4 users -> 2x2 grid (1 column on mobile, 2 columns on sm)
    gridClasses += "grid-cols-1 sm:grid-cols-2 grid-rows-[repeat(auto-fit,minmax(0,1fr))] overflow-y-auto sm:overflow-hidden";
  } else {
    // 5+ users -> Auto columns
    gridClasses += "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-fr overflow-y-auto sm:overflow-hidden";
  }

  // Common wrapper for each video cell
  const CellWrapper = ({ children, isHostBadge }) => (
    <div className={`relative w-full h-full rounded-xl overflow-hidden bg-dark-800 shadow-inner flex items-center justify-center border-2 border-transparent`}>
      {children}
    </div>
  );

  return (
    <div className={gridClasses}>
      <CellWrapper isHostBadge={isHost}>
        <video 
           ref={(node) => {
             // 1. Maintain the external ref expected by useWebRTC
             if (localVideoRef) {
               localVideoRef.current = node;
             }
             // 2. Safely sync the srcObject the exact millisecond the DOM node boots up
             if (node && localStream && node.srcObject !== localStream) {
               node.srcObject = localStream;
             }
           }} 
           autoPlay 
           playsInline 
           muted 
           className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`} 
        />
        {isVideoOff && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-800">
            <div className="w-24 h-24 rounded-full bg-dark-600/80 flex items-center justify-center shadow-xl">
              <span className="text-4xl font-display font-bold text-accent-400">
                {displayName?.[0]?.toUpperCase() || "Y"}
              </span>
            </div>
          </div>
        )}
        <div className="absolute bottom-3 left-3 flex gap-2">
          <span className="px-2.5 py-1 flex items-center gap-1.5 rounded bg-black/60 text-xs font-medium text-white backdrop-blur-md">
            {isMuted && <MicOff size={14} className="text-red-400" />}
            {displayName || "You"} (You)
          </span>
        </div>
      </CellWrapper>

      {participants.map((p) => (
        <CellWrapper key={p.socketId} isHostBadge={p.userId === hostId}>
          <ParticipantVideo 
             participant={p} 
             isHost={p.userId === hostId} 
             // We pass isSpotlight=false so ParticipantVideo uses object-cover, fitting the user request perfectly
             isSpotlight={false} 
          />
        </CellWrapper>
      ))}
    </div>
  );
}
