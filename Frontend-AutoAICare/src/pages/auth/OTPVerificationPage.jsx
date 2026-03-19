import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Card } from '../../components/ui';

const OTPVerificationPage = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { verifyOTP } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  if (!email) {
    navigate('/login');
    return null;
  }

  const handleChange = (index, value) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join('');

    if (otpValue.length !== 6) {
      setError('Please enter complete OTP');
      return;
    }

    setLoading(true);
    const result = await verifyOTP(email, otpValue);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 px-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10 translate-y-0 opacity-100 transition-all duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-blue-600 rounded-3xl shadow-2xl shadow-primary/20 mb-6 group hover:scale-110 transition-transform duration-300">
            <span className="text-3xl font-bold text-white">C</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            Verify <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">OTP</span>
          </h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            Enter the 6-digit code sent to <br />
            <span className="text-slate-900 font-bold underline decoration-primary/30 underline-offset-4">{email}</span>
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/20 p-8 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium animate-shake">
                {error}
              </div>
            )}

            <div className="flex gap-2 sm:gap-3 justify-center">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold bg-white border-2 border-slate-200/60 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all duration-200 shadow-sm"
                />
              ))}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-primary to-blue-600 hover:from-primary-600 hover:to-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-primary/25 transform active:scale-[0.98] transition-all"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Verifying...</span>
                </div>
              ) : 'Verify Code'}
            </Button>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500 font-medium">
                Didn't receive the code?{' '}
                <button type="button" className="text-primary font-bold hover:underline underline-offset-4 transition-all">
                  Resend OTP
                </button>
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OTPVerificationPage;
