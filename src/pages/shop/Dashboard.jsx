import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { 
  collection, query, where, orderBy, getDocs, addDoc, 
  serverTimestamp, limit, startAfter 
} from 'firebase/firestore';
// ✅ Import distance utilities
import { calculateDistance, geocodeAddress, calculateFareByDistance, getPricingTier } from '../../utils/distance';

// Clean theme
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

export default function ShopDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrder, setShowNewOrder] = useState(false);
  
  // Filter & pagination state
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // ✅ Distance calculation state
  const [manualFareMode, setManualFareMode] = useState(false);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [distanceInfo, setDistanceInfo] = useState(null);

  const [newOrder, setNewOrder] = useState({
    clientName: '', 
    clientPhone: '', 
    dropoffAddress: '',
    landmark: '', 
    packageType: 'Small Bag',
    instructions: '', 
    pickupTiming: 'ASAP',
    fare: 210  // ✅ Default to base fare 210 KSH
  });

  // Load initial orders
  useEffect(() => {
    if (user?.uid) loadOrders(true);
  }, [user, activeTab]);

  // Load orders with pagination
  const loadOrders = async (reset = false) => {
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      const ordersRef = collection(db, 'orders');
      
      let q;
      if (activeTab === 'active') {
        q = query(
          ordersRef,
          where('shopId', '==', user.uid),
          where('status', 'in', ['pending', 'assigned', 'picked_up', 'arrived']),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
      } else if (activeTab === 'completed') {
        q = query(
          ordersRef,
          where('shopId', '==', user.uid),
          where('status', '==', 'complete'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
      } else if (activeTab === 'cancelled') {
        q = query(
          ordersRef,
          where('shopId', '==', user.uid),
          where('status', '==', 'cancelled'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
      } else {
        q = query(
          ordersRef,
          where('shopId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
      }

      if (!reset && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const snapshot = await getDocs(q);
      const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (reset) {
        setOrders(ordersList);
      } else {
        setOrders(prev => [...prev, ...ordersList]);
      }
      
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 10);
      
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadOrders(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      order.id?.toLowerCase().includes(q) ||
      order.clientName?.toLowerCase().includes(q) ||
      order.clientPhone?.includes(q) ||
      order.trackingId?.toLowerCase().includes(q)
    );
  });

  // ✅ Calculate distance-based fare when address changes
  const calculateDistanceBasedFare = async () => {
    if (!newOrder.dropoffAddress || !user?.profile?.location) {
      // If shop has no location, use manual mode
      setManualFareMode(true);
      return;
    }
    
    setGeocodingLoading(true);
    setDistanceInfo(null);
    
    try {
      // Get shop coordinates
      const shopLat = user.profile.location.latitude;
      const shopLon = user.profile.location.longitude;
      
      // Geocode dropoff address
      const dropoffCoords = await geocodeAddress(newOrder.dropoffAddress);
      
      // Calculate distance
      const distance = calculateDistance(
        shopLat, shopLon,
        dropoffCoords.lat, dropoffCoords.lon
      );
      
      // Calculate fare based on tiers
      const fare = calculateFareByDistance(distance);
      const tier = getPricingTier(distance);
      
      // Update order with calculated fare
      setNewOrder(prev => ({
        ...prev,
        fare
      }));
      
      setDistanceInfo({
        distance,
        tier,
        fare
      });
      
      // Stay in auto mode
      setManualFareMode(false);
      
    } catch (err) {
      console.error('Error calculating distance:', err);
      // Fallback to manual entry
      setManualFareMode(true);
      setDistanceInfo(null);
    } finally {
      setGeocodingLoading(false);
    }
  };

  // Handle address change with debounce
  const handleAddressChange = (value) => {
    setNewOrder(prev => ({
      ...prev,
      dropoffAddress: value
    }));
    
    // Clear previous distance info
    setDistanceInfo(null);
    
    // Auto-calculate fare when address changes (if not in manual mode)
    if (!manualFareMode && user?.profile?.location && value.trim().length > 5) {
      // Debounce: wait 1 second after typing stops
      const timeoutId = setTimeout(() => {
        calculateDistanceBasedFare();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  };

  const createOrder = async () => {
    if (!newOrder.clientName || !newOrder.clientPhone || !newOrder.dropoffAddress) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate fare (minimum 210 KSH)
    if (newOrder.fare < 210) {
      alert('Minimum delivery fare is 210 KSH');
      return;
    }

    try {
      const orderId = `ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const trackingId = Math.random().toString(36).substr(2, 8);

      const orderData = {
        id: orderId,
        trackingId,
        otp,
        shopId: user.uid,
        shopName: user?.profile?.businessName || 'Unknown Shop',
        clientName: newOrder.clientName,
        clientPhone: newOrder.clientPhone,
        dropoffAddress: newOrder.dropoffAddress,
        landmark: newOrder.landmark,
        packageType: newOrder.packageType,
        instructions: newOrder.instructions,
        pickupAddress: user?.profile?.pickupAddress || '',
        pickupTiming: newOrder.pickupTiming,
        fare: parseInt(newOrder.fare) || 210,
        // ✅ Fare breakdown for transparency
        fareBreakdown: {
          method: manualFareMode ? 'manual' : 'distance-based',
          distance: distanceInfo?.distance || null,
          tier: distanceInfo?.tier || null,
          calculatedAt: new Date().toISOString()
        },
        currency: 'KES',
        paymentStatus: 'pending',
        paymentMethod: 'paybill',
        status: 'pending',
        riderId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderData);
      setNewOrder({
        clientName: '', 
        clientPhone: '', 
        dropoffAddress: '',
        landmark: '', 
        packageType: 'Small Bag',
        instructions: '', 
        pickupTiming: 'ASAP',
        fare: 210
      });
      setDistanceInfo(null);
      setManualFareMode(false);
      setShowNewOrder(false);
      loadOrders(true);
    } catch (err) {
      console.error('Error creating order:', err);
      alert('Failed to create order. Please try again.');
    }
  };

  const getDispatchMessage = (order) => {
    return `🚴 Delivery Dispatched – Sirnawa Solutions

Hi ${order.clientName}, ${order.shopName} has sent you a package!

📦 Order ID: #${order.id}
💰 Amount: ${order.fare} KSH (Pay AFTER Delivery)

💳 Payment Details:
• Paybill: [Your Paybill]
• Account: ${order.id}
• Amount: ${order.fare}

👉 Track Live: sirnawa.co.ke/track/${order.trackingId}

📞 Support: +254736194051

Have M-Pesa ready. Pay when rider arrives.`;
  };

  const getStatusStyle = (status) => {
    const styles = {
      pending: { bg: '#FEF3C7', text: '#D97706', label: 'Pending' },
      assigned: { bg: '#DBEAFE', text: '#2563EB', label: 'Assigned' },
      picked_up: { bg: '#DBEAFE', text: '#2563EB', label: 'Picked Up' },
      arrived: { bg: '#FEF3C7', text: '#D97706', label: 'Arrived' },
      complete: { bg: '#D1FAE5', text: '#059669', label: 'Complete' },
      cancelled: { bg: '#FEE2E2', text: '#DC2626', label: 'Cancelled' }
    };
    return styles[status] || styles.pending;
  };

  if (loading && orders.length === 0) {
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
              <p className="text-sm" style={{ color: THEME.textSecondary }}>Shop Dashboard</p>
              <h1 className="text-xl font-bold" style={{ color: THEME.text }}>
                {user?.profile?.businessName || 'My Shop'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowNewOrder(true)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: THEME.primary }}
              >
                + New Delivery
              </button>
              <button onClick={logout} className="p-2 rounded-lg" style={{ color: THEME.textSecondary }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        
        {/* Quick Stats */}
        <section className="mb-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-2xl font-bold" style={{ color: THEME.primary }}>
                {orders.filter(o => o.status === 'pending').length}
              </p>
              <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Pending</p>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-2xl font-bold" style={{ color: THEME.warning }}>
                {orders.filter(o => ['assigned', 'picked_up', 'arrived'].includes(o.status)).length}
              </p>
              <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>In Transit</p>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-2xl font-bold" style={{ color: THEME.success }}>
                {orders.filter(o => o.status === 'complete').length}
              </p>
              <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Completed</p>
            </div>
          </div>
        </section>

        {/* Search & Tabs */}
        <section className="mb-4">
          {/* Search Bar */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search orders by ID, client, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border text-sm"
              style={{ borderColor: THEME.border, color: THEME.text }}
            />
          </div>
          
          {/* Status Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { id: 'active', label: '🔄 Active' },
              { id: 'all', label: '📋 All' },
              { id: 'completed', label: '✅ Completed' },
              { id: 'cancelled', label: '❌ Cancelled' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); loadOrders(true); setSearchQuery(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id ? 'text-white' : 'border'
                }`}
                style={{
                  backgroundColor: activeTab === tab.id ? THEME.primary : THEME.surface,
                  borderColor: THEME.border,
                  color: activeTab === tab.id ? '#fff' : THEME.text
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* Orders List */}
        <section>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 rounded-lg" style={{ backgroundColor: THEME.surface }}>
              <p className="text-base mb-1" style={{ color: THEME.text }}>
                {searchQuery ? 'No orders match your search' : `No ${activeTab} orders yet`}
              </p>
              <p className="text-sm mb-4" style={{ color: THEME.textSecondary }}>
                {activeTab === 'active' ? 'Create your first delivery to get started' : 'Try a different filter'}
              </p>
              {activeTab === 'active' && (
                <button onClick={() => setShowNewOrder(true)} className="px-6 py-2 rounded-lg font-semibold text-white" style={{ backgroundColor: THEME.primary }}>
                  + New Delivery
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-0 divide-y" style={{ divideColor: THEME.border }}>
                {filteredOrders.map(order => {
                  const status = getStatusStyle(order.status);
                  return (
                    <div key={order.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono" style={{ color: THEME.textSecondary }}>#{order.id?.slice(-6)}</span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: status.bg, color: status.text }}>{status.label}</span>
                          </div>
                          <p className="font-medium" style={{ color: THEME.text }}>{order.clientName}</p>
                          <p className="text-sm" style={{ color: THEME.textSecondary }}>{order.dropoffAddress}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold" style={{ color: THEME.primary }}>{order.fare} KSH</p>
                          <p className="text-xs" style={{ color: THEME.textSecondary }}>
                            {order.createdAt?.toDate?.().toLocaleDateString() || 'Just now'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <a
                          href={`https://wa.me/254${order.clientPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(getDispatchMessage(order))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 rounded-lg text-sm font-medium text-center border transition-colors"
                          style={{ borderColor: THEME.border, color: THEME.text }}
                        >
                          Share Tracking
                        </a>
                        <button
                          onClick={() => navigate(`/shop/order/${order.id}`)}
                          className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                          style={{ backgroundColor: THEME.primary }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Load More Button */}
              {hasMore && (
                <div className="text-center py-4">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-6 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50"
                    style={{ borderColor: THEME.border, color: THEME.text }}
                  >
                    {loading ? 'Loading...' : 'Load More Orders'}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* New Order Modal */}
      {showNewOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: THEME.surface }}>
            <div className="flex justify-between items-center mb-6 sticky top-0 pb-2" style={{ backgroundColor: THEME.surface }}>
              <h2 className="text-xl font-bold" style={{ color: THEME.text }}>New Delivery</h2>
              <button onClick={() => setShowNewOrder(false)} className="p-2 rounded-lg" style={{ color: THEME.textSecondary }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>Recipient Name *</label>
                <input type="text" value={newOrder.clientName} onChange={(e) => setNewOrder({...newOrder, clientName: e.target.value})} className="w-full px-4 py-3 rounded-lg border focus:outline-none" style={{ borderColor: THEME.border, color: THEME.text }} placeholder="e.g., Jane Mwangi" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>WhatsApp Phone *</label>
                <input type="tel" value={newOrder.clientPhone} onChange={(e) => setNewOrder({...newOrder, clientPhone: e.target.value})} className="w-full px-4 py-3 rounded-lg border focus:outline-none" style={{ borderColor: THEME.border, color: THEME.text }} placeholder="712345678" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>Drop-off Address *</label>
                <textarea 
                  value={newOrder.dropoffAddress} 
                  onChange={(e) => handleAddressChange(e.target.value)} 
                  rows="2" 
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none" 
                  style={{ borderColor: THEME.border, color: THEME.text }} 
                  placeholder="e.g., Embakasi, Near Airport" 
                />
                {geocodingLoading && (
                  <p className="text-xs mt-1" style={{ color: THEME.primary }}>
                    📍 Calculating distance...
                  </p>
                )}
                {distanceInfo && !geocodingLoading && (
                  <p className="text-xs mt-1" style={{ color: THEME.success }}>
                    ✓ {distanceInfo.distance} km • {distanceInfo.tier}
                  </p>
                )}
                {!user?.profile?.location && (
                  <p className="text-xs mt-1" style={{ color: THEME.warning }}>
                    ⚠️ Your shop location is not set. Fare will be manual.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>Landmark (Optional)</label>
                <input type="text" value={newOrder.landmark} onChange={(e) => setNewOrder({...newOrder, landmark: e.target.value})} className="w-full px-4 py-3 rounded-lg border focus:outline-none" style={{ borderColor: THEME.border, color: THEME.text }} placeholder="e.g., Blue gate, 3rd floor" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>Package Type</label>
                <select value={newOrder.packageType} onChange={(e) => setNewOrder({...newOrder, packageType: e.target.value})} className="w-full px-4 py-3 rounded-lg border focus:outline-none" style={{ borderColor: THEME.border, color: THEME.text, backgroundColor: THEME.surface }}>
                  <option>Small Bag</option><option>Medium Box</option><option>Large Box</option><option>Documents</option><option>Food</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>Special Instructions</label>
                <textarea value={newOrder.instructions} onChange={(e) => setNewOrder({...newOrder, instructions: e.target.value})} rows="2" className="w-full px-4 py-3 rounded-lg border focus:outline-none" style={{ borderColor: THEME.border, color: THEME.text }} placeholder="e.g., Handle with care, call on arrival" />
              </div>
              
              {/* ✅ DISTANCE-BASED FARE WITH MANUAL FALLBACK */}
              <div className="py-3 px-4 rounded-lg border-2" style={{ backgroundColor: THEME.bg, borderColor: THEME.primary }}>
                <p className="text-sm font-medium mb-2" style={{ color: THEME.text }}>Delivery Fee (KSH) *</p>
                
                {manualFareMode ? (
                  <div>
                    <input
                      type="number"
                      value={newOrder.fare}
                      onChange={(e) => setNewOrder({...newOrder, fare: parseInt(e.target.value) || 210})}
                      min="210"
                      step="10"
                      className="w-full px-4 py-3 rounded-lg border-2 text-2xl font-bold text-center focus:outline-none mb-2"
                      style={{ borderColor: THEME.primary, color: THEME.primary }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        setManualFareMode(false);
                        if (newOrder.dropoffAddress && user?.profile?.location) {
                          calculateDistanceBasedFare();
                        }
                      }}
                      className="text-xs underline"
                      style={{ color: THEME.primary }}
                    >
                      📍 Try auto-calculate again
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-center mb-2" style={{ color: THEME.primary }}>
                      {geocodingLoading ? 'Calculating...' : `${newOrder.fare} KSH`}
                    </p>
                    {distanceInfo && !geocodingLoading && (
                      <p className="text-xs text-center mb-2" style={{ color: THEME.textSecondary }}>
                        Distance: {distanceInfo.distance} km • {distanceInfo.tier}
                      </p>
                    )}
                    <button 
                      type="button"
                      onClick={() => setManualFareMode(true)}
                      className="text-xs underline block mx-auto"
                      style={{ color: THEME.textSecondary }}
                    >
                      ✏️ Enter fare manually
                    </button>
                  </div>
                )}
                
                <p className="text-xs mt-3 text-center" style={{ color: THEME.textSecondary }}>
                  ⚠️ Minimum: 210 KSH
                </p>
                <p className="text-xs mt-1 text-center" style={{ color: THEME.textSecondary }}>
                  📍 0-11km = 210 KSH • 11-20km = 350 KSH • 20+km = 500 KSH
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 sticky bottom-0" style={{ backgroundColor: THEME.surface }}>
              <button onClick={() => setShowNewOrder(false)} className="flex-1 py-3 rounded-lg font-medium border transition-colors" style={{ borderColor: THEME.border, color: THEME.text }}>Cancel</button>
              <button onClick={createOrder} className="flex-1 py-3 rounded-lg font-semibold text-white transition-colors" style={{ backgroundColor: THEME.primary }}>Create Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}