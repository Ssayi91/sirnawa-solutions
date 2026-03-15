import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

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

export default function AdminDashboard() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    activeRiders: 0,
    pendingOrders: 0,
    activeShops: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        console.log('📊 Fetching admin stats...');
        
        // 1. Fetch ALL users
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const allUsers = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        
        // ✅ FIX: Check for BOTH "active" AND "available" status for riders
        const activeRiders = allUsers.filter(u => 
          u.role === 'rider' && 
          (u.profile?.status === 'active' || u.profile?.status === 'available')
        ).length;
        
        // Shops use "active" status
        const activeShops = allUsers.filter(u => 
          u.role === 'shop' && u.profile?.status === 'active'
        ).length;
        
        console.log('👥 Users loaded:', allUsers.length);
        console.log('🏍️ Active riders:', activeRiders);
        console.log('🏪 Active shops:', activeShops);
        
        // Log rider statuses for debugging
        const riders = allUsers.filter(u => u.role === 'rider');
        console.log('🔍 Rider statuses:', riders.map(r => ({
          name: r.profile?.fullName,
          status: r.profile?.status
        })));

        // 2. Fetch ALL orders
        const ordersRef = collection(db, 'orders');
        const ordersSnapshot = await getDocs(ordersRef);
        const allOrders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Pending orders: status is "pending"
        const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
        
        // ✅ FIX: Revenue = orders that are complete AND have payment verified
        // Also handle timestamp parsing safely
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        const revenue = allOrders
          .filter(o => {
            // Order must be complete AND payment verified
            if (o.status !== 'complete') return false;
            if (o.paymentStatus !== 'verified') return false;
            
            // Safe timestamp parsing
            const orderDate = o.createdAt?.toDate?.();
            if (!orderDate) return false;
            
            return orderDate.getMonth() === currentMonth && 
                   orderDate.getFullYear() === currentYear;
          })
          .reduce((sum, o) => sum + (o.fare || 0), 0);
        
        console.log('📦 Orders loaded:', allOrders.length);
        console.log('⏳ Pending orders:', pendingOrders);
        console.log('💰 Revenue MTD:', revenue);
        
        // Log order statuses for debugging
        console.log('🔍 Order statuses:', allOrders.map(o => ({
          id: o.id?.slice(-6),
          status: o.status,
          paymentStatus: o.paymentStatus,
          fare: o.fare,
          createdAt: o.createdAt?.toDate?.()?.toISOString()?.slice(0, 10)
        })));

        setStats({
          activeRiders,
          pendingOrders,
          activeShops,
          revenue
        });
        
        setDebugInfo({
          totalUsers: allUsers.length,
          totalOrders: allOrders.length,
          ridersCount: riders.length,
          riderStatuses: [...new Set(riders.map(r => r.profile?.status))],
          orderStatuses: [...new Set(allOrders.map(o => o.status))],
          verifiedPayments: allOrders.filter(o => o.paymentStatus === 'verified').length
        });
        
      } catch (err) {
        console.error('❌ Error fetching stats:', err);
        setDebugInfo({ error: err.message });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  // Format currency
  const formatKSH = (amount) => {
    return new Intl.NumberFormat('en-KE', { 
      style: 'currency', 
      currency: 'KES', 
      maximumFractionDigits: 0 
    }).format(amount);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: THEME.bg }}>
      {/* Header */}
      <header className="sticky top-0 z-10" style={{ backgroundColor: THEME.surface }}>
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm" style={{ color: THEME.textSecondary }}>Dashboard</p>
              <h1 className="text-xl font-bold" style={{ color: THEME.text }}>
                Welcome, {user?.profile?.fullName?.split(' ')[0]}
              </h1>
            </div>
            <button 
              onClick={logout}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: THEME.error }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        
        {/* Quick Stats */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: THEME.text }}>Overview</h2>
          
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="p-4 rounded-lg animate-pulse" style={{ backgroundColor: THEME.surface }}>
                  <div className="h-4 w-20 rounded mb-2" style={{ backgroundColor: THEME.border }}></div>
                  <div className="h-8 w-16 rounded" style={{ backgroundColor: THEME.border }}></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Active Riders', value: stats.activeRiders, color: THEME.primary },
                { label: 'Pending Orders', value: stats.pendingOrders, color: THEME.warning },
                { label: 'Active Shops', value: stats.activeShops, color: THEME.success },
                { label: 'Revenue (MTD)', value: formatKSH(stats.revenue), color: THEME.primary },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-lg" style={{ backgroundColor: THEME.surface }}>
                  <p className="text-sm mb-1" style={{ color: THEME.textSecondary }}>{stat.label}</p>
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Debug Info (Development Only) */}
        {/* {import.meta.env.DEV && debugInfo && (
          <section className="mb-8 p-4 rounded-lg text-xs" style={{ backgroundColor: THEME.bg, border: `1px solid ${THEME.border}` }}>
            <p className="font-semibold mb-2" style={{ color: THEME.text }}>🔍 Debug Info</p>
            <div className="grid grid-cols-2 gap-2" style={{ color: THEME.textSecondary }}>
              {Object.entries(debugInfo).map(([key, value]) => (
                <p key={key}><span className="font-medium">{key}:</span> {Array.isArray(value) ? value.join(', ') : String(value)}</p>
              ))}
            </div>
          </section>
        )} */}

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: THEME.text }}>Quick Actions</h2>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/admin/RiderOnboarding')}
              className="w-full p-4 rounded-lg border text-left transition-colors flex items-center justify-between"
              style={{ borderColor: THEME.border }}
            >
              <div>
                <p className="font-medium" style={{ color: THEME.text }}>🏍️ Add New Rider</p>
                <p className="text-sm mt-0.5" style={{ color: THEME.textSecondary }}>Onboard a new delivery rider</p>
              </div>
              <svg className="w-5 h-5 flex-shrink-0" style={{ color: THEME.textSecondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button 
              onClick={() => navigate('/admin/SystemSettings')}
              className="w-full p-4 rounded-lg border text-left transition-colors flex items-center justify-between"
              style={{ borderColor: THEME.border }}
            >
              <div>
                <p className="font-medium" style={{ color: THEME.text }}>⚙️ System Settings</p>
                <p className="text-sm mt-0.5" style={{ color: THEME.textSecondary }}>Configure Paybill, fares, rules</p>
              </div>
              <svg className="w-5 h-5 flex-shrink-0" style={{ color: THEME.textSecondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button 
              onClick={() => navigate('/admin/OrderOversight')}
              className="w-full p-4 rounded-lg border text-left transition-colors flex items-center justify-between"
              style={{ borderColor: THEME.border }}
            >
              <div>
                <p className="font-medium" style={{ color: THEME.text }}>📊 Live Orders</p>
                <p className="text-sm mt-0.5" style={{ color: THEME.textSecondary }}>Manage live & historical orders</p>
              </div>
              <svg className="w-5 h-5 flex-shrink-0" style={{ color: THEME.textSecondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button 
              onClick={() => navigate('/admin/ShopManagement')}
              className="w-full p-4 rounded-lg border text-left transition-colors flex items-center justify-between"
              style={{ borderColor: THEME.border }}
            >
              <div>
                <p className="font-medium" style={{ color: THEME.text }}>👥 Manage Shops</p>
                <p className="text-sm mt-0.5" style={{ color: THEME.textSecondary }}>View & approve shop partners</p>
              </div>
              <svg className="w-5 h-5 flex-shrink-0" style={{ color: THEME.textSecondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button 
              onClick={() => navigate('/admin/RiderManagement')}
              className="w-full p-4 rounded-lg border text-left transition-colors flex items-center justify-between"
              style={{ borderColor: THEME.border }}
            >
              <div>
                <p className="font-medium" style={{ color: THEME.text }}>👥 Manage Riders</p>
                <p className="text-sm mt-0.5" style={{ color: THEME.textSecondary }}>View & manage delivery riders</p>
              </div>
              <svg className="w-5 h-5 flex-shrink-0" style={{ color: THEME.textSecondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <h2 className="text-lg font-semibold mb-4" style={{ color: THEME.text }}>Recent Activity</h2>
          <div className="rounded-lg" style={{ backgroundColor: THEME.surface }}>
            <div className="p-6 text-center" style={{ color: THEME.textSecondary }}>
              <p className="mb-2">📊 Live order updates appear here</p>
              <p className="text-sm">Go to <button onClick={() => navigate('/admin/OrderOversight')} className="hover:underline" style={{ color: THEME.primary }}>Live Orders</button> to monitor all deliveries</p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}