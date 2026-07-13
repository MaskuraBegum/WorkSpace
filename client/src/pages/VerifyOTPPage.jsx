import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, Mail, ArrowLeft, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

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
  textDim: '#4a4030',
};

export default function VerifyOTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuthStore();
  const email = location.state?.email;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [verified, setVerified] = useState(false);
  const inputs = useRef([]);

  useEffect(() => {
    if (!email) navigate('/register');
  }, [email]);

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputs.current[index + 1]?.focus();
    if (value && index === 5) {
      const filled = [...newOtp];
      filled[5] = value.slice(-1);
      if (filled.every(d => d !== '')) handleVerify(filled.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      const newOtp = paste.split('');
      setOtp(newOtp);
      inputs.current[5]?.focus();
      handleVerify(paste);
    }
  };

  const handleVerify = async (otpValue) => {
    const code = otpValue || otp.join('');
    if (code.length !== 6) return toast.error('Enter all 6 digits');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp: code });
      setVerified(true);
      setTimeout(() => {
        setUser(data);
        toast.success('Email verified! Welcome to WorkSpace 🎉');
        navigate('/');
      }, 1200);
    } catch (error) {
      setAttempts(a => a + 1);
      toast.error(error.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResending(true);
    try {
      await api.post('/auth/resend-otp', { email });
      toast.success('New OTP sent!');
      setCountdown(60);
      setCanResend(false);
      setAttempts(0);
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to resend';
      toast.error(msg);
      if (msg.includes('register again')) {
        setTimeout(() => navigate('/register'), 1500);
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: P.bg }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${P.gold}, ${P.goldDim})` }}>
            <Zap size={20} color="#0d0d0d" fill="#0d0d0d" />
          </div>
          <span className="text-xl font-black" style={{ color: P.text, letterSpacing: '-0.5px' }}>
            WorkSpace
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border p-8"
          style={{ background: P.card, borderColor: P.border, boxShadow: `0 0 40px ${P.goldGlow}` }}>

          {/* Success state */}
          {verified ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)' }}>
                <CheckCircle size={32} color="#4ade80" />
              </div>
              <h2 className="text-xl font-black mb-2" style={{ color: P.text }}>Verified!</h2>
              <p className="text-sm" style={{ color: P.textMid }}>
                Account created! Redirecting...
              </p>
              <div className="flex justify-center gap-1 mt-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full"
                    style={{ background: P.gold, animation: `pulse 1s ease ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Icon */}
              <div className="flex justify-center mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(245,200,66,0.1)', border: `1px solid rgba(245,200,66,0.2)` }}>
                  <Mail size={26} style={{ color: P.gold }} />
                </div>
              </div>

              <h1 className="text-2xl font-black text-center mb-1.5 tracking-tight" style={{ color: P.text }}>
                Check your email
              </h1>

              {/* Email display - Always Unmasked */}
              <div className="text-center mb-2">
                <p className="text-sm" style={{ color: P.textMid }}>
                  We sent a 6-digit code to
                </p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <p className="font-bold text-sm" style={{ color: P.gold }}>
                    {email}
                  </p>
                </div>
              </div>

              {/* Wrong email box */}
              <div
                className="flex  item-center gap-2.5 mb-5 px-3.5 py-3 rounded-xl justify-center "
                style={{ background: 'rgba(245,200,66,0.05)', border: `1px solid rgba(245,200,66,0.15)` }}
              >
                <AlertCircle size={14} style={{ color: P.goldDim, flexShrink: 0, marginTop: '1px' }} />
                <div className='items-center'>
                  <p className="text-[12px] font-medium leading-relaxed" style={{ color: P.textMid }}>
                    Wrong email address?{' '}
                    <button
                      onClick={() => navigate('/register')}
                      className="font-bold underline"
                      style={{ color: P.gold }}
                    >
                      Go back and correct it
                    </button>
                  </p>
                </div>
              </div>

              {/* OTP inputs */}
              <div className="flex gap-2 justify-center mb-5" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => inputs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    className="text-center font-black outline-none transition-all duration-150"
                    style={{
                      width: '46px', height: '54px',
                      background: P.surface,
                      border: `2px solid ${digit ? P.gold : P.border}`,
                      borderRadius: '12px',
                      color: P.gold, fontSize: '22px',
                      caretColor: P.gold,
                    }}
                    onFocus={e => e.target.style.borderColor = P.gold}
                    onBlur={e => e.target.style.borderColor = digit ? P.gold : P.border}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {/* Multiple attempts warning */}
              {attempts >= 2 && (
                <div
                  className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}
                >
                  <AlertCircle size={13} color="#f87171" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <p className="text-[11px] leading-relaxed" style={{ color: '#f87171' }}>
                    Multiple failed attempts. Make sure you entered the latest code.
                    {canResend
                      ? ' Try resending a fresh code below.'
                      : ` Request a new code in ${countdown}s.`}
                  </p>
                </div>
              )}

              {/* Verify button */}
              <button
                onClick={() => handleVerify()}
                disabled={loading || otp.some(d => !d)}
                className="w-full font-bold py-3 rounded-xl text-sm transition mb-5 disabled:opacity-40 hover:scale-[1.01] active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${P.gold}, ${P.goldDim})`,
                  color: '#0d0d0d',
                  boxShadow: `0 4px 20px ${P.goldGlow}`,
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin inline-block" />
                    Verifying...
                  </span>
                ) : 'Verify & Create Account →'}
              </button>

              {/* Resend + hints */}
              <div className="space-y-2.5 text-center">
                {canResend ? (
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className="flex items-center justify-center gap-2 mx-auto text-sm font-semibold transition"
                    style={{ color: P.gold }}
                  >
                    <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                    {resending ? 'Sending new code...' : 'Resend code'}
                  </button>
                ) : (
                  <p className="text-sm text-amber-300" >
                    Resend code in{' '}
                    <span className="font-bold" style={{ color: P.gold }}>{countdown}s</span>
                  </p>
                )}

                {/* Spam hint - Enhanced Visibility */}
                <div
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg mx-auto max-w-xs"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${P.border}` }}
                >
                  <span className="text-base">📬</span>
                  <p className="text-[11px] text-white text-left">
                    Not in inbox?{' '}
                    <span style={{ color: P.text }}>Check your spam or junk folder</span>
                  </p>
                </div>
              </div>

              {/* Back */}
              <div className="flex justify-center mt-5">
                <button
                  onClick={() => navigate('/register')}
                  className="flex text-amber-200 items-center gap-1.5 text-xs transition"
                  onMouseEnter={e => e.currentTarget.style.color = P.goldDim}
                  onMouseLeave={e => e.currentTarget.style.color = P.gold}
                >
                  <ArrowLeft size={12} /> Back to register
                </button>
              </div>
            </>
          )}
        </div>

        {/* Security note */}
        <p className="text-center text-amber-100 text-[11px] mt-4">
          🔒 Your account is only created after email verification
        </p>
      </div>
    </div>
  );
}