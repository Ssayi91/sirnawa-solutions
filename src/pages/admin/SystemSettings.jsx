import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const THEME = {
  primary: '#00C9A7',
  primaryDark: '#00A88A',
  bg: '#F7F9FC',
  surface: '#FFFFFF',
  text: '#1A202C',
  textSecondary: '#718096',
  border: '#E2E8F0',
  success: '#48BB78',
  warning: '#ED8936',
  error: '#F56565'
};

export default function SystemSettings() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  // ✅ UPDATED: Initial state with fareConfig structure
  const [settings, setSettings] = useState({
    paybillNumber: '',
    companyName: '',
    supportWhatsApp: '',
    currency: 'KES',
    paymentTiming: 'after_delivery',
    requireOTP: true,
    requireMpesaProof: true,
    allowSelfAssign: true,
    allowAdminAssign: true,
    publicTracking: true,
    enableRatings: true,
    // ✅ NEW: Fare configuration nested object
    fareConfig: {
      baseFare: 250,        // ✅ Base = 250 (minimum starting fare)
      perKmRate: 40,        // ✅ Default rate per km
      minimumFare: 250,     // ✅ Locked to base
      zoneMultipliers: {
        zone_a: 1.0,  // CBD
        zone_b: 1.1,  // Westlands/Kilimani
        zone_c: 1.3,  // Karen/Runda
        zone_d: 1.2   // Roysambu/Kasarani
      }
    }
  });

  const [originalSettings, setOriginalSettings] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'system');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // ✅ Handle migration: if old flat structure, convert to fareConfig
        if (data.baseFare !== undefined && !data.fareConfig) {
          const migrated = {
            ...data,
            fareConfig: {
              baseFare: data.baseFare || 250,
              perKmRate: data.perKmRate || 40,
              minimumFare: 250,  // Locked
              zoneMultipliers: {
                zone_a: 1.0,
                zone_b: 1.1,
                zone_c: 1.3,
                zone_d: 1.2
              }
            }
          };
          // Remove old flat fields
          delete migrated.baseFare;
          delete migrated.perKmRate;
          delete migrated.minimumFare;
          
          setSettings(migrated);
          setOriginalSettings(JSON.parse(JSON.stringify(migrated)));
        } else {
          setSettings(data);
          setOriginalSettings(JSON.parse(JSON.stringify(data)));
        }
        
        if (data.updatedAt?.toDate) {
          setLastSaved(data.updatedAt.toDate());
        }
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Handle nested fareConfig changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle nested fareConfig fields
    if (name.startsWith('fareConfig.')) {
      const [, nestedKey] = name.split('.');
      // Handle nested zoneMultipliers
      if (nestedKey.startsWith('zoneMultipliers.')) {
        const [, zoneKey] = nestedKey.split('.');
        setSettings(prev => ({
          ...prev,
          fareConfig: {
            ...prev.fareConfig,
            zoneMultipliers: {
              ...prev.fareConfig?.zoneMultipliers,
              [zoneKey]: parseFloat(value) || 1.0
            }
          }
        }));
      } else {
        setSettings(prev => ({
          ...prev,
          fareConfig: {
            ...prev.fareConfig,
            [nestedKey]: type === 'checkbox' ? checked : (name.includes('Rate') || name.includes('Fare') ? parseFloat(value) || 0 : value)
          }
        }));
      }
    } else {
      // Handle top-level fields
      setSettings(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    
    // Hide saved indicator when form is edited
    if (saved) setSaved(false);
  };

  const hasChanges = () => {
    if (!originalSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };

  // ✅ UPDATED: Save with fareConfig structure
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    
    try {
      // ✅ Only save fareConfig, not flat fields
      const updateData = {
        paybillNumber: settings.paybillNumber,
        companyName: settings.companyName,
        supportWhatsApp: settings.supportWhatsApp,
        currency: settings.currency,
        paymentTiming: settings.paymentTiming,
        requireOTP: settings.requireOTP,
        requireMpesaProof: settings.requireMpesaProof,
        allowSelfAssign: settings.allowSelfAssign,
        allowAdminAssign: settings.allowAdminAssign,
        publicTracking: settings.publicTracking,
        enableRatings: settings.enableRatings,
        fareConfig: settings.fareConfig,  // ✅ Save nested fare config
        updatedAt: serverTimestamp(),
        updatedBy: 'super_admin'
      };
      
      await setDoc(doc(db, 'settings', 'system'), updateData);
      
      setOriginalSettings(JSON.parse(JSON.stringify(settings)));
      setSaved(true);
      setLastSaved(new Date());
      
      // Auto-hide success after 4 seconds
      setTimeout(() => setSaved(false), 4000);
      
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: THEME.bg }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: THEME.primary }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: THEME.bg }}>
      {/* Header */}
      <header className="sticky top-0 z-10" style={{ backgroundColor: THEME.surface }}>
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm" style={{ color: THEME.textSecondary }}>Configuration</p>
              <h1 className="text-xl font-bold" style={{ color: THEME.text }}>System Settings</h1>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
              style={{ borderColor: THEME.border, color: THEME.text }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Save Status Banner */}
      <div className="max-w-3xl mx-auto px-4 mt-4">
        {saved ? (
          <div className="flex items-center gap-2 py-3 px-4 rounded-lg text-sm font-medium animate-pulse" 
            style={{ backgroundColor: '#D1FAE5', color: THEME.success }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Settings saved successfully
            {lastSaved && (
              <span className="ml-auto text-xs opacity-75">
                {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        ) : hasChanges() ? (
          <div className="py-3 px-4 rounded-lg text-sm" style={{ backgroundColor: '#FEF3C7', color: THEME.warning }}>
            You have unsaved changes
          </div>
        ) : originalSettings ? (
          <div className="py-3 px-4 rounded-lg text-sm" style={{ backgroundColor: THEME.surface, color: THEME.textSecondary }}>
            All settings up to date
            {lastSaved && (
              <span className="ml-2">• Last saved: {lastSaved.toLocaleTimeString()}</span>
            )}
          </div>
        ) : null}
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        
        {/* Company Payment Details */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: THEME.text }}>Company Payment Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>Paybill Number *</label>
              <input
                type="text"
                name="paybillNumber"
                value={settings.paybillNumber}
                onChange={handleChange}
                placeholder="e.g., 123456"
                className="w-full px-4 py-3 rounded-lg border focus:outline-none"
                style={{ borderColor: THEME.border, color: THEME.text }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>Company Name (as on M-Pesa) *</label>
              <input
                type="text"
                name="companyName"
                value={settings.companyName}
                onChange={handleChange}
                placeholder="e.g., SIRNAWA SOLUTIONS"
                className="w-full px-4 py-3 rounded-lg border focus:outline-none"
                style={{ borderColor: THEME.border, color: THEME.text }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>Support WhatsApp Number *</label>
              <input
                type="tel"
                name="supportWhatsApp"
                value={settings.supportWhatsApp}
                onChange={handleChange}
                placeholder="+254736194051"
                className="w-full px-4 py-3 rounded-lg border focus:outline-none"
                style={{ borderColor: THEME.border, color: THEME.text }}
              />
            </div>
          </div>
        </section>

        <div className="border-t my-8" style={{ borderColor: THEME.border }}></div>

        {/* ✅ UPDATED: Fare Configuration with Zone Multipliers */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: THEME.text }}>Fare Configuration</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>Base Fare (KSH) *</label>
                <input
                  type="number"
                  name="fareConfig.baseFare"
                  value={settings.fareConfig?.baseFare || 250}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none"
                  style={{ borderColor: THEME.border, color: THEME.text }}
                />
                <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Minimum starting fare per delivery</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>Per KM Rate (KSH) *</label>
                <input
                  type="number"
                  name="fareConfig.perKmRate"
                  value={settings.fareConfig?.perKmRate || 40}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none"
                  style={{ borderColor: THEME.border, color: THEME.text }}
                />
                <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Added per kilometer of distance</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>Minimum Fare (KSH) — Locked</label>
              <input
                type="number"
                value={250}
                disabled
                className="w-full px-4 py-3 rounded-lg border bg-gray-100 cursor-not-allowed"
                style={{ borderColor: THEME.border, color: THEME.textSecondary }}
              />
              <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Cannot be changed — same as Base Fare</p>
            </div>

            {/* Zone Multipliers */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: THEME.bg }}>
              <p className="text-sm font-medium mb-3" style={{ color: THEME.text }}>Zone Multipliers</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'zone_a', label: 'Zone A (CBD)', default: 1.0 },
                  { id: 'zone_b', label: 'Zone B (Westlands/Kilimani)', default: 1.1 },
                  { id: 'zone_c', label: 'Zone C (Karen/Runda)', default: 1.3 },
                  { id: 'zone_d', label: 'Zone D (Roysambu/Kasarani)', default: 1.2 },
                ].map(zone => (
                  <div key={zone.id}>
                    <label className="block text-xs mb-1" style={{ color: THEME.textSecondary }}>{zone.label}</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="2.0"
                      name={`fareConfig.zoneMultipliers.${zone.id}`}
                      value={settings.fareConfig?.zoneMultipliers?.[zone.id] || zone.default}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: THEME.border, color: THEME.text }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Fare Preview - CORRECTED FORMULA */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: THEME.surface }}>
              <p className="text-sm font-medium mb-2" style={{ color: THEME.textSecondary }}>Fare Calculator Preview</p>
              <div className="space-y-2 text-sm">
                <p>
                  <span style={{ color: THEME.textSecondary }}>2km in CBD:</span>{' '}
                  <span style={{ color: THEME.primary }}>
                    {Math.round((Math.max(250, (settings.fareConfig?.baseFare || 250) + 2 * (settings.fareConfig?.perKmRate || 40)) * 1.0) / 10) * 10} KSH
                  </span>
                </p>
                <p>
                  <span style={{ color: THEME.textSecondary }}>5km in Westlands:</span>{' '}
                  <span style={{ color: THEME.primary }}>
                    {Math.round((Math.max(250, (settings.fareConfig?.baseFare || 250) + 5 * (settings.fareConfig?.perKmRate || 40)) * 1.1) / 10) * 10} KSH
                  </span>
                </p>
                <p>
                  <span style={{ color: THEME.textSecondary }}>12km to Karen:</span>{' '}
                  <span style={{ color: THEME.primary }}>
                    {Math.round((Math.max(250, (settings.fareConfig?.baseFare || 250) + 12 * (settings.fareConfig?.perKmRate || 40)) * 1.3) / 10) * 10} KSH
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="border-t my-8" style={{ borderColor: THEME.border }}></div>

        {/* Delivery Rules */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: THEME.text }}>Delivery Rules</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>Payment Timing</label>
              <select
                name="paymentTiming"
                value={settings.paymentTiming}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none"
                style={{ borderColor: THEME.border, color: THEME.text, backgroundColor: THEME.surface }}
              >
                <option value="after_delivery">After Delivery (Default)</option>
                <option value="before_delivery">Before Delivery</option>
              </select>
            </div>
            <div className="space-y-3 py-4 px-4 rounded-lg" style={{ backgroundColor: THEME.surface }}>
              {[
                { name: 'requireOTP', label: 'Require OTP Verification', desc: 'Client must provide 4-digit code before handover' },
                { name: 'requireMpesaProof', label: 'Require M-Pesa SMS Proof', desc: 'Rider must verify payment confirmation SMS' },
                { name: 'allowSelfAssign', label: 'Allow Rider Self-Assignment', desc: 'Riders can claim available orders' },
                { name: 'allowAdminAssign', label: 'Allow Admin/Shop Assignment', desc: 'Admin or Shop can assign riders manually' },
                { name: 'publicTracking', label: 'Enable Public Tracking', desc: 'Clients can track orders via public link' },
                { name: 'enableRatings', label: 'Enable Ratings & Reviews', desc: 'Clients can rate riders and shops' },
              ].map(option => (
                <div key={option.name} className="flex items-start justify-between py-2">
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-medium" style={{ color: THEME.text }}>{option.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: THEME.textSecondary }}>{option.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name={option.name} checked={settings[option.name]} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 rounded-full peer transition-colors"
                      style={{ backgroundColor: settings[option.name] ? THEME.primary : THEME.border }}
                    >
                      <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                        style={{ transform: settings[option.name] ? 'translateX(100%)' : 'translateX(0)' }}
                      ></div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Save Button with Status */}
        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges()}
            className="w-full py-4 rounded-lg font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ backgroundColor: THEME.primary }}
          >
            {saving ? (
              <>
                <span className="animate-spin">⏳</span> Saving...
              </>
            ) : saved ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved ✓
              </>
            ) : hasChanges() ? (
              'Save Changes'
            ) : (
              'No Changes to Save'
            )}
          </button>
          
          {/* Last Saved Timestamp */}
          {lastSaved && !saved && (
            <p className="text-center text-xs mt-3" style={{ color: THEME.textSecondary }}>
              Last saved: {lastSaved.toLocaleString()}
            </p>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full py-4 rounded-lg font-semibold mt-3 transition-colors"
          style={{ backgroundColor: THEME.error, color: '#fff' }}
        >
          Logout
        </button>

      </main>
    </div>
  );
}