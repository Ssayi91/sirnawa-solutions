import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

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

export default function TrackOrder() {
  const { trackingId } = useParams();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState(null);
  const [rider, setRider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [rating, setRating] = useState({ rider: 5, shop: 5, comment: '' });

  // Load order by trackingId
  useEffect(() => {
    if (!trackingId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    
    console.log('🔍 Tracking ID from URL:', trackingId);
    
    const loadOrder = async () => {
      try {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('trackingId', '==', trackingId));
        const snapshot = await getDocs(q);
        
        console.log('📡 Query result:', snapshot.empty ? 'No orders found' : `${snapshot.size} order(s) found`);
        
        if (snapshot.empty) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        
        const data = snapshot.docs[0].data();
        console.log('✅ Order loaded:', { id: data.id, status: data.status });
        setOrder(data);
        
        // Load rider public info if assigned
        if (data.riderId) {
          try {
            const ridersRef = collection(db, 'users');
            const riderQ = query(ridersRef, where('uid', '==', data.riderId));
            const riderSnap = await getDocs(riderQ);
            if (!riderSnap.empty) {
              const riderData = riderSnap.docs[0].data();
              setRider({
                name: riderData.profile?.fullName,
                photo: riderData.profile?.profilePhotoUrl,
                bike: riderData.profile?.bikeDescription,
                rating: riderData.profile?.performance?.averageRating
              });
              console.log('🏍️ Rider info loaded:', riderData.profile?.fullName);
            }
          } catch (err) {
            console.warn('⚠️ Could not load rider info (non-critical):', err);
            // Continue without rider info - not critical for tracking page
          }
        }
      } catch (err) {
        console.error('❌ Error loading order:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    
    loadOrder();
    
    // Real-time updates listener
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('trackingId', '==', trackingId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const newData = snapshot.docs[0].data();
        console.log('🔄 Real-time update:', { status: newData.status });
        setOrder(newData);
      }
    });
    
    return () => {
      console.log('🧹 Cleaning up tracking listener');
      unsubscribe();
    };
  }, [trackingId]);

  // Status config for timeline
  const getStatusConfig = (status) => {
    const configs = {
      pending: { label: 'Order Placed', step: 1 },
      assigned: { label: 'Rider Assigned', step: 2 },
      picked_up: { label: 'Picked Up', step: 3 },
      arrived: { label: 'Arrived', step: 4 },
      complete: { label: 'Delivered', step: 5 },
      cancelled: { label: 'Cancelled', step: 0 }
    };
    return configs[status] || configs.pending;
  };

  // Submit rating
  const submitRating = async () => {
    if (!order) return;
    try {
      // In production, save to /ratings collection
      console.log('⭐ Rating submitted:', { orderId: order.id, ...rating });
      setRatingSubmitted(true);
      alert('Thank you for your feedback! 🙏');
    } catch (err) {
      console.error('Error submitting rating:', err);
    }
  };

  // ✅ FIXED: WhatsApp helper - NO EXTRA SPACES
  const getWhatsAppLink = (phone, message) => {
    const clean = phone?.replace(/\D/g, '');
    return `https://wa.me/254${clean}?text=${encodeURIComponent(message)}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: THEME.bg }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: THEME.primary }}></div>
      </div>
    );
  }

  // Not found state
  if (notFound || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: THEME.bg }}>
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-xl font-bold mb-2" style={{ color: THEME.text }}>Tracking Link Not Found</h1>
          <p className="mb-6" style={{ color: THEME.textSecondary }}>
            This order may have expired or the link is incorrect.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 rounded-lg font-semibold text-white"
            style={{ backgroundColor: THEME.primary }}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const status = getStatusConfig(order.status);
  const isComplete = order.status === 'complete';
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen" style={{ backgroundColor: THEME.bg }}>
      {/* Header */}
      <header className="sticky top-0 z-10" style={{ backgroundColor: THEME.surface }}>
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: THEME.textSecondary }}>Track Order</p>
              <h1 className="text-xl font-bold" style={{ color: THEME.text }}>#{order.id?.slice(-6).toUpperCase()}</h1>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              isComplete ? 'bg-green-100 text-green-700' :
              isCancelled ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {isCancelled ? 'Cancelled' : isComplete ? 'Delivered' : 'In Progress'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        
        {/* Status Timeline */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: THEME.text }}>Delivery Status</h2>
          <div className="flex items-center justify-between">
            {['Placed', 'Assigned', 'Picked Up', 'Arrived', 'Delivered'].map((label, i) => {
              const step = i + 1;
              const isDone = status.step >= step && !isCancelled;
              return (
                <div key={label} className="flex-1 text-center">
                  <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-medium transition-colors ${
                    isDone ? 'text-white' : 'text-gray-400'
                  }`} style={{ backgroundColor: isDone ? THEME.primary : THEME.border }}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <p className={`text-xs ${status.step === step && !isCancelled ? 'font-semibold' : ''}`} 
                    style={{ color: status.step === step && !isCancelled ? THEME.text : THEME.textSecondary }}>
                    {label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Order Summary */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: THEME.text }}>Order Details</h2>
          <div className="p-4 rounded-lg" style={{ backgroundColor: THEME.surface }}>
            <p className="text-sm mb-1" style={{ color: THEME.textSecondary }}>From</p>
            <p className="font-medium" style={{ color: THEME.text }}>{order.shopName}</p>
            <p className="text-sm mt-3 mb-1" style={{ color: THEME.textSecondary }}>To</p>
            <p className="font-medium" style={{ color: THEME.text }}>{order.dropoffAddress}</p>
            {order.landmark && <p className="text-sm" style={{ color: THEME.textSecondary }}>Landmark: {order.landmark}</p>}
            <p className="text-sm mt-3 mb-1" style={{ color: THEME.textSecondary }}>Package</p>
            <p className="font-medium" style={{ color: THEME.text }}>{order.packageType}</p>
          </div>
        </section>

        {/* Rider Info (when assigned) */}
        {rider && !isCancelled && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: THEME.text }}>Your Rider</h2>
            <div className="p-4 rounded-lg flex items-center gap-4" style={{ backgroundColor: THEME.surface }}>
              {rider.photo ? (
                <img src={rider.photo} alt="" className="w-14 h-14 rounded-full object-cover border-2" style={{ borderColor: THEME.primary }} />
              ) : (
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: THEME.primary }}>
                  {rider.name?.charAt(0) || 'R'}
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium" style={{ color: THEME.text }}>{rider.name}</p>
                <p className="text-sm" style={{ color: THEME.textSecondary }}>{rider.bike}</p>
                {rider.rating && (
                  <p className="text-sm" style={{ color: THEME.textSecondary }}>⭐ {rider.rating}/5</p>
                )}
              </div>
              {/* ✅ FIXED: WhatsApp link with no extra spaces */}
              <a 
                href={getWhatsAppLink(order.clientPhone, `Hi ${rider.name}, I'm the recipient for order #${order.id?.slice(-6)}.`)}
                target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: THEME.success }}
              >
                WhatsApp
              </a>
            </div>
          </section>
        )}

        {/* OTP & Payment */}
        <section className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OTP Card */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: THEME.surface }}>
              <p className="text-sm font-medium mb-2" style={{ color: THEME.primary }}>🔐 Your Code</p>
              <p className="text-3xl font-mono font-bold tracking-wider" style={{ color: THEME.text }}>
                {order.otp || '••••'}
              </p>
              <p className="text-xs mt-2" style={{ color: THEME.textSecondary }}>
                Show this code to your rider before receiving package
              </p>
            </div>

            {/* Payment Card */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: THEME.surface }}>
              <p className="text-sm font-medium mb-2" style={{ color: THEME.primary }}>💳 Payment</p>
              <p className="text-2xl font-bold mb-2" style={{ color: THEME.primary }}>{order.fare} KSH</p>
              <div className="space-y-1 text-sm" style={{ color: THEME.textSecondary }}>
                <p>Paybill: <span className="font-mono font-medium" style={{ color: THEME.text }}>[Your Paybill]</span></p>
                <p>Account: <span className="font-mono font-medium" style={{ color: THEME.text }}>{order.id}</span></p>
                <p className="mt-2" style={{ color: THEME.warning }}>Pay AFTER delivery</p>
              </div>
            </div>
          </div>
        </section>

        {/* Support */}
        <section className="mb-6">
          <div className="p-4 rounded-lg flex items-center justify-between" style={{ backgroundColor: THEME.surface }}>
            <div>
              <p className="font-medium" style={{ color: THEME.text }}>Need Help?</p>
              <p className="text-sm" style={{ color: THEME.textSecondary }}>Chat with support</p>
            </div>
            {/* ✅ FIXED: Support WhatsApp link with no extra spaces */}
            <a
              href="https://wa.me/254736194051"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: THEME.success }}
            >
              WhatsApp Support
            </a>
          </div>
        </section>

        {/* Rating Form (after delivery) */}
        {isComplete && !ratingSubmitted && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4" style={{ color: THEME.text }}>How was your delivery?</h2>
            <div className="p-4 rounded-lg space-y-4" style={{ backgroundColor: THEME.surface }}>
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: THEME.text }}>Rate your Rider</p>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRating({...rating, rider: star})}
                      className="text-2xl transition-colors"
                      style={{ color: star <= rating.rider ? THEME.warning : THEME.border }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: THEME.text }}>Rate the Shop</p>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRating({...rating, shop: star})}
                      className="text-2xl transition-colors"
                      style={{ color: star <= rating.shop ? THEME.warning : THEME.border }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: THEME.text }}>Comments (Optional)</p>
                <textarea
                  value={rating.comment}
                  onChange={(e) => setRating({...rating, comment: e.target.value})}
                  rows="2"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: THEME.border, color: THEME.text }}
                  placeholder="Share your experience..."
                />
              </div>
              <button
                onClick={submitRating}
                className="w-full py-3 rounded-lg font-semibold text-white"
                style={{ backgroundColor: THEME.primary }}
              >
                Submit Feedback
              </button>
            </div>
          </section>
        )}

        {/* Rating Submitted */}
        {ratingSubmitted && (
          <section className="mb-8">
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#D1FAE5' }}>
              <p className="text-lg font-medium" style={{ color: THEME.success }}>Thank you! 🙏</p>
              <p className="text-sm" style={{ color: THEME.textSecondary }}>Your feedback helps us improve</p>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center py-8">
          <p className="text-sm" style={{ color: THEME.textSecondary }}>
            Powered by Sirnawa Solutions
          </p>
          <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>
            Nairobi, Kenya • +254 736 194051
          </p>
        </footer>

      </main>
    </div>
  );
}