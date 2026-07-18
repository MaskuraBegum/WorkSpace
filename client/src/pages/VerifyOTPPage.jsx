import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, Mail, ArrowLeft, RefreshCw, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
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
  error: '#f87171',
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
    <div className="min-h-screen flex items-center justify-center p-4 animate-in fade-in duration-200" style={{ background: P.bg }}>
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
                  style={{ background: 'rgba(245,200,66,0.06)', border: `1px solid rgba(245,200,66,0.15)` }}>
                  <Mail size={26} style={{ color: P.gold }} />
                </div>
              </div>

              <h1 className="text-2xl font-black text-center mb-1.5 tracking-tight" style={{ color: P.text }}>
                Check your email
              </h1>

              {/* Email display + Inline Change Action */}
              <div className="text-center mb-5 flex flex-col items-center">
                <p className="text-sm" style={{ color: P.textMid }}>
                  We sent a 6-digit code to
                </p>
                <div 
                  className="mt-2 px-3 py-1 rounded-xl flex items-center gap-2 border text-xs font-semibold max-w-full"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: P.border }}
                >
                  <span className="truncate" style={{ color: P.gold }}>{email}</span>
                  <span style={{ color: P.textDim }}>|</span>
                  <button
                    onClick={() => navigate('/register')}
                    className="underline tracking-wide transition shrink-0 hover:opacity-80"
                    style={{ color: P.textMid }}
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* CRITICAL ATTENTION: SPAM WARNING BANNER (Center Aligned) */}
              <div
                className="flex flex-col items-center justify-center text-center gap-2 mb-6 px-4 py-3.5 rounded-xl border animate-pulse"
                style={{ 
                  background: 'rgba(245,200,66,0.08)', 
                  borderColor: 'rgba(245,200,66,0.3)',
                  boxShadow: '0 2px 12px rgba(245,200,66,0.04)'
                }}
              >
                <div className='flex items-center justify-center gap-2'>
                  <div className="text-lg leading-none">⚠️</div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: P.gold }}>
                      Don't forget to Check your Spam Folder!
                    </h4>
                  </div>
                </div>
              </div>

              {/* OTP inputs */}
              <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
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
                    className="text-center font-black outline-none transition-all duration-150 focus:scale-105"
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
                  className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-xl animate-bounce"
                  style={{ background: 'rgba(248,113,113,0.08)', border: `1px solid rgba(248,113,113,0.2)` }}
                >
                  <AlertCircle size={13} style={{ color: P.error, flexShrink: 0, marginTop: '2px' }} />
                  <p className="text-[11px] leading-relaxed" style={{ color: P.error }}>
                    Multiple failed attempts. Check your <strong className="underline">Spam folder</strong> for the most recent email verification code.
                  </p>
                </div>
              )}

              {/* Delayed Reminder Banner (Shows up after 15 seconds have elapsed) */}
              {countdown < 45 && !canResend && (
                <div 
                  className="mb-5 px-3 py-2.5 rounded-xl border text-center text-[11px] font-semibold flex items-center gap-2 justify-center transition-all duration-300 animate-in slide-in-from-top-2"
                  style={{ background: P.surface, borderColor: P.border, color: P.text }}
                >
                  <HelpCircle size={13} style={{ color: P.gold }} />
                  <span>Still waiting? Refresh your <strong>Spam / Junk</strong> tabs!</span>
                </div>
              )}

              {/* Verify button */}
              <button
                onClick={() => handleVerify()}
                disabled={loading || otp.some(d => !d)}
                className="w-full font-bold py-3 rounded-xl text-sm transition mb-6 disabled:opacity-40 hover:scale-[1.01] active:scale-95"
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

              {/* Consolidated Side-by-Side Navigation & Resend Footer */}
              <div 
                className="flex items-center justify-between mt-2 pt-4 border-t text-xs font-semibold" 
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}
              >
                {/* Left Side: Back action */}
                <button
                  onClick={() => navigate('/register')}
                  className="flex items-center gap-1.5 transition text-xs"
                  style={{ color: P.textMid }}
                  onMouseEnter={e => e.currentTarget.style.color = P.gold}
                  onMouseLeave={e => e.currentTarget.style.color = P.textMid}
                >
                  <ArrowLeft size={12} /> Back to register
                </button>

                {/* Right Side: Resend workflow */}
                <div>
                  {canResend ? (
                    <button
                      onClick={handleResend}
                      disabled={resending}
                      className="flex items-center gap-1.5 transition text-xs"
                      style={{ color: P.gold }}
                    >
                      <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
                      {resending ? 'Sending...' : 'Resend code'}
                    </button>
                  ) : (
                    <p style={{ color: P.textMid }} className="text-xs">
                      Resend in <span className="font-bold" style={{ color: P.gold }}>{countdown}s</span>
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Security status text */}
        <p className="text-center text-[11px] mt-4" style={{ color: P.textDim }}>
          🔒 Secure encryption verified. Account creation will complete following email validation.
        </p>
      </div>
    </div>
  );
}