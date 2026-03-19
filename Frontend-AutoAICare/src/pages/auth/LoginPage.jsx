import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Input } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage = () => {
  const [formData, setFormData] = useState({ emailOrPhone: 'admin@k3carcare.com', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const result = await login(formData.emailOrPhone, formData.password);
    console.log('result', result);
    if (!result.success) {
      setErrors({ general: result.error });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 px-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 md:mb-10 translate-y-0 opacity-100 transition-all duration-700">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-primary to-blue-600 rounded-2xl md:rounded-3xl shadow-2xl shadow-primary/20 mb-4 md:mb-6 group hover:scale-110 transition-transform duration-300">
            <span className="text-2xl md:text-3xl font-bold text-white">C</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            Car <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Service</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium">Sign in to your account</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/20 p-6 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium animate-shake">
                {errors.general}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Email Address or Mobile Number</label>
              <div className="relative group">
                <Input
                  type="text"
                  name="emailOrPhone"
                  placeholder="admin@k3carcare.com"
                  value={formData.emailOrPhone}
                  onChange={handleChange}
                  error={errors.emailOrPhone}
                  required
                  className="w-full bg-white/50 border-slate-200/60 rounded-2xl h-12 focus:ring-primary/20 transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1 ml-1">
                <label className="text-sm font-bold text-slate-700">Password</label>
              </div>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 h-12 bg-white/50 border ${errors.password ? 'border-red-500' : 'border-slate-200/60'
                    } rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all duration-300`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-primary transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1 ml-1">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-primary to-blue-600 hover:from-primary-600 hover:to-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-primary/25 transform active:scale-[0.98] transition-all duration-200 disabled:opacity-70"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : 'Sign In'}
            </Button>
          </form>

          {/* <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 font-medium">
              New to Car Service?{' '}
              <Link to="/signup" className="text-primary font-bold hover:underline underline-offset-4">
                Create an account
              </Link>
            </p>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;