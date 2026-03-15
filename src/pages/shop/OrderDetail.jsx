import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { 
  doc, getDoc, updateDoc, onSnapshot, serverTimestamp,
  collection, query, where, getDocs 
} from 'firebase/firestore';

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

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rider, setRider] = useState(null);

  useEffect(() => {
    if (!orderId) return;
    
    const loadOrder = async () => {
      try {
        // Query by custom 'id' field, not Firestore doc ID
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('id', '==', orderId));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setOrder(null);
          setLoading(false);
          return;
        }
        
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        
        // Verify shop owns this order
        if (data.shopId !== user?.uid) {
          navigate('/shop');
          return;
        }
        
        setOrder(data);
        
        // Load rider info if assigned
        if (data.riderId) {
          const riderSnap = await getDoc(doc(db, 'users', data.riderId));
          if (riderSnap.exists()) setRider(riderSnap.data());
        }
      } catch (err) {
        console.error('Error loading order:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadOrder();
    
    // Real-time listener
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('id', '==', orderId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setOrder(data);
        if (data.riderId && data.riderId !== rider?.uid) {
          getDoc(doc(db, 'users', data.riderId)).then(riderSnap => {
            if (riderSnap.exists()) setRider(riderSnap.data());
          });
        }
      }
    });
    
    return () => unsubscribe();
  }, [orderId, user, navigate]);

  const getStatusConfig = (status) => {
    const configs = {
      pending: { label: 'Pending', color: THEME.warning, bg: '#FEF3C7', step: 1 },
      assigned: { label: 'Assigned', color: THEME.primary, bg: '#DBEAFE', step: 2 },
      picked_up: { label: 'Picked Up', color: THEME.primary, bg: '#DBEAFE', step: 3 },
      arrived: { label: 'Arrived', color: THEME.warning, bg: '#FEF3C7', step: 4 },
      complete: { label: 'Delivered', color: THEME.success, bg: '#D1FAE5', step: 5 },
      cancelled: { label: 'Cancelled', color: THEME.error, bg: '#FEE2E2', step: 0 }
    };
    return configs[status] || configs.pending;
  };

  const getWhatsAppLink = (phone, message) => {
    const clean = phone?.replace(/\D/g, '');
    return `https://wa.me/254${clean}?text=${encodeURIComponent(message)}`;
  };

  const cancelOrder = async () => {
    if (!confirm('Cancel this order?')) return;
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('id', '==', orderId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, {
          status: 'cancelled',
          cancelledAt: serverTimestamp()
        });
        alert('Order cancelled');
      }
    } catch (err) {
      console.error('Error cancelling:', err);
      alert('Failed to cancel');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: THEME.bg }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: THEME.primary }}></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: THEME.bg }}>
        <div className="text-center">
          <p className="text-lg mb-4" style={{ color: THEME.text }}>Order not found</p>
          <button onClick={() => navigate('/shop')} className="px-6 py-2 rounded-lg font-semibold text-white" style={{ backgroundColor: THEME.primary }}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const status = getStatusConfig(order.status);

  return (
    <div className="min-h-screen" style={{ backgroundColor: THEME.bg }}>
      {/* Header */}
      <header className="sticky top-0 z-10" style={{ backgroundColor: THEME.surface }}>
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/shop')} className="p-2 rounded-lg" style={{ color: THEME.textSecondary }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex-1">
              <p className="text-sm" style={{ color: THEME.textSecondary }}>Order Details</p>
              <h1 className="text-xl font-bold" style={{ color: THEME.text }}>#{order.id?.slice(-6).toUpperCase()}</h1>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: status.bg, color: status.color }}>{status.label}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Status Timeline */}
        <section className="mb-8">
          <div className="flex items-center justify-between">
            {['Pending', 'Assigned', 'Picked Up', 'Arrived', 'Delivered'].map((label, i) => {
              const step = i + 1;
              const isComplete = status.step >= step && order.status !== 'cancelled';
              return (
                <div key={label} className="flex-1 text-center">
                  <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-medium ${isComplete ? 'text-white' : 'text-gray-400'}`} style={{ backgroundColor: isComplete ? THEME.primary : THEME.border }}>{isComplete ? '✓' : i + 1}</div>
                  <p className={`text-xs ${status.step === step ? 'font-semibold' : ''}`} style={{ color: status.step === step ? THEME.text : THEME.textSecondary }}>{label}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Order Info */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: THEME.text }}>Order Information</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: THEME.surface }}>
              <p className="text-sm mb-1" style={{ color: THEME.textSecondary }}>Recipient</p>
              <p className="font-medium" style={{ color: THEME.text }}>{order.clientName}</p>
              <p className="text-sm" style={{ color: THEME.textSecondary }}>{order.clientPhone}</p>
              <p className="text-sm mt-2" style={{ color: THEME.text }}>{order.dropoffAddress}</p>
              {order.landmark && <p className="text-sm" style={{ color: THEME.textSecondary }}>Landmark: {order.landmark}</p>}
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: THEME.surface }}>
              <p className="text-sm mb-1" style={{ color: THEME.textSecondary }}>Package</p>
              <p className="font-medium" style={{ color: THEME.text }}>{order.packageType}</p>
              {order.instructions && <p className="text-sm mt-2" style={{ color: THEME.textSecondary }}>Instructions: {order.instructions}</p>}
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: THEME.surface }}>
              <p className="text-sm mb-1" style={{ color: THEME.textSecondary }}>Pickup</p>
              <p className="font-medium" style={{ color: THEME.text }}>{order.pickupAddress}</p>
              <p className="text-sm" style={{ color: THEME.textSecondary }}>Timing: {order.pickupTiming}</p>
            </div>
          </div>
        </section>

        {/* Rider Info */}
        {order.riderId && rider && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: THEME.text }}>Assigned Rider</h2>
            <div className="p-4 rounded-lg flex items-center gap-4" style={{ backgroundColor: THEME.surface }}>
              {rider.profile?.profilePhotoUrl ? (
                <img src={rider.profile.profilePhotoUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: THEME.primary }}>{rider.profile?.fullName?.charAt(0) || 'R'}</div>
              )}
              <div className="flex-1">
                <p className="font-medium" style={{ color: THEME.text }}>{rider.profile?.fullName}</p>
                <p className="text-sm" style={{ color: THEME.textSecondary }}>{rider.profile?.bikeDescription}</p>
              </div>
              <a href={getWhatsAppLink(rider.profile?.phone, `Hi ${rider.profile?.fullName}, regarding order #${order.id?.slice(-6)}...`)} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: THEME.success }}>WhatsApp</a>
            </div>
          </section>
        )}

        {/* Payment */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: THEME.text }}>Payment</h2>
          <div className="p-4 rounded-lg" style={{ backgroundColor: THEME.surface }}>
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm" style={{ color: THEME.textSecondary }}>Total Fare</p>
              <p className="text-2xl font-bold" style={{ color: THEME.primary }}>{order.fare} KSH</p>
            </div>
            <div className="space-y-2 text-sm" style={{ color: THEME.textSecondary }}>
              <p>Payment Method: Paybill</p>
              <p>Client pays after delivery</p>
              <p>Account: <span className="font-mono">{order.id}</span></p>
            </div>
            {order.paymentStatus === 'verified' && (
              <div className="mt-3 py-2 px-3 rounded text-sm font-medium" style={{ backgroundColor: '#D1FAE5', color: THEME.success }}>✓ Payment verified</div>
            )}
          </div>
        </section>

        {/* Tracking Link */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: THEME.text }}>Client Tracking</h2>
          <div className="p-4 rounded-lg" style={{ backgroundColor: THEME.surface }}>
            <p className="text-sm mb-2" style={{ color: THEME.textSecondary }}>Share with client:</p>
            <div className="flex gap-2">
              <input readOnly value={`sirnawa.co.ke/track/${order.trackingId}`} className="flex-1 px-3 py-2 rounded-lg text-sm border" style={{ borderColor: THEME.border, color: THEME.text, backgroundColor: THEME.bg }} />
              <button onClick={() => { navigator.clipboard.writeText(`sirnawa.co.ke/track/${order.trackingId}`); alert('Copied!'); }} className="px-4 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: THEME.border, color: THEME.text }}>Copy</button>
            </div>
            <a href={getWhatsAppLink(order.clientPhone, `🚴 Delivery Dispatched\n\nHi ${order.clientName}, your order #${order.id} is on the way!\n\nTrack: sirnawa.co.ke/track/${order.trackingId}`)} target="_blank" rel="noopener noreferrer" className="mt-3 w-full py-2 rounded-lg text-sm font-medium text-white text-center" style={{ backgroundColor: THEME.success }}>Send via WhatsApp</a>
          </div>
        </section>

        {/* Actions */}
        <section className="mb-8">
          <div className="space-y-3">
            {order.status === 'pending' && (
              <button onClick={cancelOrder} className="w-full py-3 rounded-lg font-semibold text-white" style={{ backgroundColor: THEME.error }}>Cancel Order</button>
            )}
            <button onClick={() => navigate('/shop')} className="w-full py-3 rounded-lg font-medium border" style={{ borderColor: THEME.border, color: THEME.text }}>Back to Orders</button>
            <button onClick={logout} className="w-full py-3 rounded-lg font-semibold text-white" style={{ backgroundColor: THEME.error }}>Logout</button>
          </div>
        </section>
      </main>
    </div>
  );
}