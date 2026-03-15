import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { uploadToCloudinary } from '../utils/cloudinary';

// ✅ Import geocoding utility
import { geocodeAddress } from '../utils/distance';

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

export default function Signup() {
  const [formData, setFormData] = useState({
    fullName: '',
    businessName: '',
    phone: '',
    email: '',
    password: '',
    pickupAddress: '',
    profilePhotoUrl: ''
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const role = new URLSearchParams(location.search).get('role') || 'shop';
  
  useEffect(() => {
    if (role !== 'shop') {
      navigate('/login');
    }
  }, [role, navigate]);

  const handlePhotoUpload = async (url) => {
    setUploading(true);
    try {
      const photoUrl = await uploadToCloudinary(url);
      setFormData(prev => ({ ...prev, profilePhotoUrl: photoUrl }));
    } catch (err) {
      setError('Photo upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const getLocationFromAddress = async (address) => {
    try {
      const fullAddress = `${address}, Nairobi, Kenya`;
      const coords = await geocodeAddress(fullAddress);
      return coords;
    } catch (err) {
      console.warn('Geocoding failed, using fallback coordinates for Nairobi:', err);
      return {
        latitude: -1.286389,
        longitude: 36.817223
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      setGeocoding(true);
      const locationCoords = await getLocationFromAddress(formData.pickupAddress);
      setGeocoding(false);
      
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      const user = userCredential.user;
      
      await updateProfile(user, {
        displayName: formData.fullName
      });
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: formData.email,
        role: 'shop',
        profile: {
          fullName: formData.fullName,
          businessName: formData.businessName,
          phone: formData.phone,
          pickupAddress: formData.pickupAddress,
          profilePhotoUrl: formData.profilePhotoUrl,
          status: 'active',
          location: {
            latitude: locationCoords.latitude,
            longitude: locationCoords.longitude,
            address: formData.pickupAddress
          }
        },
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
      
      navigate('/shop', { replace: true });
      
    } catch (err) {
      console.error(err);
      setGeocoding(false);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: THEME.bg }}>
      <div className="max-w-lg w-full rounded-2xl shadow-lg p-6 md:p-8" style={{ backgroundColor: THEME.surface }}>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold" style={{ color: THEME.text }}>Join Sirnawa Solutions</h1>
          <p style={{ color: THEME.textSecondary }}>Register your business for instant access</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: '#FEE2E2', color: THEME.error }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Business Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: THEME.text }}>
                Business Name *
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
                style={{ borderColor: THEME.border, color: THEME.text }}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: THEME.text }}>
                Contact Person *
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
                style={{ borderColor: THEME.border, color: THEME.text }}
                required
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: THEME.text }}>
                WhatsApp Phone *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+2547XXXXXXXX"
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
                style={{ borderColor: THEME.border, color: THEME.text }}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: THEME.text }}>
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
                style={{ borderColor: THEME.border, color: THEME.text }}
                required
              />
            </div>
          </div>

          {/* Pickup Address */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: THEME.text }}>
              Pickup Address (Business Location) *
            </label>
            <textarea
              value={formData.pickupAddress}
              onChange={(e) => setFormData({...formData, pickupAddress: e.target.value})}
              rows="2"
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
              style={{ borderColor: THEME.border, color: THEME.text }}
              placeholder="e.g., Eastleigh, Rhimutula Building 3rd Floor"
              required
            />
            <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>
              💡 We'll use this to calculate delivery distances automatically
            </p>
          </div>

          {/* Profile Photo */}
          <div className="border-t pt-4" style={{ borderColor: THEME.border }}>
            <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>
              Business Logo (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (file) {
                  try {
                    const url = await uploadToCloudinary(file);
                    setFormData(prev => ({ ...prev, profilePhotoUrl: url }));
                  } catch (err) {
                    setError('Image upload failed');
                  }
                }
              }}
              disabled={uploading}
              className="block w-full text-sm"
              style={{ color: THEME.text }}
            />
            {formData.profilePhotoUrl && (
              <img 
                src={formData.profilePhotoUrl} 
                alt="Preview" 
                className="w-20 h-20 object-cover rounded-lg mt-2 border"
                style={{ borderColor: THEME.border }}
              />
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: THEME.text }}>
              Password *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              minLength="6"
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
              style={{ borderColor: THEME.border, color: THEME.text }}
              required
            />
            <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Minimum 6 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading || uploading || geocoding}
            className="w-full font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 mt-2"
            style={{ 
              backgroundColor: (loading || uploading || geocoding) ? THEME.primaryDark : THEME.primary,
              color: '#fff'
            }}
          >
            {geocoding ? '📍 Getting location...' : 
             loading ? 'Creating Account...' : 'Register Business'}
          </button>
          
          {geocoding && (
            <p className="text-xs text-center mt-2" style={{ color: THEME.textSecondary }}>
              Converting your address to coordinates...
            </p>
          )}
        </form>

        <div className="mt-6 text-center text-sm" style={{ color: THEME.textSecondary }}>
          Already have an account?{' '}
          <Link to="/login" className="hover:underline" style={{ color: THEME.primary }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}