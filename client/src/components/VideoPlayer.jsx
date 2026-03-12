import { useEffect, useRef } from "react";

export default function VideoPlayer({ stream, muted = false, label, isVideoOff = false }) {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="video-container relative group">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={muted}
                className="w-full h-full object-cover"
            />

            {/* Video off overlay */}
            {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-dark-700">
                    <div className="w-20 h-20 rounded-full bg-dark-500 flex items-center justify-center">
                        <span className="text-3xl font-display font-bold text-accent-400">
                            {label?.[0]?.toUpperCase() || "?"}
                        </span>
                    </div>
                </div>
            )}

            {/* Label badge */}
            <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full glass-light text-xs font-medium text-accent-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {label}
            </div>
        </div>
    );
}
