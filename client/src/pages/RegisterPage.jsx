import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { UserPlus, ArrowRight, Loader } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await register(name, email, password);
      navigate("/verify-otp");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="mesh-bg" />

      <div className="glass w-full max-w-md p-8 animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent-500/15 flex items-center justify-center mx-auto mb-4">
            <UserPlus size={24} className="text-accent-400" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white">Create Account</h1>
          <p className="text-sm text-gray-400 mt-1">Join Peer Connect</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            id="register-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            required
            className="w-full px-4 py-3 rounded-xl bg-dark-700 border border-dark-500 text-white placeholder:text-gray-500 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/40 transition-all text-sm"
          />
          <input
            type="email"
            id="register-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full px-4 py-3 rounded-xl bg-dark-700 border border-dark-500 text-white placeholder:text-gray-500 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/40 transition-all text-sm"
          />
          <input
            type="password"
            id="register-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-xl bg-dark-700 border border-dark-500 text-white placeholder:text-gray-500 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/40 transition-all text-sm"
          />

          <button
            type="submit"
            disabled={loading}
            id="btn-register"
            className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-accent-500/20 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            {loading ? (
              <Loader size={18} className="animate-spin" />
            ) : (
              <>
                Create Account
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-accent-300 hover:text-accent-200 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
