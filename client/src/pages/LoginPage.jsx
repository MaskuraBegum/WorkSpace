import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const P = {
  bg: '#0d0d0d',
  surface: '#141414',
  card: '#1a1a1a',
  border: '#2a2218',
  gold: '#f5c842',
  goldDim: '#c9a227',
  goldGlow: 'rgba(245,200,66,0.12)',
  text: '#f0ead6',
  textMid: '#8a7d5e',
};

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
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
      const errData = error.response?.data;
      if (errData?.requiresVerification) {
        toast.error('Please verify your email first');
        navigate('/verify-otp', { state: { email: errData.email } });
        return;
      }
      toast.error(errData?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden"
      style={{ background: P.bg }}
    >
      {/* Glow */}
      <div
        className="absolute w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: P.gold, top: '5%', left: '50%', transform: 'translateX(-50%)' }}
      />

      <div
        className="relative w-full max-w-md rounded-3xl p-8 border shadow-2xl"
        style={{ background: P.card, borderColor: P.border, boxShadow: `0 0 40px ${P.goldGlow}` }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black"
            style={{ background: `linear-gradient(135deg, ${P.gold}, ${P.goldDim})`, color: '#0d0d0d' }}
          >
            ⚡
          </div>
        </div>

        <h1 className="text-3xl font-black text-center mb-2 tracking-tight" style={{ color: P.text }}>
          Welcome back
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: P.textMid }}>
          Sign in to your WorkSpace account
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: P.textMid }}>
              Email address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 rounded-xl outline-none transition-all text-sm border"
              style={{ background: P.surface, color: P.text, borderColor: P.border }}
              onFocus={e => e.target.style.borderColor = P.gold}
              onBlur={e => e.target.style.borderColor = P.border}
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: P.textMid }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 pr-11 rounded-xl outline-none transition-all text-sm border"
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
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100"
            style={{
              background: `linear-gradient(135deg, ${P.gold}, ${P.goldDim})`,
              color: '#111',
              boxShadow: `0 4px 20px ${P.goldGlow}`,
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin inline-block" />
                Signing in...
              </span>
            ) : 'Sign in →'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: P.border }} />
          <span className="text-xs" style={{ color: P.textMid }}>OR</span>
          <div className="flex-1 h-px" style={{ background: P.border }} />
        </div>

        <p className="text-center text-sm" style={{ color: P.textMid }}>
          Don't have an account?{' '}
          <Link to="/register" className="font-bold hover:underline transition" style={{ color: P.gold }}>
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}