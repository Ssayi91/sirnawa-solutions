import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { useAuth } from '../../context/AuthContext';

export default function RiderOnboarding() {
  const { user: adminUser } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    // Personal Info
    fullName: '',
    phone: '',
    email: '',
    
    // Verification Documents
    idNumber: '',
    idPhotoUrl: '',
    kraPin: '',
    kraPhotoUrl: '',
    profilePhotoUrl: '',
    
    // Bike & Gear
    bikeDescription: '',
    gearAgreement: false,
    
    // Account
    temporaryPassword: ''
  });

  // Handle text inputs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle image upload to Cloudinary
  const handleImageUpload = async (fieldName, file) => {
    if (!file) return;
    
    try {
      setLoading(true);
      const imageUrl = await uploadToCloudinary(file);
      setFormData(prev => ({ ...prev, [fieldName]: imageUrl }));
      setError('');
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate WhatsApp welcome template
  const generateWelcomeMessage = (riderData) => {
    return `🚴 Welcome to Sirnawa Solutions, ${riderData.fullName}!

✅ Your rider account has been created.

🔐 Login Details:
• Email: ${riderData.email}
• Password: [Use temporary password provided]

🏍️ Gear Assigned:
• ${riderData.bikeDescription}
• Company helmet, vest, and delivery bag

📱 Next Steps:
1. Download the Sirnawa PWA: sirnawa.co.ke
2. Login with your credentials
3. Complete your profile setup
4. Set status to "Available" to receive orders

💰 Compensation:
• Model: Salaried (Monthly)
• Base Salary: 25,000 KSH
• Performance bonuses available

📞 Support:
• WhatsApp: +254736194051
• Email: info@sirnawa.co.ke

Welcome to the team! 🎉`;
  };

  // Submit form - Create Rider Account
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.gearAgreement) {
      setError('⚠️ Rider must accept the Gear Agreement');
      setLoading(false);
      return;
    }

    if (!formData.temporaryPassword || formData.temporaryPassword.length < 6) {
      setError('⚠️ Temporary password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      // 1. Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.temporaryPassword
      );
      const riderUid = userCredential.user.uid;

      // 2. Prepare rider data for Firestore
      const riderData = {
        uid: riderUid,
        email: formData.email,
        role: 'rider',
        profile: {
          fullName: formData.fullName,
          phone: formData.phone,
          // Verification documents
          idNumber: formData.idNumber,
          idPhotoUrl: formData.idPhotoUrl,
          kraPin: formData.kraPin,
          kraPhotoUrl: formData.kraPhotoUrl,
          profilePhotoUrl: formData.profilePhotoUrl,
          // Bike & gear
          bikeDescription: formData.bikeDescription,
          gearAgreement: true,
          gearStatus: 'active', // active, in_repair, replaced
          // Rider status
          status: 'available', // available, on_job, offline
          // Compensation (Salary Model - MVP)
          compensation: {
            model: 'salary',
            baseSalary: 25000, // KSH - configurable in System Settings later
            currency: 'KES',
            ledger: [] // Array of { month, amount, paidDate, method, bonus, deductions, notes }
          },
          // Performance tracking
          performance: {
            jobsCompleted: 0,
            onTimeRate: 100,
            averageRating: null,
            bonusesEarned: 0
          }
        },
        // Metadata
        onboardedBy: adminUser?.uid,
        onboardedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        lastLogin: null,
        // Future: commission model transition
        commissionRequest: null
      };

      // 3. Save to Firestore
      await setDoc(doc(db, 'users', riderUid), riderData);

      // 4. Generate success data
      const welcomeMessage = generateWelcomeMessage(formData);
      
      setSuccess({
        riderName: formData.fullName,
        riderEmail: formData.email,
        riderPhone: formData.phone,
        welcomeMessage,
        whatsappLink: `https://wa.me/254${formData.phone.replace(/\D/g, '')}?text=${encodeURIComponent(welcomeMessage)}`
      });

      // 5. Reset form (optional - keep for next rider)
      // setFormData(initialState);

    } catch (err) {
      console.error('Rider onboarding error:', err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Use a different email or login to manage the existing account.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(`Failed to create rider: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // If success, show confirmation screen
  if (success) {
    return (
      <div className="min-h-screen bg-soft-cream p-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-charcoal-gray">Rider Created Successfully!</h2>
            <p className="text-warm-light-gray mt-2">{success.riderName} is now onboarded.</p>
          </div>

          {/* Rider Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="font-semibold text-charcoal-gray mb-4">Rider Details</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-warm-light-gray">Name:</span> {success.riderName}</p>
              <p><span className="text-warm-light-gray">Email:</span> {success.riderEmail}</p>
              <p><span className="text-warm-light-gray">Phone:</span> {success.riderPhone}</p>
              <p><span className="text-warm-light-gray">Status:</span> <span className="text-primary font-medium">Available</span></p>
            </div>
          </div>

          {/* WhatsApp Welcome Template */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-charcoal-gray">📱 Welcome Message (WhatsApp)</h3>
              <a
                href={success.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-colors flex items-center gap-2"
              >
                <span>💬</span> Send via WhatsApp
              </a>
            </div>
            <pre className="bg-soft-cream p-4 rounded-lg text-sm text-charcoal-gray whitespace-pre-wrap overflow-x-auto">
              {success.welcomeMessage}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(success.welcomeMessage);
                alert('✅ Message copied to clipboard!');
              }}
              className="mt-3 text-sm text-primary hover:underline"
            >
              📋 Copy message
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => {
                setSuccess(null);
                setFormData(prev => ({ ...prev, temporaryPassword: '' }));
              }}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-burnt-orange transition-colors"
            >
              + Add Another Rider
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="flex-1 px-4 py-3 border border-warm-light-gray text-charcoal-gray rounded-lg hover:bg-soft-cream transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main form UI
  return (
    <div className="min-h-screen bg-soft-cream p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal-gray">Add New Rider</h1>
          <p className="text-warm-light-gray mt-1">Onboard a new salaried delivery rider</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* 👤 Personal Info Section */}
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-charcoal-gray mb-4 flex items-center gap-2">
              <span>👤</span> Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-gray mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-warm-light-gray rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-gray mb-1">
                  WhatsApp Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+2547XXXXXXXX"
                  pattern="^\+254[0-9]{9}$"
                  className="w-full px-4 py-2 border border-warm-light-gray rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
                <p className="text-xs text-warm-light-gray mt-1">Format: +2547XXXXXXXX</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-charcoal-gray mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-warm-light-gray rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
            </div>
          </section>

          {/* 🪪 Verification Documents Section */}
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-charcoal-gray mb-4 flex items-center gap-2">
              <span>🪪</span> Verification Documents *
            </h2>
            
            {/* ID Number + Photo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-gray mb-1">
                  ID Number *
                </label>
                <input
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-warm-light-gray rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-gray mb-1">
                  ID Photo *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload('idPhotoUrl', e.target.files[0])}
                  disabled={loading}
                  className="block w-full text-sm"
                  required
                />
                {formData.idPhotoUrl && (
                  <img src={formData.idPhotoUrl} alt="ID" className="w-20 h-20 object-cover rounded mt-2 border" />
                )}
              </div>
            </div>

            {/* KRA PIN + Photo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-gray mb-1">
                  KRA PIN *
                </label>
                <input
                  type="text"
                  name="kraPin"
                  value={formData.kraPin}
                  onChange={handleChange}
                  placeholder="A001234567"
                  className="w-full px-4 py-2 border border-warm-light-gray rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-gray mb-1">
                  KRA PIN Photo *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload('kraPhotoUrl', e.target.files[0])}
                  disabled={loading}
                  className="block w-full text-sm"
                  required
                />
                {formData.kraPhotoUrl && (
                  <img src={formData.kraPhotoUrl} alt="KRA" className="w-20 h-20 object-cover rounded mt-2 border" />
                )}
              </div>
            </div>

            {/* Profile Photo */}
            <div>
              <label className="block text-sm font-medium text-charcoal-gray mb-1">
                Profile Photo * (for client identification)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload('profilePhotoUrl', e.target.files[0])}
                disabled={loading}
                className="block w-full text-sm"
                required
              />
              {formData.profilePhotoUrl && (
                <img src={formData.profilePhotoUrl} alt="Profile" className="w-20 h-20 object-cover rounded-full mt-2 border-2 border-primary" />
              )}
            </div>
          </section>

          {/* 🏍️ Bike & Gear Section */}
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-charcoal-gray mb-4 flex items-center gap-2">
              <span>🏍️</span> Bike & Company Gear
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-charcoal-gray mb-1">
                Bike Description *
              </label>
              <input
                type="text"
                name="bikeDescription"
                value={formData.bikeDescription}
                onChange={handleChange}
                placeholder="e.g., Red Boxer, Plate KCA 123X"
                className="w-full px-4 py-2 border border-warm-light-gray rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            <div className="flex items-start gap-3 p-4 bg-soft-cream rounded-lg">
              <input
                type="checkbox"
                name="gearAgreement"
                checked={formData.gearAgreement}
                onChange={handleChange}
                className="mt-1 w-4 h-4 text-primary rounded focus:ring-primary"
                required
              />
              <label className="text-sm text-charcoal-gray">
                <span className="font-medium">☑ Gear Agreement *</span>
                <p className="text-warm-light-gray mt-1">
                  I confirm that I will use company-provided gear (bike, helmet, vest, bag) for all deliveries. 
                  I understand that damage due to negligence may result in salary deductions as per company policy.
                </p>
              </label>
            </div>
          </section>

          {/* 🔐 Account Setup Section */}
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-charcoal-gray mb-4 flex items-center gap-2">
              <span>🔐</span> Account Setup
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-charcoal-gray mb-1">
                Temporary Password *
              </label>
              <input
                type="password"
                name="temporaryPassword"
                value={formData.temporaryPassword}
                onChange={handleChange}
                minLength="6"
                className="w-full px-4 py-2 border border-warm-light-gray rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
              <p className="text-xs text-warm-light-gray mt-1">
                Minimum 6 characters. Rider will change this on first login.
              </p>
            </div>
          </section>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-burnt-orange text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span> Creating Account...
                </>
              ) : (
                '🟠 Create Rider Account'
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-6 py-3 border border-warm-light-gray text-charcoal-gray rounded-lg hover:bg-soft-cream transition-colors"
            >
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}