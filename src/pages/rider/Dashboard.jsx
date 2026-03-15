import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { 
  doc, getDoc, updateDoc, collection, query, 
  where, getDocs, orderBy, limit, onSnapshot, 
  serverTimestamp, startAfter 
} from 'firebase/firestore';

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

// Job Card Component (for active jobs)
function JobCard({ job, onAction, actionLoading }) {
  const getStatusColor = (status) => {
    const colors = {
      assigned: { bg: '#DBEAFE', text: '#2563EB', label: 'Assigned' },
      picked_up: { bg: '#FEF3C7', text: '#D97706', label: 'Picked Up' },
      arrived: { bg: '#FEF3C7', text: '#DC2626', label: 'Arrived' }
    };
    return colors[status] || colors.assigned;
  };

  const status = getStatusColor(job.status);

  return (
    <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: THEME.surface, borderLeft: `4px solid ${THEME.primary}` }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono" style={{ color: THEME.textSecondary }}>#{job.id?.slice(-6)}</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: status.bg, color: status.text }}>{status.label}</span>
          </div>
          <h3 className="font-semibold" style={{ color: THEME.text }}>{job.shopName || 'Delivery'}</h3>
          <p className="text-sm" style={{ color: THEME.textSecondary }}>{job.fare} KSH</p>
        </div>
      </div>

      {/* Route */}
      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: THEME.success }}></div>
          <div className="flex-1">
            <p className="text-xs" style={{ color: THEME.textSecondary }}>Pickup</p>
            <p className="text-sm" style={{ color: THEME.text }}>{job.pickupAddress}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: THEME.error }}></div>
          <div className="flex-1">
            <p className="text-xs" style={{ color: THEME.textSecondary }}>Drop-off</p>
            <p className="text-sm" style={{ color: THEME.text }}>{job.dropoffAddress}</p>
          </div>
        </div>
      </div>

      {/* Recipient */}
      <div className="flex items-center justify-between mb-3 p-2 rounded" style={{ backgroundColor: THEME.bg }}>
        <div>
          <p className="text-sm font-medium" style={{ color: THEME.text }}>{job.clientName}</p>
          <p className="text-xs" style={{ color: THEME.textSecondary }}>{job.clientPhone}</p>
        </div>
        <div className="flex gap-1">
          <a href={`https://wa.me/254${job.clientPhone?.replace(/\D/g, '')}?text=Hi ${job.clientName}, regarding order #${job.id?.slice(-6)}...`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded text-xs font-medium text-white" style={{ backgroundColor: THEME.success }}>WhatsApp</a>
          <a href={`tel:${job.clientPhone}`} className="px-3 py-1.5 rounded text-xs font-medium border" style={{ borderColor: THEME.border, color: THEME.text }}>Call</a>
        </div>
      </div>

      {/* OTP (when arrived) */}
      {job.status === 'arrived' && (
        <div className="mb-3 p-3 rounded" style={{ backgroundColor: THEME.bg }}>
          <p className="text-xs font-medium mb-1" style={{ color: THEME.textSecondary }}>Delivery Code</p>
          <p className="text-2xl font-mono font-bold tracking-wider" style={{ color: THEME.text }}>{job.otp}</p>
        </div>
      )}

      {/* Payment */}
      <div className="mb-3 p-3 rounded" style={{ backgroundColor: THEME.bg }}>
        <p className="text-xs font-medium mb-1" style={{ color: THEME.textSecondary }}>Payment</p>
        <p className="text-lg font-bold" style={{ color: THEME.primary }}>{job.fare} KSH</p>
        <p className="text-xs" style={{ color: THEME.textSecondary }}>Account: {job.id}</p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {job.status === 'assigned' && (
          <button onClick={() => onAction(job.id, 'picked_up')} disabled={actionLoading} className="w-full py-2.5 rounded-lg font-semibold text-white transition-colors disabled:opacity-50" style={{ backgroundColor: THEME.primary }}>
            {actionLoading === job.id ? 'Updating...' : '✓ Mark as Picked Up'}
          </button>
        )}
        
        {job.status === 'picked_up' && (
          <>
            <button onClick={() => onAction(job.id, 'notify')} className="w-full py-2.5 rounded-lg font-semibold text-white transition-colors" style={{ backgroundColor: THEME.primary }}>
              📱 Notify Client
            </button>
            <button onClick={() => onAction(job.id, 'verify_otp')} disabled={actionLoading} className="w-full py-2.5 rounded-lg font-semibold text-white transition-colors disabled:opacity-50" style={{ backgroundColor: THEME.primaryDark }}>
              {actionLoading === job.id ? 'Verifying...' : '🔐 Verify OTP'}
            </button>
          </>
        )}

        {job.status === 'arrived' && (
          <button onClick={() => onAction(job.id, 'complete')} disabled={actionLoading} className="w-full py-2.5 rounded-lg font-semibold text-white transition-colors disabled:opacity-50" style={{ backgroundColor: THEME.success }}>
            {actionLoading === job.id ? 'Completing...' : '✓ Complete Delivery'}
          </button>
        )}
      </div>
    </div>
  );
}

