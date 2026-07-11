import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

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
  const inputs = useRef([]);

  // Redirect if no email
  useEffect(() => {
    if (!email) navigate('/register');
  }, [email]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (index, value) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // only last digit
    setOtp(newOtp);

    // Auto focus next
    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    // Auto submit when all filled
    if (value && index === 5) {
      const filled = [...newOtp];
      filled[5] = value.slice(-1);
      if (filled.every(d => d !== '')) {
        handleVerify(filled.join(''));
      }
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
      setUser(data);
      toast.success('Email verified! Welcome to WorkSpace 🎉');
      navigate('/');
    } catch (error) {
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
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#0d0d0d' }}>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f5c842, #c9a227)' }}>
            <Zap size={20} color="#0d0d0d" fill="#0d0d0d" />
          </div>
          <span className="text-xl font-black" style={{ color: '#f0ead6', letterSpacing: '-0.5px' }}>
            WorkSpace
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border p-8"
          style={{ background: '#141414', borderColor: '#2a2218' }}>

          {/* Email icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.2)' }}>
              <Mail size={28} style={{ color: '#f5c842' }} />
            </div>
          </div>

          <h1 className="text-2xl font-black text-center mb-2" style={{ color: '#f0ead6', letterSpacing: '-0.4px' }}>
            Check your email
          </h1>
          <p className="text-center text-sm mb-1" style={{ color: '#6b5e40' }}>
            We sent a 6-digit code to
          </p>
          <p className="text-center font-semibold text-sm mb-8" style={{ color: '#f5c842' }}>
            {email}
          </p>

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
                className="text-center text-xl font-black outline-none transition-all duration-150"
                style={{
                  width: '48px', height: '56px',
                  background: '#1a1a1a',
                  border: `2px solid ${digit ? '#f5c842' : '#2a2218'}`,
                  borderRadius: '12px',
                  color: '#f5c842',
                  fontSize: '22px',
                  caretColor: '#f5c842',
                }}
                onFocus={e => e.target.style.borderColor = '#f5c842'}
                onBlur={e => e.target.style.borderColor = digit ? '#f5c842' : '#2a2218'}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {/* Verify button */}
          <button
            onClick={() => handleVerify()}
            disabled={loading || otp.some(d => !d)}
            className="w-full font-bold py-3 rounded-xl text-sm transition mb-4 disabled:opacity-40"
            style={{ background: '#f5c842', color: '#0d0d0d' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                Verifying...
              </span>
            ) : 'Verify Email'}
          </button>

          {/* Resend */}
          <div className="text-center">
            {canResend ? (
              <button
                onClick={handleResend}
                disabled={resending}
                className="flex items-center justify-center gap-2 mx-auto text-sm font-semibold transition"
                style={{ color: '#f5c842' }}
              >
                <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
                {resending ? 'Sending...' : 'Resend code'}
              </button>
            ) : (
              <p className="text-sm" style={{ color: '#4a4030' }}>
                Resend code in <span style={{ color: '#f5c842' }}>{countdown}s</span>
              </p>
            )}
          </div>

          {/* Back */}
          <div className="flex justify-center mt-6">
            <button
              onClick={() => navigate('/register')}
              className="flex items-center gap-1.5 text-xs transition"
              style={{ color: '#4a4030' }}
              onMouseEnter={e => e.currentTarget.style.color = '#6b5e40'}
              onMouseLeave={e => e.currentTarget.style.color = '#4a4030'}
            >
              <ArrowLeft size={12} /> Back to register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
