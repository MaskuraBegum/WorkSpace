import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import useAuthStore from "../store/authStore";

// ── Palette ──────────────────────────────────────────────
const P = {
  bg: "#0d0d0d",
  surface: "#141414",
  card: "#1a1a1a",
  border: "#2a2218",
  borderHover: "#3d3220",
  gold: "#f5c842",
  goldDim: "#c9a227",
  goldGlow: "rgba(245,200,66,0.12)",
  text: "#f0ead6",
  textMid: "#8a7d5e",
  textDim: "#4a4030",
  green: "#4ade80",
  yellow: "#facc15",
  red: "#f87171",
  slate: "#94a3b8",
};

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    setLoading(true);

    try {
      const { data } = await api.post("/auth/register", form);

      setUser(data);
      toast.success("Account created!");
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10"
      style={{ background: P.bg }}
    >
      {/* Background Glow */}
      <div
        className="absolute w-[450px] h-[450px] rounded-full blur-3xl opacity-20"
        style={{
          background: P.gold,
          top: "-120px",
          left: "-100px",
        }}
      />

      <div
        className="absolute w-[350px] h-[350px] rounded-full blur-3xl opacity-10"
        style={{
          background: P.gold,
          bottom: "-120px",
          right: "-100px",
        }}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-md rounded-3xl p-8 md:p-10 backdrop-blur-xl border shadow-2xl"
        style={{
          background: P.card,
          borderColor: P.border,
          boxShadow: `0 0 40px ${P.goldGlow}`,
        }}
      >
        {/* Heading */}
        <div className="text-center mb-8">
          <h1
            className="text-4xl font-bold tracking-wide"
            style={{ color: P.gold }}
          >
            Create Account
          </h1>

          <p
            className="mt-3 text-sm"
            style={{ color: P.textMid }}
          >
            Join WorkSpace and start managing your work beautifully.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* Name */}
          <div>
            <label
              className="block mb-2 text-sm"
              style={{ color: P.text }}
            >
              Full Name
            </label>

            <input
              type="text"
              required
              placeholder="John Doe"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              className="w-full rounded-xl px-4 py-3 outline-none transition-all duration-300 border"
              style={{
                background: P.surface,
                color: P.text,
                borderColor: P.border,
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = P.gold)
              }
              onBlur={(e) =>
                (e.target.style.borderColor = P.border)
              }
            />
          </div>

          {/* Email */}
          <div>
            <label
              className="block mb-2 text-sm"
              style={{ color: P.text }}
            >
              Email Address
            </label>

            <input
              type="email"
              required
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
              className="w-full rounded-xl px-4 py-3 outline-none transition-all duration-300 border"
              style={{
                background: P.surface,
                color: P.text,
                borderColor: P.border,
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = P.gold)
              }
              onBlur={(e) =>
                (e.target.style.borderColor = P.border)
              }
            />
          </div>

          {/* Password */}
          <div>
            <label
              className="block mb-2 text-sm"
              style={{ color: P.text }}
            >
              Password
            </label>

            <input
              type="password"
              required
              placeholder="••••••••"
              value={form.password}
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value,
                })
              }
              className="w-full rounded-xl px-4 py-3 outline-none transition-all duration-300 border"
              style={{
                background: P.surface,
                color: P.text,
                borderColor: P.border,
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = P.gold)
              }
              onBlur={(e) =>
                (e.target.style.borderColor = P.border)
              }
            />

            <p
              className="mt-2 text-xs"
              style={{ color: P.textMid }}
            >
              Minimum 6 characters.
            </p>
          </div>

          {/* Button */}
          <button
            disabled={loading}
            type="submit"
            className="w-full rounded-xl py-3 font-semibold text-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            style={{
              background: `linear-gradient(135deg, ${P.gold}, ${P.goldDim})`,
              color: "#111",
              boxShadow: `0 0 20px ${P.goldGlow}`,
            }}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-8">
          <div
            className="flex-1 h-px"
            style={{ background: P.border }}
          />

          <span
            className="text-sm"
            style={{ color: P.textMid }}
          >
            OR
          </span>

          <div
            className="flex-1 h-px"
            style={{ background: P.border }}
          />
        </div>

        {/* Login */}
        <p
          className="text-center text-sm"
          style={{ color: P.textMid }}
        >
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold transition"
            style={{ color: P.gold }}
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}