import { Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Input, Select } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password2: '',
    branch: '',  // Add branch field
    referral_code: '',  // Add referral code field
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [branches, setBranches] = useState([]);
  const [referralCodeValid, setReferralCodeValid] = useState(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [referralSettings, setReferralSettings] = useState(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch branches for customer to choose from
    const fetchBranches = async () => {
      try {
        const response = await api.get('/branches/');
        setBranches(response.data.results || response.data || []);
      } catch (error) {
        console.error('Error fetching branches:', error);
      }
    };

    // Fetch referral settings
    const fetchReferralSettings = async () => {
      try {
        const response = await api.get('/settings/referral/');
        setReferralSettings(response.data);
      } catch (error) {
        console.error('Error fetching referral settings:', error);
      }
    };

    fetchBranches();
    fetchReferralSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: '' });

    // Validate referral code when it changes
    if (name === 'referral_code' && value.trim()) {
      validateReferralCode(value.trim());
    } else if (name === 'referral_code' && !value.trim()) {
      setReferralCodeValid(null);
    }
  };

  const validateReferralCode = async (code) => {
    if (!code) return;

    setValidatingCode(true);
    try {
      const response = await api.post('/customers/referral-codes/validate_code/', {
        referral_code: code
      });

      if (response.data.status === 'valid') {
        setReferralCodeValid(true);
      }
    } catch (error) {
      setReferralCodeValid(false);
      setErrors(prev => ({
        ...prev,
        referral_code: error.response?.data?.referral_code?.[0] || 'Invalid referral code'
      }));
    } finally {
      setValidatingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    if (formData.password !== formData.password2) {
      setErrors({ password2: 'Passwords do not match' });
      setLoading(false);
      return;
    }

    const result = await register({
      ...formData,
      role: 'customer',
    });

    if (result.success) {
      navigate('/verify-otp', { state: { email: formData.email } });
    } else {
      setErrors(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 px-4 py-12 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl shadow-xl shadow-primary/20 mb-6 group hover:scale-110 transition-transform duration-300">
            <span className="text-2xl font-bold text-white">C</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Account</span>
          </h1>
          <p className="text-slate-500 font-medium">Join Car Service ecosystem</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/20 p-8 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                <Input
                  type="text"
                  name="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  required
                  className="bg-white/50 border-slate-200/60 rounded-2xl h-11 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
                <Input
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  required
                  className="bg-white/50 border-slate-200/60 rounded-2xl h-11 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 ml-1">Phone Number</label>
                <Input
                  type="tel"
                  name="phone"
                  placeholder="1234567890"
                  value={formData.phone}
                  onChange={handleChange}
                  error={errors.phone}
                  required
                  className="bg-white/50 border-slate-200/60 rounded-2xl h-11 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 ml-1">Preferred Branch</label>
                <Select
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  error={errors.branch}
                  options={[
                    { value: '', label: 'Select branch...' },
                    ...branches.map(branch => ({
                      value: branch.id,
                      label: `${branch.name}`
                    }))
                  ]}
                  required
                  className="bg-white/50 border-slate-200/60 rounded-2xl h-11 focus:ring-primary/20 text-sm"
                />
              </div>
            </div>

            {/* Referral Code Field */}
            {referralSettings?.is_enabled && (
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 ml-1">
                  Referral Code (Optional)
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    name="referral_code"
                    placeholder="ENTER CODE"
                    value={formData.referral_code}
                    onChange={handleChange}
                    className={`w-full px-4 h-11 bg-white/50 border ${errors.referral_code
                      ? 'border-red-500'
                      : referralCodeValid === true
                        ? 'border-green-500'
                        : 'border-slate-200/60'
                      } rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all uppercase placeholder:normal-case`}
                  />
                  {validatingCode && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary/30 border-t-primary"></div>
                    </div>
                  )}
                  {!validatingCode && referralCodeValid === true && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                {errors.referral_code && (
                  <p className="text-red-500 text-xs mt-1 ml-1">{errors.referral_code}</p>
                )}
                {referralCodeValid === true && referralSettings && (
                  <div className="mt-2 p-3 bg-green-50/50 border border-green-100 rounded-2xl">
                    <p className="text-xs text-green-700 font-medium leading-relaxed">
                      🎉 Reward Unlocked! You'll get <span className="font-bold underline">{referralSettings.referee_reward_text}</span> on your first service!
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 h-11 bg-white/50 border ${errors.password ? 'border-red-500' : 'border-slate-200/60'
                      } rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 ml-1">Confirm</label>
                <div className="relative group">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="password2"
                    placeholder="••••••••"
                    value={formData.password2}
                    onChange={handleChange}
                    className={`w-full px-4 h-11 bg-white/50 border ${errors.password2 ? 'border-red-500' : 'border-slate-200/60'
                      } rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-primary transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-primary to-blue-600 hover:from-primary-600 hover:to-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-primary/25 mt-4 transition-all active:scale-[0.98] disabled:opacity-70"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creating Account...</span>
                </div>
              ) : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline underline-offset-4">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;