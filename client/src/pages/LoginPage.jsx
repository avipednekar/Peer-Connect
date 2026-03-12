import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { LogIn, Mail, Lock, AlertCircle, Video } from "lucide-react";

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await login(email, password);
            navigate("/");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative">
            <div className="mesh-bg" />

            <div className="relative z-10 w-full max-w-md animate-fade-in">
                {/* Branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-500/15 mb-4 animate-float">
                        <Video size={28} className="text-accent-400" />
                    </div>
                    <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-accent-300 to-accent-400 bg-clip-text text-transparent">
                        Welcome Back
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Sign in to Peer Connect</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="glass p-8 space-y-5">
                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-4 py-2.5 rounded-xl">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-400/60" />
                            <input
                                type="email"
                                id="login-email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full pl-9 pr-4 py-3 rounded-xl bg-dark-700 border border-dark-500 text-white placeholder:text-gray-500 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/40 transition-all text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-400/60" />
                            <input
                                type="password"
                                id="login-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                className="w-full pl-9 pr-4 py-3 rounded-xl bg-dark-700 border border-dark-500 text-white placeholder:text-gray-500 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/40 transition-all text-sm"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        id="btn-login"
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
                    >
                        {loading ? (
                            <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                        ) : (
                            <>
                                <LogIn size={18} />
                                Sign In
                            </>
                        )}
                    </button>

                    <p className="text-center text-sm text-gray-400">
                        Don't have an account?{" "}
                        <Link to="/register" className="text-accent-400 hover:text-accent-300 font-medium transition-colors">
                            Sign up
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
