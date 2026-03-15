import { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

// ✅ SAME CLEAN THEME AS ALL OTHER PAGES
const THEME = {
  primary: '#00C9A7',      // Teal - main brand color
  primaryDark: '#00A88A',  // Darker teal
  bg: '#F7F9FC',           // Light gray-blue background
  surface: '#FFFFFF',      // White
  text: '#1A202C',         // Dark text
  textSecondary: '#718096', // Gray text
  border: '#E2E8F0',       // Light border
  success: '#48BB78',      // Green
  warning: '#ED8936',      // Orange
  error: '#F56565'         // Red
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  if (user && role) {
    const redirects = {
      super_admin: '/admin',
      rider: '/rider',
      shop: '/shop'
    };
    return <Navigate to={redirects[role] || '/'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // ✅ DO NOT navigate here - let AuthContext handle role fetch & redirect
      // The if (user && role) block at top will redirect automatically
    } catch (err) {
      setError('Invalid email or password');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: THEME.bg }}>
      <div className="max-w-md w-full rounded-2xl shadow-lg p-8" style={{ backgroundColor: THEME.surface }}>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: THEME.text }}>Sirnawa Solutions</h1>
          <p style={{ color: THEME.textSecondary }}>Bike Delivery System</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: '#FEE2E2', color: THEME.error }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: THEME.text }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
              style={{ 
                borderColor: THEME.border, 
                color: THEME.text,
                '--tw-ring-color': THEME.primary 
              }}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: THEME.text }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
              style={{ 
                borderColor: THEME.border, 
                color: THEME.text,
                '--tw-ring-color': THEME.primary 
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            style={{ 
              backgroundColor: loading ? THEME.primaryDark : THEME.primary,
              color: '#fff'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm" style={{ color: THEME.textSecondary }}>
            Shop partner?{' '}
            <Link to="/signup?role=shop" className="hover:underline" style={{ color: THEME.primary }}>
              Register your business
            </Link>
          </p>
          <p className="text-sm mt-2" style={{ color: THEME.textSecondary }}>
            Rider? Contact admin to onboard.
          </p>
        </div>
      </div>
    </div>
  );
}