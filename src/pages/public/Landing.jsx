import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Same clean theme
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

export default function Landing() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [trackingId, setTrackingId] = useState('');

  // Redirect if already logged in
  if (user && role) {
    const redirects = {
      super_admin: '/admin',
      rider: '/rider',
      shop: '/shop'
    };
    setTimeout(() => navigate(redirects[role] || '/'), 100);
    return null;
  }

  const handleTrackOrder = (e) => {
    e.preventDefault();
    if (trackingId.trim()) {
      navigate(`/track/${trackingId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: THEME.surface }}>
      
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b" style={{ backgroundColor: THEME.surface, borderColor: THEME.border }}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: THEME.primary }}>
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: THEME.text }}>Sirnawa Solutions</h1>
                <p className="text-xs" style={{ color: THEME.textSecondary }}>Bike Delivery System</p>
              </div>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#how-it-works" className="text-sm font-medium hover:underline" style={{ color: THEME.text }}>How It Works</a>
              <a href="#why-us" className="text-sm font-medium hover:underline" style={{ color: THEME.text }}>Why Us</a>
              <a href="#riders" className="text-sm font-medium hover:underline" style={{ color: THEME.text }}>For Riders</a>
              <a href="#shops" className="text-sm font-medium hover:underline" style={{ color: THEME.text }}>For Shops</a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: THEME.text }}
              >
                Login
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: THEME.primary }}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4" style={{ backgroundColor: THEME.bg }}>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: THEME.text }}>
            Fast, Reliable Bike Delivery in <span style={{ color: THEME.primary }}>Nairobi</span>
          </h1>
          <p className="text-lg mb-8" style={{ color: THEME.textSecondary }}>
            Track your package in real-time. Pay securely via M-Pesa. Delivered by verified riders.
          </p>

          {/* Track Order Form */}
          <form onSubmit={handleTrackOrder} className="max-w-md mx-auto mb-12">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter tracking ID (e.g., ABC123)"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border text-base"
                style={{ borderColor: THEME.border, color: THEME.text }}
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-lg font-semibold text-white transition-colors"
                style={{ backgroundColor: THEME.primary }}
              >
                Track
              </button>
            </div>
          </form>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-3xl font-bold" style={{ color: THEME.primary }}>500+</p>
              <p className="text-sm mt-1" style={{ color: THEME.textSecondary }}>Deliveries</p>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-3xl font-bold" style={{ color: THEME.primary }}>50+</p>
              <p className="text-sm mt-1" style={{ color: THEME.textSecondary }}>Riders</p>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-3xl font-bold" style={{ color: THEME.primary }}>4.8★</p>
              <p className="text-sm mt-1" style={{ color: THEME.textSecondary }}>Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: THEME.text }}>How It Works</h2>
            <p style={{ color: THEME.textSecondary }}>Three simple steps to get your package delivered</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                icon: '📦',
                title: 'Create Order',
                desc: 'Shop creates delivery request with pickup & dropoff details'
              },
              {
                step: '2',
                icon: '🏍️',
                title: 'Rider Assigned',
                desc: 'Verified rider accepts and picks up your package'
              },
              {
                step: '3',
                icon: '✅',
                title: 'Track & Receive',
                desc: 'Track in real-time, verify with OTP, pay via M-Pesa'
              }
            ].map(item => (
              <div key={item.step} className="p-6 rounded-2xl text-center" style={{ backgroundColor: THEME.bg }}>
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl" style={{ backgroundColor: THEME.primary }}>
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: THEME.text }}>{item.title}</h3>
                <p style={{ color: THEME.textSecondary }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ WHY CHOOSE SIRNAWA - REPLACES PRICING */}
      <section id="why-us" className="py-20 px-4" style={{ backgroundColor: THEME.bg }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: THEME.text }}>Why Choose Sirnawa?</h2>
            <p style={{ color: THEME.textSecondary }}>We're not just a delivery service - we're your logistics partner</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '⚡',
                title: 'Lightning Fast',
                desc: 'Average delivery time: 30-60 minutes. We know Nairobi traffic and the fastest routes.',
                color: THEME.warning
              },
              {
                icon: '🔐',
                title: 'Secure & Tracked',
                desc: 'Real-time GPS tracking, OTP verification and verified riders. Your package is always safe.',
                color: THEME.primary
              },
              {
                icon: '💰',
                title: 'Pay After Delivery',
                desc: 'Pay securely via M-Pesa only when you receive your package. No upfront payments.',
                color: THEME.success
              },
              {
                icon: '🏍️',
                title: 'Verified Riders',
                desc: 'All riders are background-checked, trained, and equipped with company gear for professionalism.',
                color: THEME.primary
              },
              {
                icon: '📱',
                title: 'Real-Time Updates',
                desc: 'Track your order live, get WhatsApp notifications, and communicate directly with your rider.',
                color: THEME.warning
              },
              {
                icon: '🎯',
                title: 'Nairobi Experts',
                desc: 'We cover all areas - CBD, Westlands, Kilimani, Karen, Roysambu, and beyond.',
                color: THEME.success
              }
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl hover:shadow-lg transition-shadow" style={{ backgroundColor: THEME.surface }}>
                <div className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center text-2xl" style={{ backgroundColor: feature.color + '20' }}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: THEME.text }}>{feature.title}</h3>
                <p style={{ color: THEME.textSecondary }}>{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Trust Badges */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Orders Delivered', value: '500+', icon: '📦' },
              { label: 'Active Riders', value: '50+', icon: '🏍️' },
              { label: 'Partner Shops', value: '30+', icon: '🏪' },
              { label: 'Customer Rating', value: '4.8★', icon: '⭐' }
            ].map(stat => (
              <div key={stat.label} className="p-4 rounded-xl text-center" style={{ backgroundColor: THEME.surface }}>
                <div className="text-3xl mb-2">{stat.icon}</div>
                <p className="text-2xl font-bold" style={{ color: THEME.primary }}>{stat.value}</p>
                <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ FOR RIDERS - UPDATED WITH COMPENSATION CLARITY */}
      <section id="riders" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: THEME.text }}>Join Our Rider Network</h2>
            <p style={{ color: THEME.textSecondary }}>Choose the earning model that works for you</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Salaried Option */}
            <div className="p-8 rounded-2xl relative" style={{ backgroundColor: THEME.surface, border: `2px solid ${THEME.primary}` }}>
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: THEME.primary }}>
                Company Bike Provided
              </div>
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🏍️</div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: THEME.text }}>Salaried Rider</h3>
                <p className="text-3xl font-bold mb-2" style={{ color: THEME.primary }}>Salary<span className="text-base font-normal">/month</span></p>
                <p style={{ color: THEME.textSecondary }}>Stable income with company bike & gear</p>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  'Company provides bike & gear',
                  'Fixed monthly salary',
                  'Performance bonuses',
                  'Fuel & maintenance covered',
                  'Health insurance',
                  'Paid training',
                  'Weekly payments'
                ].map(benefit => (
                  <li key={benefit} className="flex items-center gap-2" style={{ color: THEME.text }}>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: THEME.success }}>✓</span>
                    {benefit}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/signup?role=rider')}
                className="w-full py-3 rounded-lg font-semibold text-white transition-colors"
                style={{ backgroundColor: THEME.primary }}
              >
                Apply for Salaried Position
              </button>
            </div>

            {/* Commission Option */}
            <div className="p-8 rounded-2xl" style={{ backgroundColor: THEME.surface }}>
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🚴</div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: THEME.text }}>Commission Rider</h3>
                <p className="text-3xl font-bold mb-2" style={{ color: THEME.warning }}>Earn Per Delivery</p>
                <p style={{ color: THEME.textSecondary }}>Use your own bike & gear</p>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  'Use your own bike & gear',
                  'Earn per delivery completed',
                  'Flexible working hours',
                  'Work when you want',
                  'Keep 100% of tips',
                  'Weekly payouts',
                  'Performance incentives'
                ].map(benefit => (
                  <li key={benefit} className="flex items-center gap-2" style={{ color: THEME.text }}>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: THEME.success }}>✓</span>
                    {benefit}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/signup?role=rider')}
                className="w-full py-3 rounded-lg font-semibold transition-colors"
                style={{ backgroundColor: THEME.bg, color: THEME.text, border: `2px solid ${THEME.border}` }}
              >
                Apply as Commission Rider
              </button>
            </div>
          </div>

          {/* Requirements */}
          <div className="p-8 rounded-2xl" style={{ backgroundColor: THEME.bg }}>
            <h3 className="text-xl font-bold mb-6 text-center" style={{ color: THEME.text }}>Requirements for All Riders</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: '📄', title: 'Valid ID', desc: 'National ID or passport' },
                { icon: '📱', title: 'Smartphone', desc: 'Android phone with GPS' },
                { icon: '🎓', title: 'Training', desc: 'Complete our 2-day training' },
                { icon: '🏍️', title: 'License', desc: 'Valid bike license (for own bike)' },
                { icon: '✅', title: 'Background Check', desc: 'Clean criminal record' },
                { icon: '💪', title: 'Physical Fitness', desc: 'Able to ride long distances' }
              ].map(req => (
                <div key={req.title} className="flex items-start gap-3">
                  <div className="text-2xl">{req.icon}</div>
                  <div>
                    <p className="font-semibold" style={{ color: THEME.text }}>{req.title}</p>
                    <p className="text-sm" style={{ color: THEME.textSecondary }}>{req.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* For Shops */}
      <section id="shops" className="py-20 px-4" style={{ backgroundColor: THEME.bg }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 p-8 rounded-2xl text-center">
              <div className="text-6xl mb-4">🏪</div>
              <p className="text-lg font-semibold mb-2" style={{ color: THEME.text }}>Shop Benefits</p>
              <p style={{ color: THEME.textSecondary }}>Grow your business with reliable delivery</p>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl font-bold mb-4" style={{ color: THEME.text }}>Grow Your Business</h2>
              <p className="mb-6" style={{ color: THEME.textSecondary }}>
                Offer delivery to your customers without the hassle. We handle logistics, you focus on sales.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Easy order management dashboard',
                  'Real-time tracking for your customers',
                  'Competitive delivery rates',
                  'Reliable verified riders',
                  'Monthly billing & reports',
                  'Dedicated support'
                ].map(benefit => (
                  <li key={benefit} className="flex items-center gap-2" style={{ color: THEME.text }}>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: THEME.success }}>✓</span>
                    {benefit}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/signup?role=shop')}
                className="px-6 py-3 rounded-lg font-semibold text-white transition-colors"
                style={{ backgroundColor: THEME.primary }}
              >
                Register Your Shop
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center p-12 rounded-3xl" style={{ backgroundColor: THEME.primary }}>
          <h2 className="text-3xl font-bold mb-4 text-white">Ready to Get Started?</h2>
          <p className="mb-8 text-white text-opacity-90">
            Join hundreds of satisfied customers, riders, and shops across Nairobi.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/signup?role=shop')}
              className="px-8 py-4 rounded-lg font-semibold transition-colors"
              style={{ backgroundColor: THEME.surface, color: THEME.primary }}
            >
              For Shops
            </button>
            <button
              onClick={() => navigate('/signup?role=rider')}
              className="px-8 py-4 rounded-lg font-semibold transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: '2px solid rgba(255,255,255,0.3)' }}
            >
              For Riders
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-lg font-semibold transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: '2px solid rgba(255,255,255,0.3)' }}
            >
              Login
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t" style={{ backgroundColor: THEME.surface, borderColor: THEME.border }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: THEME.primary }}>
                  <span className="text-white font-bold">S</span>
                </div>
                <span className="font-bold" style={{ color: THEME.text }}>Sirnawa Solutions</span>
              </div>
              <p className="text-sm" style={{ color: THEME.textSecondary }}>
                Fast, reliable bike delivery across Nairobi and environs.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-3" style={{ color: THEME.text }}>Quick Links</h4>
              <ul className="space-y-2 text-sm" style={{ color: THEME.textSecondary }}>
                <li><a href="#how-it-works" className="hover:underline">How It Works</a></li>
                <li><a href="#why-us" className="hover:underline">Why Choose Us</a></li>
                <li><a href="#riders" className="hover:underline">For Riders</a></li>
                <li><a href="#shops" className="hover:underline">For Shops</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-3" style={{ color: THEME.text }}>Support</h4>
              <ul className="space-y-2 text-sm" style={{ color: THEME.textSecondary }}>
                <li><a href="https://wa.me/254736194051" className="hover:underline">WhatsApp Support</a></li>
                <li><a href="tel:+254736194051" className="hover:underline">+254 736 194051</a></li>
                <li><a href="mailto:info@sirnawa.co.ke" className="hover:underline">info@sirnawa.co.ke</a></li>
                <li>Nairobi, Kenya</li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-3" style={{ color: THEME.text }}>Legal</h4>
              <ul className="space-y-2 text-sm" style={{ color: THEME.textSecondary }}>
                <li><a href="#" className="hover:underline">Terms of Service</a></li>
                <li><a href="#" className="hover:underline">Privacy Policy</a></li>
                <li><a href="#" className="hover:underline">Refund Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t text-center text-sm" style={{ borderColor: THEME.border, color: THEME.textSecondary }}>
            <p>© {new Date().getFullYear()} Sirnawa Solutions. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}