// History Job Card Component (compact)
function HistoryJobCard({ job, onViewDetails }) {
  const isComplete = job.status === 'complete';
  const isCancelled = job.status === 'cancelled';
  
  return (
    <div className="py-4 first:pt-0 last:pb-0 border-b last:border-b-0" style={{ borderColor: THEME.border }}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono" style={{ color: THEME.textSecondary }}>#{job.id?.slice(-6)}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              isComplete ? 'bg-green-100 text-green-700' : 
              isCancelled ? 'bg-red-100 text-red-700' : 
              'bg-gray-100 text-gray-700'
            }`}>
              {isComplete ? '✓ Delivered' : isCancelled ? '✗ Cancelled' : job.status}
            </span>
          </div>
          <p className="font-medium" style={{ color: THEME.text }}>{job.shopName || 'Delivery'}</p>
          <p className="text-sm" style={{ color: THEME.textSecondary }}>{job.dropoffAddress}</p>
        </div>
        <div className="text-right">
          <p className={`font-bold ${isComplete ? 'text-green-600' : isCancelled ? 'text-red-600' : 'text-gray-600'}`}>
            {isComplete ? `+${job.fare} KSH` : isCancelled ? 'Cancelled' : `${job.fare} KSH`}
          </p>
          <p className="text-xs" style={{ color: THEME.textSecondary }}>
            {job.createdAt?.toDate?.().toLocaleDateString() || '—'}
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onViewDetails(job.id)}
          className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
          style={{ borderColor: THEME.border, color: THEME.text }}
        >
          View Details
        </button>
        {isComplete && job.paymentStatus !== 'verified' && (
          <button
            onClick={() => alert('Contact support if payment not received')}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: THEME.warning }}
          >
            Report Issue
          </button>
        )}
      </div>
    </div>
  );
}

export default function RiderDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [activeTab, setActiveTab] = useState('available');
  const [availableJobs, setAvailableJobs] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [historyJobs, setHistoryJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [status, setStatus] = useState('available');
  const [actionLoading, setActionLoading] = useState(null);
  
  // Pagination state for history
  const [lastHistoryVisible, setLastHistoryVisible] = useState(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  // Load rider data + real-time job updates
  useEffect(() => {
    if (!user?.uid) return;
    
    loadRiderData();
    
    // Real-time listener for ALL active jobs
    if (activeTab === 'active') {
      const unsubscribe = onSnapshot(
        query(
          collection(db, 'orders'), 
          where('riderId', '==', user.uid), 
          where('status', 'in', ['assigned', 'picked_up', 'arrived']),
          orderBy('createdAt', 'asc')
        ),
        (snapshot) => {
          const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const priority = { arrived: 1, picked_up: 2, assigned: 3 };
          jobs.sort((a, b) => priority[a.status] - priority[b.status]);
          setActiveJobs(jobs);
        }
      );
      return () => unsubscribe();
    }
    
    // Real-time listener for available jobs
    if (activeTab === 'available') {
      const unsubscribe = onSnapshot(
        query(
          collection(db, 'orders'), 
          where('status', '==', 'pending'), 
          orderBy('createdAt', 'desc'), 
          limit(20)
        ),
        (snapshot) => {
          const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAvailableJobs(jobs);
        }
      );
      return () => unsubscribe();
    }
    
    // Load history when tab is active
    if (activeTab === 'history' && historyJobs.length === 0) {
      loadHistory(true);
    }
  }, [user, activeTab]);

  const loadRiderData = async () => {
    try {
      const riderDoc = await getDoc(doc(db, 'users', user.uid));
      if (riderDoc.exists()) {
        setStatus(riderDoc.data().profile?.status || 'available');
      }
    } catch (err) {
      console.error('Error loading rider data:', err);
    }
  };

  const toggleStatus = async () => {
    const newStatus = status === 'available' ? 'offline' : 'available';
    try {
      await updateDoc(doc(db, 'users', user.uid), { 'profile.status': newStatus });
      setStatus(newStatus);
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Accept a job
  const acceptJob = async (orderId) => {
    setActionLoading(orderId);
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('id', '==', orderId));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        alert('Order not found');
        return;
      }
      
      const orderRef = snapshot.docs[0].ref;
      await updateDoc(orderRef, {
        riderId: user.uid,
        status: 'assigned',
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      alert('✅ Job accepted! You can accept more jobs or switch to Active tab.');
      
      const snap = await getDocs(query(collection(db, 'orders'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'), limit(20)));
      setAvailableJobs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
    } catch (err) {
      console.error('Error accepting job:', err);
      if (err.code === 'permission-denied') {
        alert('This order was just taken by another rider');
      } else {
        alert('Failed to accept job. Please try again.');
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Handle all job actions
  const handleJobAction = async (jobId, action) => {
    setActionLoading(jobId);
    
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('id', '==', jobId));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        alert('Order not found');
        return;
      }
      
      const orderRef = snapshot.docs[0].ref;
      const job = snapshot.docs[0].data();

      if (action === 'picked_up') {
        await updateDoc(orderRef, {
          status: 'picked_up',
          pickedUpAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      else if (action === 'notify') {
        const message = `Hi ${job.clientName}, I'm arriving in about 5 minutes with your order #${job.id?.slice(-6)}. Please have payment ready.`;
        const clean = job.clientPhone?.replace(/\D/g, '');
        window.open(`https://wa.me/254${clean}?text=${encodeURIComponent(message)}`, '_blank');
      }
      
      else if (action === 'verify_otp') {
        const otp = prompt(`Enter the 4-digit code from ${job.clientName}:`);
        if (!otp) {
          setActionLoading(null);
          return;
        }
        if (otp !== job.otp) {
          alert('❌ Incorrect code. Please verify with client.');
          setActionLoading(null);
          return;
        }
        await updateDoc(orderRef, {
          status: 'arrived',
          arrivedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      else if (action === 'complete') {
        const confirmed = confirm('Has the client shown you the M-Pesa payment confirmation SMS?');
        if (!confirmed) {
          setActionLoading(null);
          return;
        }
        
        await updateDoc(orderRef, {
          status: 'complete',
          completedAt: serverTimestamp(),
          paymentVerified: true,
          updatedAt: serverTimestamp()
        });
        
        const riderRef = doc(db, 'users', user.uid);
        const riderDoc = await getDoc(riderRef);
        const perf = riderDoc.data().profile?.performance || {};
        
        await updateDoc(riderRef, {
          'profile.performance.jobsCompleted': (perf.jobsCompleted || 0) + 1,
          'profile.status': 'available',
          updatedAt: serverTimestamp()
        });
        
        alert('🎉 Delivery complete! Great job.');
        
        const snap = await getDocs(query(collection(db, 'orders'), where('riderId', '==', user.uid), where('status', 'in', ['assigned', 'picked_up', 'arrived']), orderBy('createdAt', 'asc')));
        setActiveJobs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
      
    } catch (err) {
      console.error('Error in job action:', err);
      alert('Failed to update. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // Load history with pagination
  const loadHistory = async (reset = false) => {
    if (!user?.uid) return;
    
    setHistoryLoading(true);
    try {
      const ordersRef = collection(db, 'orders');
      
      let q = query(
        ordersRef,
        where('riderId', '==', user.uid),
        where('status', 'in', ['complete', 'cancelled']),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      if (!reset && lastHistoryVisible) {
        q = query(q, startAfter(lastHistoryVisible));
      }
      
      const snapshot = await getDocs(q);
      const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (reset) {
        setHistoryJobs(jobs);
      } else {
        setHistoryJobs(prev => [...prev, ...jobs]);
      }
      
      setLastHistoryVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMoreHistory(snapshot.docs.length === 10);
      
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Format currency
  const formatKSH = (amount) => {
    return new Intl.NumberFormat('en-KE', { 
      style: 'currency', 
      currency: 'KES', 
      maximumFractionDigits: 0 
    }).format(amount);
  };

  // Calculate total earnings for active jobs
  const totalEarnings = activeJobs.reduce((sum, job) => sum + (job.fare || 0), 0);
  
  // Calculate monthly earnings from history
  const monthlyEarnings = historyJobs
    .filter(j => {
      const date = j.createdAt?.toDate?.();
      return date?.getMonth() === new Date().getMonth() && 
             j.paymentStatus === 'verified' &&
             j.status === 'complete';
    })
    .reduce((sum, j) => sum + (j.fare || 0), 0);

  const getWhatsAppLink = (phone, message) => {
    const clean = phone?.replace(/\D/g, '');
    return `https://wa.me/254${clean}?text=${encodeURIComponent(message)}`;
  };

  // Offline state
  if (status === 'offline') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: THEME.bg }}>
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: THEME.surface }}>
            <svg className="w-10 h-10" style={{ color: THEME.textSecondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: THEME.text }}>You're Offline</h2>
          <p className="mb-6" style={{ color: THEME.textSecondary }}>Go online to start receiving orders</p>
          <button onClick={toggleStatus} className="w-full py-3 rounded-lg font-semibold text-white transition-colors" style={{ backgroundColor: THEME.primary }}>Go Online</button>
        </div>
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
              <p className="text-sm" style={{ color: THEME.textSecondary }}>Rider Dashboard</p>
              <h1 className="text-xl font-bold" style={{ color: THEME.text }}>{user?.profile?.fullName?.split(' ')[0]}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={toggleStatus} className="px-4 py-2 rounded-full text-sm font-medium transition-colors" style={{ backgroundColor: status === 'available' ? THEME.primary : THEME.border, color: status === 'available' ? '#fff' : THEME.text }}>
                {status === 'available' ? 'Available' : 'Offline'}
              </button>
              <button onClick={logout} className="p-2 rounded-lg" style={{ color: THEME.textSecondary }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="border-t" style={{ borderColor: THEME.border }}>
          <div className="max-w-3xl mx-auto px-4">
            <nav className="flex gap-6 overflow-x-auto">
              {[
                { id: 'available', label: 'Available' },
                { id: 'active', label: `Active (${activeJobs.length})` },
                { id: 'history', label: '📜 History' },
                { id: 'profile', label: 'Profile' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap" style={{ color: activeTab === tab.id ? THEME.primary : THEME.textSecondary, borderColor: activeTab === tab.id ? THEME.primary : 'transparent' }}>
                  {tab.label}
                  {tab.id === 'available' && availableJobs.length > 0 && <span className="ml-2 px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: THEME.primary, color: '#fff' }}>{availableJobs.length}</span>}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        
        {/* Available Jobs */}
        {activeTab === 'available' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold" style={{ color: THEME.text }}>Available Jobs</h2>
              <button onClick={() => {}} className="text-sm font-medium" style={{ color: THEME.primary }}>Refresh</button>
            </div>

            {loading && availableJobs.length === 0 ? (
              <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent mx-auto" style={{ borderColor: THEME.primary }}></div></div>
            ) : availableJobs.length === 0 ? (
              <div className="text-center py-12 rounded-lg" style={{ backgroundColor: THEME.surface }}>
                <p className="text-base mb-1" style={{ color: THEME.text }}>No orders available</p>
                <p className="text-sm" style={{ color: THEME.textSecondary }}>Stay online to receive notifications</p>
              </div>
            ) : (
              <div className="space-y-0 divide-y" style={{ divideColor: THEME.border }}>
                {availableJobs.map(job => (
                  <div key={job.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono" style={{ color: THEME.textSecondary }}>#{job.id?.slice(-6)}</span>
                          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: THEME.primary, color: '#fff' }}>{job.distance || '~2km'}</span>
                        </div>
                        <h3 className="font-semibold" style={{ color: THEME.text }}>{job.shopName || 'Delivery'}</h3>
                        <p className="text-sm" style={{ color: THEME.textSecondary }}>{job.pickupAddress}</p>
                      </div>
                      <span className="text-lg font-bold" style={{ color: THEME.primary }}>{job.fare} KSH</span>
                    </div>
                    <div className="space-y-1 mb-3">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: THEME.success }}></div>
                        <p className="text-sm" style={{ color: THEME.text }}>{job.dropoffAddress}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a href={getWhatsAppLink(job.clientPhone, `Hi ${job.clientName}, I'm your Sirnawa rider for order #${job.id?.slice(-6)}.`)} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 rounded-lg text-sm font-medium text-center border transition-colors" style={{ borderColor: THEME.border, color: THEME.text }}>Contact</a>
                      <button onClick={() => acceptJob(job.id)} disabled={actionLoading === job.id} className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50" style={{ backgroundColor: THEME.primary }}>
                        {actionLoading === job.id ? 'Accepting...' : 'Accept'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active Jobs - MULTI-JOB SUPPORT */}
        {activeTab === 'active' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold" style={{ color: THEME.text }}>Active Deliveries</h2>
              <div className="px-3 py-1 rounded-lg text-sm font-bold" style={{ backgroundColor: THEME.primary, color: '#fff' }}>
                {activeJobs.length} jobs • {formatKSH(totalEarnings)}
              </div>
            </div>

            {activeJobs.length === 0 ? (
              <div className="text-center py-12 rounded-lg" style={{ backgroundColor: THEME.surface }}>
                <p className="text-lg font-medium mb-1" style={{ color: THEME.text }}>No active jobs</p>
                <p className="text-sm mb-6" style={{ color: THEME.textSecondary }}>Accept a job to get started</p>
                <button onClick={() => setActiveTab('available')} className="px-6 py-3 rounded-lg font-semibold text-white" style={{ backgroundColor: THEME.primary }}>View Available Jobs</button>
              </div>
            ) : (
              <div>
                {/* Priority notice */}
                {activeJobs.some(j => j.status === 'arrived') && (
                  <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#FEF3C7', border: `1px solid ${THEME.warning}` }}>
                    <p className="text-sm font-medium" style={{ color: THEME.warning }}>⚠️ You have deliveries marked as "Arrived" - complete these first!</p>
                  </div>
                )}
                
                {/* Job Cards */}
                {activeJobs.map(job => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    onAction={handleJobAction}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ✅ HISTORY TAB - NEW */}
        {activeTab === 'history' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold" style={{ color: THEME.text }}>Delivery History</h2>
              <div className="text-sm" style={{ color: THEME.textSecondary }}>
                {historyJobs.length} deliveries
              </div>
            </div>

            {/* Earnings Summary */}
            {historyJobs.length > 0 && (
              <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: THEME.surface }}>
                <p className="text-sm font-medium mb-2" style={{ color: THEME.textSecondary }}>This Month's Earnings</p>
                <p className="text-2xl font-bold" style={{ color: THEME.primary }}>
                  {formatKSH(monthlyEarnings)}
                </p>
                <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>
                  From {historyJobs.filter(j => j.paymentStatus === 'verified' && j.status === 'complete').length} completed deliveries
                </p>
              </div>
            )}

            {/* History List */}
            {historyLoading && historyJobs.length === 0 ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent mx-auto" style={{ borderColor: THEME.primary }}></div>
              </div>
            ) : historyJobs.length === 0 ? (
              <div className="text-center py-12 rounded-lg" style={{ backgroundColor: THEME.surface }}>
                <p className="text-base mb-1" style={{ color: THEME.text }}>No completed deliveries yet</p>
                <p className="text-sm" style={{ color: THEME.textSecondary }}>Your delivery history will appear here</p>
              </div>
            ) : (
              <>
                <div className="rounded-lg overflow-hidden" style={{ backgroundColor: THEME.surface }}>
                  {historyJobs.map(job => (
                    <HistoryJobCard 
                      key={job.id} 
                      job={job} 
                      onViewDetails={(id) => navigate(`/shop/order/${id}`)}
                    />
                  ))}
                </div>
                
                {/* Load More */}
                {hasMoreHistory && (
                  <div className="text-center py-4">
                    <button
                      onClick={() => loadHistory(false)}
                      disabled={historyLoading}
                      className="px-6 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50"
                      style={{ borderColor: THEME.border, color: THEME.text }}
                    >
                      {historyLoading ? 'Loading...' : 'Load More History'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Profile */}
        {activeTab === 'profile' && (
          <div>
            <div className="flex items-center gap-4 mb-8 pb-6 border-b" style={{ borderColor: THEME.border }}>
              {user?.profile?.profilePhotoUrl ? (
                <img src={user.profile.profilePhotoUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: THEME.primary }}>
                  {user?.profile?.fullName?.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold" style={{ color: THEME.text }}>{user?.profile?.fullName}</h2>
                <p className="text-sm" style={{ color: THEME.textSecondary }}>{user?.profile?.phone}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-wide mb-2 font-medium" style={{ color: THEME.textSecondary }}>Assigned Bike</p>
                <p className="text-base" style={{ color: THEME.text }}>{user?.profile?.bikeDescription}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide mb-2 font-medium" style={{ color: THEME.textSecondary }}>Compensation</p>
                <p className="text-base font-semibold" style={{ color: THEME.text }}>
                  {user?.profile?.compensation?.model === 'salary' ? `${user?.profile?.compensation?.baseSalary?.toLocaleString()} KSH/month` : 'Commission-based'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide mb-4 font-medium" style={{ color: THEME.textSecondary }}>Performance</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center py-4 rounded-lg" style={{ backgroundColor: THEME.surface }}>
                    <p className="text-2xl font-bold" style={{ color: THEME.primary }}>{user?.profile?.performance?.jobsCompleted || 0}</p>
                    <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Jobs</p>
                  </div>
                  <div className="text-center py-4 rounded-lg" style={{ backgroundColor: THEME.surface }}>
                    <p className="text-2xl font-bold" style={{ color: THEME.success }}>{user?.profile?.performance?.onTimeRate || 100}%</p>
                    <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>On-Time</p>
                  </div>
                  <div className="text-center py-4 rounded-lg" style={{ backgroundColor: THEME.surface }}>
                    <p className="text-2xl font-bold" style={{ color: THEME.primary }}>{user?.profile?.performance?.averageRating || '-'}</p>
                    <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Rating</p>
                  </div>
                </div>
              </div>
              <button onClick={logout} className="w-full py-4 rounded-lg font-semibold text-white mt-8" style={{ backgroundColor: THEME.error }}>Logout</button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}