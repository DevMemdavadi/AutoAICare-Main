import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('access_token');

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedToken) {
      setAccessToken(storedToken);
    }
    setLoading(false);
  }, []);

  const login = async (emailOrPhone, password) => {
    try {
      // Backend accepts email or phone in the 'email' field
      const response = await api.post('/auth/login/', { email: emailOrPhone, password });
      const { access, refresh, user: userData } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      setAccessToken(access);
      console.log(userData.role);
      // Redirect based on role
      switch (userData.role) {
        case 'customer':
          navigate('/customer');
          break;
        case 'admin':
        case 'branch_admin':
        case 'super_admin':
        case 'company_admin':
          navigate('/admin');
          break;
        case 'floor_manager':
          navigate('/floor-manager');
          break;
        case 'supervisor':
          navigate('/supervisor');
          break;
        case 'staff':
          navigate('/technician');
          break;
        default:
          navigate('/');
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.detail || error.response?.data?.error || 'Login failed. Please check your credentials.',
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register/', userData);
      return { success: true, data: response.data };
    } catch (error) {
      // Handle email validation errors specifically
      if (error.response?.data?.email) {
        return {
          success: false,
          error: { email: error.response.data.email[0] }
        };
      }
      return {
        success: false,
        error: error.response?.data || 'Registration failed',
      };
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      const response = await api.post('/auth/verify-otp/', { email, otp });
      const { access, refresh, user: userData } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      setAccessToken(access);
      navigate('/customer');

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'OTP verification failed',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    setAccessToken(null);
    navigate('/login');
  };

  const forgotPassword = async (email) => {
    try {
      await api.post('/auth/forgot-password/', { email });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to send reset email',
      };
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      await api.post('/auth/reset-password/', {
        email,
        otp,
        new_password: newPassword,
        new_password2: newPassword,
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Password reset failed',
      };
    }
  };

  const updateUser = (updatedUserData) => {
    const newUserData = { ...user, ...updatedUserData };
    setUser(newUserData);
    localStorage.setItem('user', JSON.stringify(newUserData));
  };

  const value = {
    user,
    setUser,  // Add setUser to the context value
    accessToken,
    loading,
    login,
    register,
    verifyOTP,
    logout,
    forgotPassword,
    resetPassword,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
