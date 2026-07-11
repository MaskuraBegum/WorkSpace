import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from 'lucide-react';
import toast from "react-hot-toast";
import api from "../services/api";

const P = {
  bg: "#0d0d0d",
  surface: "#141414",
  card: "#1a1a1a",
  border: "#2a2218",
  gold: "#f5c842",
  goldDim: "#c9a227",
  goldGlow: "rgba(245,200,66,0.12)",
  text: "#f0ead6",
  textMid: "#8a7d5e",
};

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      if (data.requiresVerification) {
        toast.success("OTP sent to your email!");
        navigate("/verify-otp", { state: { email: form.email } });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10"
      style={{ background: P.bg }}
    >
      {/* Background glows */}
      <div className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: P.gold, top: "-120px", left: "-100px" }} />
      <div className="absolute w-72 h-72 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: P.gold, bottom: "-120px", right: "-100px" }} />

      {/* Card */}
      <div
        className="relative w-full max-w-md rounded-3xl p-8 md:p-10 border shadow-2xl"
        style={{ background: P.card, borderColor: P.border, boxShadow: `0 0 40px ${P.goldGlow}` }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl"
            style={{ background: `linear-gradient(135deg, ${P.gold}, ${P.goldDim})` }}
          >
            ⚡
          </div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: P.gold }}>
            Create Account
          </h1>
          <p className="mt-2 text-sm" style={{ color: P.textMid }}>
            Join WorkSpace — your productivity hub
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: P.textMid }}>
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="John Doe"
              value={form.name}
              onChange={handleChange("name")}
              className="w-full rounded-xl px-4 py-3 outline-none transition-all duration-200 border text-sm"
              style={{ background: P.surface, color: P.text, borderColor: P.border }}
              onFocus={e => e.target.style.borderColor = P.gold}
              onBlur={e => e.target.style.borderColor = P.border}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: P.textMid }}>
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange("email")}
              className="w-full rounded-xl px-4 py-3 outline-none transition-all duration-200 border text-sm"
              style={{ background: P.surface, color: P.text, borderColor: P.border }}
              onFocus={e => e.target.style.borderColor = P.gold}
              onBlur={e => e.target.style.borderColor = P.border}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: P.textMid }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange("password")}
                className="w-full rounded-xl px-4 py-3 pr-11 outline-none transition-all duration-200 border text-sm"
                style={{ background: P.surface, color: P.text, borderColor: P.border }}
                onFocus={e => e.target.style.borderColor = P.gold}
                onBlur={e => e.target.style.borderColor = P.border}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition"
                style={{ color: P.textMid }}
                onMouseEnter={e => e.currentTarget.style.color = P.gold}
                onMouseLeave={e => e.currentTarget.style.color = P.textMid}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-1.5 text-xs" style={{ color: P.textMid }}>
              Minimum 6 characters
            </p>
          </div>

          {/* OTP notice */}
          <div
            className="flex items-start gap-3 rounded-xl p-3 text-xs"
            style={{ background: 'rgba(245,200,66,0.06)', border: `1px solid rgba(245,200,66,0.15)` }}
          >
            <span className="text-base flex-shrink-0">📧</span>
            <p style={{ color: P.textMid, lineHeight: 1.5 }}>
              We'll send a <strong style={{ color: P.gold }}>6-digit verification code</strong> to your email to confirm your account.
            </p>
          </div>

          {/* Submit */}
          <button
            disabled={loading}
            type="submit"
            className="w-full rounded-xl py-3 font-bold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100"
            style={{
              background: `linear-gradient(135deg, ${P.gold}, ${P.goldDim})`,
              color: "#111",
              boxShadow: `0 4px 20px ${P.goldGlow}`,
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin inline-block" />
                Sending OTP...
              </span>
            ) : 'Create Account →'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: P.border }} />
          <span className="text-xs" style={{ color: P.textMid }}>OR</span>
          <div className="flex-1 h-px" style={{ background: P.border }} />
        </div>

        <p className="text-center text-sm" style={{ color: P.textMid }}>
          Already have an account?{" "}
          <Link to="/login" className="font-bold transition hover:underline" style={{ color: P.gold }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}