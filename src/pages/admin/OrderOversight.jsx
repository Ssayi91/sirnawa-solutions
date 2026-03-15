import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { 
  collection, query, where, orderBy, limit, onSnapshot, 
  doc, getDoc, updateDoc, getDocs, serverTimestamp 
} from 'firebase/firestore';

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

export default function OrderOversight() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    rider: 'all',
    shop: 'all',
    search: ''
  });
  const [reassignModal, setReassignModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    completed: 0,
    revenue: 0
  });

  // Load data + real-time updates
  useEffect(() => {
    loadRiders();
    
    // Real-time orders listener
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersList);
      calculateStats(ordersList);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Load available riders for reassignment
  const loadRiders = async () => {
    try {
      const ridersRef = collection(db, 'users');
      const q = query(ridersRef, where('role', '==', 'rider'));
      const snapshot = await getDocs(q);
      const ridersList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setRiders(ridersList);
    } catch (err) {
      console.error('Error loading riders:', err);
    }
  };

  // Calculate live stats
  const calculateStats = (ordersList) => {
    const today = new Date().toDateString();
    const todayOrders = ordersList.filter(o => {
      const orderDate = o.createdAt?.toDate?.()?.toDateString();
      return orderDate === today;
    });
    
    setStats({
      total: ordersList.length,
      pending: ordersList.filter(o => o.status === 'pending').length,
      active: ordersList.filter(o => ['assigned', 'picked_up', 'arrived'].includes(o.status)).length,
      completed: ordersList.filter(o => o.status === 'complete').length,
      revenue: todayOrders.filter(o => o.paymentStatus === 'verified').reduce((sum, o) => sum + (o.fare || 0), 0)
    });
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (filters.status !== 'all' && order.status !== filters.status) return false;
    if (filters.rider !== 'all' && order.riderId !== filters.rider) return false;
    if (filters.shop !== 'all' && order.shopId !== filters.shop) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matches = 
        order.id?.toLowerCase().includes(search) ||
        order.clientName?.toLowerCase().includes(search) ||
        order.clientPhone?.includes(search) ||
        order.shopName?.toLowerCase().includes(search);
      if (!matches) return false;
    }
    return true;
  });

  // Reassign order to different rider
  const reassignOrder = async (orderId, newRiderId) => {
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('id', '==', orderId));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, {
          riderId: newRiderId,
          status: 'assigned',
          reassignedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setReassignModal(null);
        alert('✅ Order reassigned successfully');
      }
    } catch (err) {
      console.error('Error reassigning order:', err);
      alert('Failed to reassign order');
    }
  };

  // Cancel order
  const cancelOrder = async (orderId, reason) => {
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('id', '==', orderId));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, {
          status: 'cancelled',
          cancelReason: reason,
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setCancelModal(null);
        alert('✅ Order cancelled');
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      alert('Failed to cancel order');
    }
  };

  // Get status badge style
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

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp?.toDate) return 'Just now';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm" style={{ color: THEME.textSecondary }}>Super Admin</p>
              <h1 className="text-xl font-bold" style={{ color: THEME.text }}>Order Oversight</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={{ borderColor: THEME.border, color: THEME.text }}
              >
                Back to Dashboard
              </button>
              <button
                onClick={logout}
                className="p-2 rounded-lg"
                style={{ color: THEME.textSecondary }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        
        {/* Live Stats */}
        <section className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-2xl font-bold" style={{ color: THEME.text }}>{stats.total}</p>
              <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Total Orders</p>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-2xl font-bold" style={{ color: THEME.warning }}>{stats.pending}</p>
              <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Pending</p>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-2xl font-bold" style={{ color: THEME.primary }}>{stats.active}</p>
              <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>In Transit</p>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-2xl font-bold" style={{ color: THEME.success }}>{stats.completed}</p>
              <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Completed</p>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-2xl font-bold" style={{ color: THEME.primary }}>{stats.revenue} KSH</p>
              <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Revenue Today</p>
            </div>
          </div>
        </section>

        {/* Filters & Search */}
        <section className="mb-6">
          <div className="p-4 rounded-lg" style={{ backgroundColor: THEME.surface }}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: THEME.textSecondary }}>Search</label>
                <input
                  type="text"
                  placeholder="Order ID, client, phone..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: THEME.border, color: THEME.text }}
                />
              </div>
              
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: THEME.textSecondary }}>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: THEME.border, color: THEME.text, backgroundColor: THEME.surface }}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="picked_up">Picked Up</option>
                  <option value="arrived">Arrived</option>
                  <option value="complete">Complete</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              {/* Rider Filter */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: THEME.textSecondary }}>Rider</label>
                <select
                  value={filters.rider}
                  onChange={(e) => setFilters({...filters, rider: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: THEME.border, color: THEME.text, backgroundColor: THEME.surface }}
                >
                  <option value="all">All Riders</option>
                  {riders.map(rider => (
                    <option key={rider.uid} value={rider.uid}>
                      {rider.profile?.fullName || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Shop Filter */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: THEME.textSecondary }}>Shop</label>
                <select
                  value={filters.shop}
                  onChange={(e) => setFilters({...filters, shop: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: THEME.border, color: THEME.text, backgroundColor: THEME.surface }}
                >
                  <option value="all">All Shops</option>
                  {/* Could load shops dynamically */}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Orders Table */}
        <section>
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: THEME.surface }}>
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-medium border-b" style={{ borderColor: THEME.border, color: THEME.textSecondary }}>
              <div className="col-span-2">Order</div>
              <div className="col-span-2">Client</div>
              <div className="col-span-2">Shop</div>
              <div className="col-span-2">Rider</div>
              <div className="col-span-1">Fare</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Time</div>
              <div className="col-span-1">Actions</div>
            </div>

            {/* Orders List */}
            <div className="divide-y" style={{ divideColor: THEME.border }}>
              {filteredOrders.length === 0 ? (
                <div className="px-4 py-12 text-center" style={{ color: THEME.textSecondary }}>
                  No orders match your filters
                </div>
              ) : (
                filteredOrders.map(order => {
                  const status = getStatusStyle(order.status);
                  const rider = riders.find(r => r.uid === order.riderId);
                  
                  return (
                    <div key={order.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm hover:bg-gray-50 transition-colors">
                      {/* Order ID */}
                      <div className="col-span-2">
                        <p className="font-mono text-xs" style={{ color: THEME.textSecondary }}>#{order.id?.slice(-6)}</p>
                        <p className="font-medium" style={{ color: THEME.text }}>{order.trackingId?.slice(0, 6)}</p>
                      </div>
                      
                      {/* Client */}
                      <div className="col-span-2">
                        <p className="font-medium" style={{ color: THEME.text }}>{order.clientName}</p>
                        <p className="text-xs" style={{ color: THEME.textSecondary }}>{order.clientPhone}</p>
                      </div>
                      
                      {/* Shop */}
                      <div className="col-span-2">
                        <p className="font-medium" style={{ color: THEME.text }}>{order.shopName}</p>
                      </div>
                      
                      {/* Rider */}
                      <div className="col-span-2">
                        {rider ? (
                          <p className="font-medium" style={{ color: THEME.text }}>{rider.profile?.fullName}</p>
                        ) : order.status === 'pending' ? (
                          <span className="text-xs" style={{ color: THEME.textSecondary }}>Unassigned</span>
                        ) : (
                          <span className="text-xs" style={{ color: THEME.textSecondary }}>Unknown</span>
                        )}
                      </div>
                      
                      {/* Fare */}
                      <div className="col-span-1">
                        <p className="font-semibold" style={{ color: THEME.primary }}>{order.fare} KSH</p>
                      </div>
                      
                      {/* Status */}
                      <div className="col-span-1">
                        <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: status.bg, color: status.text }}>
                          {status.label}
                        </span>
                      </div>
                      
                      {/* Time */}
                      <div className="col-span-1">
                        <p className="text-xs" style={{ color: THEME.textSecondary }}>{formatTime(order.createdAt)}</p>
                      </div>
                      
                      {/* Actions */}
                      <div className="col-span-1 flex gap-1">
                        {order.status !== 'complete' && order.status !== 'cancelled' && (
                          <>
                            <button
                              onClick={() => setReassignModal(order)}
                              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                              title="Reassign"
                              style={{ color: THEME.primary }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setCancelModal(order)}
                              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                              title="Cancel"
                              style={{ color: THEME.error }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

      </main>

      {/* Reassign Modal */}
      {reassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: THEME.surface }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: THEME.text }}>Reassign Order</h3>
            <p className="text-sm mb-4" style={{ color: THEME.textSecondary }}>
              #{reassignModal.id?.slice(-6)} → {reassignModal.clientName}
            </p>
            
            <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>Assign to Rider</label>
            <select
              className="w-full px-4 py-3 rounded-lg border mb-4"
              style={{ borderColor: THEME.border, color: THEME.text, backgroundColor: THEME.surface }}
              defaultValue={reassignModal.riderId || ''}
              id="rider-select"
            >
              <option value="">Select a rider...</option>
              {riders.map(rider => (
                <option key={rider.uid} value={rider.uid}>
                  {rider.profile?.fullName} - {rider.profile?.bikeDescription}
                </option>
              ))}
            </select>
            
            <div className="flex gap-3">
              <button
                onClick={() => setReassignModal(null)}
                className="flex-1 py-3 rounded-lg font-medium border transition-colors"
                style={{ borderColor: THEME.border, color: THEME.text }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const riderId = document.getElementById('rider-select').value;
                  if (riderId) reassignOrder(reassignModal.id, riderId);
                }}
                className="flex-1 py-3 rounded-lg font-semibold text-white transition-colors"
                style={{ backgroundColor: THEME.primary }}
              >
                Reassign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: THEME.surface }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: THEME.text }}>Cancel Order</h3>
            <p className="text-sm mb-4" style={{ color: THEME.textSecondary }}>
              #{cancelModal.id?.slice(-6)} → {cancelModal.clientName}
            </p>
            
            <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>Reason (Optional)</label>
            <textarea
              className="w-full px-4 py-3 rounded-lg border mb-4"
              style={{ borderColor: THEME.border, color: THEME.text }}
              rows="3"
              placeholder="e.g., Client cancelled, fraud suspected..."
              id="cancel-reason"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setCancelModal(null)}
                className="flex-1 py-3 rounded-lg font-medium border transition-colors"
                style={{ borderColor: THEME.border, color: THEME.text }}
              >
                Keep Order
              </button>
              <button
                onClick={() => {
                  const reason = document.getElementById('cancel-reason').value || 'Cancelled by admin';
                  cancelOrder(cancelModal.id, reason);
                }}
                className="flex-1 py-3 rounded-lg font-semibold text-white transition-colors"
                style={{ backgroundColor: THEME.error }}
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}