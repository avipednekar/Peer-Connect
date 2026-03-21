import { useState, useEffect } from "react";
import { Settings, X, Mic, Video } from "lucide-react";

export default function SettingsPanel({ isOpen, onClose }) {
  const [cameras, setCameras] = useState([]);
  const [mics, setMics] = useState([]);
  const [selectedCam, setSelectedCam] = useState("");
  const [selectedMic, setSelectedMic] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    
    // Enumerate devices when opened
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        const videoInput = devices.filter(d => d.kind === "videoinput");
        const audioInput = devices.filter(d => d.kind === "audioinput");
        setCameras(videoInput);
        setMics(audioInput);
        if (videoInput.length > 0) setSelectedCam(videoInput[0].deviceId);
        if (audioInput.length > 0) setSelectedMic(audioInput[0].deviceId);
      })
      .catch(err => console.error("Error fetching devices", err));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Settings Modal / Bottom Sheet */}
      <div className="fixed z-[70] bottom-0 inset-x-0 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:bottom-auto md:w-full md:max-w-md bg-dark-900 border-t md:border border-dark-600 shadow-2xl rounded-t-2xl md:rounded-2xl flex flex-col transition-transform duration-300 transform translate-y-0 max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-gray-400" />
            <h2 className="text-lg font-display font-semibold text-white">Device Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-6 overflow-y-auto">
          
          {/* Camera Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Video size={16} className="text-accent-400" />
              Camera
            </label>
            <div className="relative">
              <select 
                value={selectedCam}
                onChange={(e) => setSelectedCam(e.target.value)}
                className="w-full appearance-none p-4 rounded-xl bg-dark-800 border border-dark-500 text-white text-base outline-none focus:border-accent-500 transition-all cursor-pointer"
              >
                {cameras.length === 0 && <option value="">No cameras found</option>}
                {cameras.map(c => (
                  <option key={c.deviceId} value={c.deviceId}>
                    {c.label || `Camera ${c.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          {/* Microphone Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Mic size={16} className="text-accent-400" />
              Microphone
            </label>
            <div className="relative">
              <select 
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                className="w-full appearance-none p-4 rounded-xl bg-dark-800 border border-dark-500 text-white text-base outline-none focus:border-accent-500 transition-all cursor-pointer"
              >
                {mics.length === 0 && <option value="">No microphones found</option>}
                {mics.map(m => (
                  <option key={m.deviceId} value={m.deviceId}>
                    {m.label || `Microphone ${m.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/5 bg-dark-800/50 rounded-b-2xl">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-accent-600 hover:bg-accent-500 text-white rounded-xl text-base font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
