import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const P = {
  bg: '#0d0d0d',
  surface: '#141414',
  card: '#1a1a1a',
  border: '#2a2218',
  borderHover: '#3d3220',
  gold: '#f5c842',
  goldDim: '#c9a227',
  goldGlow: 'rgba(245,200,66,0.12)',
  text: '#f0ead6',
  textMid: '#8a7d5e',
  textDim: '#4a4030',
  green: '#4ade80',
  yellow: '#facc15',
  red: '#f87171',
  slate: '#94a3b8',
};

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', form);

      setUser(data);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: P.bg }}
    >
      {/* Glow Background */}
      <div
        className="absolute w-72 h-72 rounded-full blur-3xl opacity-30"
        style={{
          background: P.gold,
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />

      <div
        className="
          relative w-full max-w-md
          rounded-3xl p-6 sm:p-8
          shadow-2xl
          border
        "
        style={{
          background: P.card,
          borderColor: P.border,
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div
            className="
              w-16 h-16 rounded-2xl
              flex items-center justify-center
              text-2xl font-bold
            "
            style={{
              background: P.goldGlow,
              color: P.gold,
              border: `1px solid ${P.border}`,
            }}
          >
            W
          </div>
        </div>

        <h1
          className="text-3xl font-bold text-center mb-2"
          style={{ color: P.text }}
        >
          Welcome back
        </h1>

        <p
          className="text-center text-sm mb-8"
          style={{ color: P.textMid }}
        >
          Sign in to your WorkSpace account
        </p>


        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <div>
            <label
              className="text-sm block mb-2"
              style={{ color: P.slate }}
            >
              Email address
            </label>

            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
              placeholder="you@example.com"
              required
              className="
                w-full px-4 py-3.5 rounded-xl
                outline-none transition-all
                text-sm
              "
              style={{
                background: P.surface,
                color: P.text,
                border: `1px solid ${P.border}`,
              }}
              onFocus={(e) =>
                e.target.style.borderColor = P.gold
              }
              onBlur={(e) =>
                e.target.style.borderColor = P.border
              }
            />
          </div>


          {/* Password */}
          <div>
            <label
              className="text-sm block mb-2"
              style={{ color: P.slate }}
            >
              Password
            </label>

            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value,
                })
              }
              placeholder="••••••••"
              required
              className="
                w-full px-4 py-3.5 rounded-xl
                outline-none transition-all
                text-sm
              "
              style={{
                background: P.surface,
                color: P.text,
                border: `1px solid ${P.border}`,
              }}
              onFocus={(e) =>
                e.target.style.borderColor = P.gold
              }
              onBlur={(e) =>
                e.target.style.borderColor = P.border
              }
            />
          </div>


          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="
              w-full py-3.5 rounded-xl
              font-semibold
              transition-all duration-300
              disabled:opacity-50
              hover:-translate-y-0.5
            "
            style={{
              background: P.gold,
              color: '#111',
              boxShadow: `0 0 25px ${P.goldGlow}`,
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

        </form>


        <div
          className="my-7 h-px"
          style={{ background: P.border }}
        />


        <p
          className="text-center text-sm"
          style={{ color: P.textMid }}
        >
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-semibold hover:underline"
            style={{ color: P.gold }}
          >
            Create account
          </Link>
        </p>

      </div>
    </div>
  );
}