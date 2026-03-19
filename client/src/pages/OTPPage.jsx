import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { api } from "../api";
import { ShieldCheck, KeyRound, ArrowRight, RefreshCw, Mail } from "lucide-react";

export default function OTPPage() {
  const { email: contextEmail, setToken, setUser } = useAuth();
  const navigate = useNavigate();
  const [email] = useState(() => contextEmail || localStorage.getItem("pendingEmail") || "");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) navigate("/register");
  }, [email, navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = text[i] || "";
    }
    setOtp(newOtp);
    inputRefs.current[Math.min(text.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.verifyOTP(email, code);
      localStorage.setItem("token", data.token);
      localStorage.removeItem("pendingEmail");
      setToken(data.token);
      setUser(data.user);
      navigate("/");
    } catch (err) {
      setError(err.message);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    setError(null);

    try {
      await api.resendOTP(email);
      setCountdown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="mesh-bg" />

      <div className="glass w-full max-w-md p-8 animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent-500/15 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={28} className="text-accent-400" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white">Verify Your Email</h1>
          <p className="text-sm text-gray-400 mt-2">
            We sent a 6-digit code to{" "}
            <span className="text-accent-300 font-medium">{email}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* OTP Input Boxes */}
        <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              id={`otp-input-${i}`}
              className="w-12 h-14 text-center text-xl font-mono font-bold rounded-xl bg-dark-700 border border-dark-500 text-white outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/40 transition-all"
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={loading || otp.join("").length !== 6}
          id="btn-verify-otp"
          className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-accent-500/20 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          {loading ? (
            <KeyRound size={18} className="animate-spin" />
          ) : (
            <>
              Verify Email
              <ArrowRight size={18} />
            </>
          )}
        </button>

        {/* Resend */}
        <div className="text-center mt-6">
          {countdown > 0 ? (
            <p className="text-sm text-gray-500">
              Resend code in <span className="text-accent-300 font-mono">{countdown}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-sm text-accent-300 hover:text-accent-200 transition-colors flex items-center gap-1.5 mx-auto"
            >
              {resending ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Mail size={14} />
              )}
              Resend Code
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
