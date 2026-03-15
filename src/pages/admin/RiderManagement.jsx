import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, 
  doc, getDoc, updateDoc, deleteDoc, serverTimestamp,
  getDocs, addDoc 
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

export default function RiderManagement() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, suspended, salaried, commission
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRider, setSelectedRider] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { rider, action: 'suspend'|'activate'|'delete'|'edit' }
  const [ledgerModal, setLedgerModal] = useState(null); // View salary ledger

  // Load riders + real-time updates
  useEffect(() => {
    const ridersRef = collection(db, 'users');
    const q = query(
      ridersRef, 
      where('role', '==', 'rider'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ridersList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setRiders(ridersList);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Filter riders
  const filteredRiders = riders.filter(rider => {
    // Status filter
    if (filter === 'active' && rider.profile?.status !== 'active') return false;
    if (filter === 'suspended' && rider.profile?.status !== 'suspended') return false;
    if (filter === 'salaried' && rider.profile?.compensation?.model !== 'salary') return false;
    if (filter === 'commission' && rider.profile?.compensation?.model !== 'commission') return false;
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches = 
        rider.profile?.fullName?.toLowerCase().includes(q) ||
        rider.email?.toLowerCase().includes(q) ||
        rider.profile?.phone?.includes(q) ||
        rider.profile?.bikeDescription?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  // Suspend rider
  const suspendRider = async (riderUid, reason) => {
    try {
      await updateDoc(doc(db, 'users', riderUid), {
        'profile.status': 'suspended',
        suspensionReason: reason,
        suspendedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setActionModal(null);
      alert('✅ Rider suspended');
    } catch (err) {
      console.error('Error suspending rider:', err);
      alert('Failed to suspend rider');
    }
  };

  // Activate rider
  const activateRider = async (riderUid) => {
    try {
      await updateDoc(doc(db, 'users', riderUid), {
        'profile.status': 'active',
        reactivatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setActionModal(null);
      alert('✅ Rider reactivated');
    } catch (err) {
      console.error('Error activating rider:', err);
      alert('Failed to activate rider');
    }
  };

  // Delete rider (with confirmation)
  const deleteRider = async (riderUid, riderName) => {
    if (!confirm(`⚠️ Permanently delete rider "${riderName}"?\n\nThis cannot be undone.`)) return;
    
    try {
      // First, cancel any active orders assigned to this rider
      const ordersRef = collection(db, 'orders');
      const activeOrders = await getDocs(query(
        ordersRef,
        where('riderId', '==', riderUid),
        where('status', 'in', ['assigned', 'picked_up', 'arrived'])
      ));
      
      // Reassign or cancel active orders
      for (const orderDoc of activeOrders.docs) {
        await updateDoc(orderDoc.ref, {
          riderId: null,
          status: 'pending',
          reassignedAt: serverTimestamp(),
          notes: `Rider ${riderName} was removed. Order returned to pool.`
        });
      }
      
      // Delete rider document
      await deleteDoc(doc(db, 'users', riderUid));
      
      setActionModal(null);
      alert('✅ Rider deleted successfully');
    } catch (err) {
      console.error('Error deleting rider:', err);
      alert('Failed to delete rider');
    }
  };

  // Update rider info
  const updateRiderInfo = async (riderUid, updates) => {
    try {
      await updateDoc(doc(db, 'users', riderUid), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      setActionModal(null);
      alert('✅ Rider updated successfully');
    } catch (err) {
      console.error('Error updating rider:', err);
      alert('Failed to update rider');
    }
  };

  // Add salary ledger entry (for salaried riders)
  const addLedgerEntry = async (riderUid, entry) => {
    try {
      const riderRef = doc(db, 'users', riderUid);
      const riderDoc = await getDoc(riderRef);
      const currentLedger = riderDoc.data().profile?.compensation?.ledger || [];
      
      await updateDoc(riderRef, {
        'profile.compensation.ledger': [...currentLedger, {
          ...entry,
          id: Date.now().toString(),
          createdAt: serverTimestamp()
        }]
      });
      alert('✅ Ledger entry added');
    } catch (err) {
      console.error('Error adding ledger entry:', err);
      alert('Failed to add ledger entry');
    }
  };

  // Get status badge style
  const getStatusStyle = (status) => {
    const styles = {
      active: { bg: '#D1FAE5', text: '#059669', label: 'Active' },
      suspended: { bg: '#FEE2E2', text: '#DC2626', label: 'Suspended' },
      pending: { bg: '#FEF3C7', text: '#D97706', label: 'Pending' }
    };
    return styles[status] || styles.pending;
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return '—';
    return timestamp.toDate().toLocaleDateString();
  };

  // Format currency
  const formatKSH = (amount) => {
    return new Intl.NumberFormat('en-KE', { 
      style: 'currency', 
      currency: 'KES', 
      maximumFractionDigits: 0 
    }).format(amount);
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
              <h1 className="text-xl font-bold" style={{ color: THEME.text }}>Manage Riders</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/RiderOnboarding')}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: THEME.primary }}
              >
                + Add Rider
              </button>
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
        
        {/* Stats Summary */}
        <section className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-2xl font-bold" style={{ color: THEME.text }}>{riders.length}</p>
              <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Total Riders</p>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-2xl font-bold" style={{ color: THEME.success }}>{riders.filter(r => r.profile?.status === 'active').length}</p>
              <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Active</p>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-2xl font-bold" style={{ color: THEME.primary }}>{riders.filter(r => r.profile?.compensation?.model === 'salary').length}</p>
              <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Salaried</p>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-2xl font-bold" style={{ color: THEME.warning }}>{riders.filter(r => r.profile?.compensation?.model === 'commission').length}</p>
              <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Commission</p>
            </div>
          </div>
        </section>

        {/* Search & Filters */}
        <section className="mb-6">
          <div className="p-4 rounded-lg" style={{ backgroundColor: THEME.surface }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: THEME.textSecondary }}>Search Riders</label>
                <input
                  type="text"
                  placeholder="Name, email, phone, or bike..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: THEME.border, color: THEME.text }}
                />
              </div>
              
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: THEME.textSecondary }}>Filter By</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: THEME.border, color: THEME.text, backgroundColor: THEME.surface }}
                >
                  <option value="all">All Riders</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                  <option value="salaried">Salaried Only</option>
                  <option value="commission">Commission Only</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Riders Table */}
        <section>
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: THEME.surface }}>
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-medium border-b" style={{ borderColor: THEME.border, color: THEME.textSecondary }}>
              <div className="col-span-3">Rider</div>
              <div className="col-span-2">Contact</div>
              <div className="col-span-2">Bike</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Compensation</div>
              <div className="col-span-1">Joined</div>
              <div className="col-span-1">Actions</div>
            </div>

            {/* Riders List */}
            <div className="divide-y" style={{ divideColor: THEME.border }}>
              {filteredRiders.length === 0 ? (
                <div className="px-4 py-12 text-center" style={{ color: THEME.textSecondary }}>
                  {searchQuery ? 'No riders match your search' : 'No riders found'}
                </div>
              ) : (
                filteredRiders.map(rider => {
                  const status = getStatusStyle(rider.profile?.status);
                  const perf = rider.profile?.performance || {};
                  
                  return (
                    <div key={rider.uid} className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm hover:bg-gray-50 transition-colors">
                      {/* Rider Info */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-3">
                          {rider.profile?.profilePhotoUrl ? (
                            <img src={rider.profile.profilePhotoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: THEME.primary }}>
                              {rider.profile?.fullName?.charAt(0) || 'R'}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold" style={{ color: THEME.text }}>{rider.profile?.fullName || 'Unknown'}</p>
                            <p className="text-xs" style={{ color: THEME.textSecondary }}>{perf.jobsCompleted || 0} jobs • ⭐ {perf.averageRating || '—'}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Contact */}
                      <div className="col-span-2">
                        <p className="font-medium" style={{ color: THEME.text }}>{rider.profile?.phone}</p>
                        <p className="text-xs" style={{ color: THEME.textSecondary }}>{rider.email}</p>
                      </div>
                      
                      {/* Bike */}
                      <div className="col-span-2">
                        <p className="text-sm" style={{ color: THEME.text }}>{rider.profile?.bikeDescription || '—'}</p>
                        <p className="text-xs" style={{ color: rider.profile?.gearStatus === 'active' ? THEME.success : THEME.textSecondary }}>
                          {rider.profile?.gearStatus === 'active' ? '✓ Gear Active' : 'Gear Inactive'}
                        </p>
                      </div>
                      
                      {/* Status */}
                      <div className="col-span-1">
                        <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: status.bg, color: status.text }}>
                          {status.label}
                        </span>
                      </div>
                      
                      {/* Compensation */}
                      <div className="col-span-2">
                        <p className="font-medium" style={{ color: THEME.text }}>
                          {rider.profile?.compensation?.model === 'salary' ? 'Salaried' : 'Commission'}
                        </p>
                        <p className="text-xs" style={{ color: THEME.textSecondary }}>
                          {rider.profile?.compensation?.model === 'salary' 
                            ? formatKSH(rider.profile?.compensation?.baseSalary) + '/month'
                            : 'Per delivery'}
                        </p>
                      </div>
                      
                      {/* Joined */}
                      <div className="col-span-1">
                        <p className="text-xs" style={{ color: THEME.textSecondary }}>
                          {formatDate(rider.createdAt)}
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="col-span-1 flex gap-1">
                        <button
                          onClick={() => setSelectedRider(rider)}
                          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                          title="View Details"
                          style={{ color: THEME.textSecondary }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        
                        {rider.profile?.status === 'active' ? (
                          <button
                            onClick={() => setActionModal({ rider, action: 'suspend' })}
                            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                            title="Suspend"
                            style={{ color: THEME.warning }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => setActionModal({ rider, action: 'activate' })}
                            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                            title="Activate"
                            style={{ color: THEME.success }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        
                        <button
                          onClick={() => setActionModal({ rider, action: 'delete' })}
                          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                          title="Delete"
                          style={{ color: THEME.error }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Rider Details Modal */}
      {selectedRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: THEME.surface }}>
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold" style={{ color: THEME.text }}>
                {selectedRider.profile?.fullName || 'Rider Details'}
              </h3>
              <button onClick={() => setSelectedRider(null)} className="p-2 rounded-lg" style={{ color: THEME.textSecondary }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Info */}
              <div>
                <h4 className="font-semibold mb-3" style={{ color: THEME.text }}>Profile</h4>
                <div className="space-y-2 text-sm">
                  <p><span style={{ color: THEME.textSecondary }}>Name:</span> <span style={{ color: THEME.text }}>{selectedRider.profile?.fullName}</span></p>
                  <p><span style={{ color: THEME.textSecondary }}>Email:</span> <span style={{ color: THEME.text }}>{selectedRider.email}</span></p>
                  <p><span style={{ color: THEME.textSecondary }}>Phone:</span> <span style={{ color: THEME.text }}>{selectedRider.profile?.phone}</span></p>
                  <p><span style={{ color: THEME.textSecondary }}>ID Number:</span> <span style={{ color: THEME.text }}>{selectedRider.profile?.idNumber || '—'}</span></p>
                  <p><span style={{ color: THEME.textSecondary }}>KRA PIN:</span> <span style={{ color: THEME.text }}>{selectedRider.profile?.kraPin || '—'}</span></p>
                </div>
              </div>

              {/* Bike & Gear */}
              <div>
                <h4 className="font-semibold mb-3" style={{ color: THEME.text }}>Bike & Gear</h4>
                <div className="space-y-2 text-sm">
                  <p><span style={{ color: THEME.textSecondary }}>Bike:</span> <span style={{ color: THEME.text }}>{selectedRider.profile?.bikeDescription || '—'}</span></p>
                  <p><span style={{ color: THEME.textSecondary }}>Gear Status:</span> <span style={{ color: selectedRider.profile?.gearStatus === 'active' ? THEME.success : THEME.textSecondary }}>{selectedRider.profile?.gearStatus || '—'}</span></p>
                  <p><span style={{ color: THEME.textSecondary }}>Gear Agreement:</span> <span style={{ color: THEME.text }}>{selectedRider.profile?.gearAgreement ? '✓ Signed' : '✗ Not Signed'}</span></p>
                </div>
              </div>

              {/* Compensation */}
              <div className="md:col-span-2">
                <h4 className="font-semibold mb-3" style={{ color: THEME.text }}>Compensation</h4>
                <div className="p-4 rounded-lg" style={{ backgroundColor: THEME.bg }}>
                  <p className="text-sm mb-2" style={{ color: THEME.textSecondary }}>Model</p>
                  <p className="font-medium mb-3" style={{ color: THEME.text }}>
                    {selectedRider.profile?.compensation?.model === 'salary' 
                      ? `Salaried: ${formatKSH(selectedRider.profile?.compensation?.baseSalary)}/month`
                      : 'Commission-based (per delivery)'}
                  </p>
                  
                  {selectedRider.profile?.compensation?.model === 'salary' && (
                    <button
                      onClick={() => setLedgerModal(selectedRider)}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                      style={{ backgroundColor: THEME.primary }}
                    >
                      💰 View Salary Ledger
                    </button>
                  )}
                </div>
              </div>

              {/* Performance */}
              <div className="md:col-span-2">
                <h4 className="font-semibold mb-3" style={{ color: THEME.text }}>Performance</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: THEME.bg }}>
                    <p className="text-xl font-bold" style={{ color: THEME.primary }}>{selectedRider.profile?.performance?.jobsCompleted || 0}</p>
                    <p className="text-xs" style={{ color: THEME.textSecondary }}>Jobs Completed</p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: THEME.bg }}>
                    <p className="text-xl font-bold" style={{ color: THEME.success }}>{selectedRider.profile?.performance?.onTimeRate || 100}%</p>
                    <p className="text-xs" style={{ color: THEME.textSecondary }}>On-Time Rate</p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: THEME.bg }}>
                    <p className="text-xl font-bold" style={{ color: THEME.primary }}>⭐ {selectedRider.profile?.performance?.averageRating || '—'}</p>
                    <p className="text-xs" style={{ color: THEME.textSecondary }}>Avg Rating</p>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="md:col-span-2">
                <h4 className="font-semibold mb-3" style={{ color: THEME.text }}>Verification Documents</h4>
                <div className="grid grid-cols-2 gap-3">
                  {selectedRider.profile?.idPhotoUrl && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: THEME.textSecondary }}>ID Photo</p>
                      <a href={selectedRider.profile.idPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium" style={{ color: THEME.primary }}>View →</a>
                    </div>
                  )}
                  {selectedRider.profile?.kraPhotoUrl && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: THEME.textSecondary }}>KRA Photo</p>
                      <a href={selectedRider.profile.kraPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium" style={{ color: THEME.primary }}>View →</a>
                    </div>
                  )}
                  {selectedRider.profile?.profilePhotoUrl && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: THEME.textSecondary }}>Profile Photo</p>
                      <a href={selectedRider.profile.profilePhotoUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium" style={{ color: THEME.primary }}>View →</a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t" style={{ borderColor: THEME.border }}>
              <button
                onClick={() => { setActionModal({ rider: selectedRider, action: 'edit' }); setSelectedRider(null); }}
                className="flex-1 py-3 rounded-lg font-semibold text-white transition-colors"
                style={{ backgroundColor: THEME.primary }}
              >
                ✏️ Edit Rider Info
              </button>
              {selectedRider.profile?.status === 'active' ? (
                <button
                  onClick={() => { setActionModal({ rider: selectedRider, action: 'suspend' }); setSelectedRider(null); }}
                  className="flex-1 py-3 rounded-lg font-semibold text-white transition-colors"
                  style={{ backgroundColor: THEME.warning }}
                >
                  🚫 Suspend Rider
                </button>
              ) : (
                <button
                  onClick={() => { setActionModal({ rider: selectedRider, action: 'activate' }); setSelectedRider(null); }}
                  className="flex-1 py-3 rounded-lg font-semibold text-white transition-colors"
                  style={{ backgroundColor: THEME.success }}
                >
                  ✅ Activate Rider
                </button>
              )}
              <button
                onClick={() => setSelectedRider(null)}
                className="flex-1 py-3 rounded-lg font-medium border transition-colors"
                style={{ borderColor: THEME.border, color: THEME.text }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: THEME.surface }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: THEME.text }}>
              {actionModal.action === 'suspend' && '🚫 Suspend Rider'}
              {actionModal.action === 'activate' && '✅ Activate Rider'}
              {actionModal.action === 'delete' && '🗑️ Delete Rider'}
              {actionModal.action === 'edit' && '✏️ Edit Rider Info'}
            </h3>
            
            <p className="text-sm mb-4" style={{ color: THEME.textSecondary }}>
              {actionModal.rider.profile?.fullName} ({actionModal.rider.email})
            </p>

            {actionModal.action === 'suspend' && (
              <>
                <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>Reason (Required)</label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg border mb-4"
                  style={{ borderColor: THEME.border, color: THEME.text }}
                  rows="3"
                  placeholder="e.g., Policy violation, inactive, fraud suspected..."
                  id="suspend-reason"
                  required
                />
              </>
            )}

            {actionModal.action === 'edit' && (
              <>
                <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>Phone Number</label>
                <input
                  type="tel"
                  id="edit-phone"
                  defaultValue={actionModal.rider.profile?.phone}
                  className="w-full px-4 py-3 rounded-lg border mb-4"
                  style={{ borderColor: THEME.border, color: THEME.text }}
                />
                <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>Bike Description</label>
                <input
                  type="text"
                  id="edit-bike"
                  defaultValue={actionModal.rider.profile?.bikeDescription}
                  className="w-full px-4 py-3 rounded-lg border mb-4"
                  style={{ borderColor: THEME.border, color: THEME.text }}
                />
              </>
            )}
            
            {actionModal.action === 'delete' && (
              <p className="text-sm mb-4" style={{ color: THEME.error }}>
                ⚠️ This will permanently delete the rider and reassign any active orders. This cannot be undone.
              </p>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 py-3 rounded-lg font-medium border transition-colors"
                style={{ borderColor: THEME.border, color: THEME.text }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (actionModal.action === 'suspend') {
                    const reason = document.getElementById('suspend-reason')?.value || 'Suspended by admin';
                    suspendRider(actionModal.rider.uid, reason);
                  } else if (actionModal.action === 'activate') {
                    activateRider(actionModal.rider.uid);
                  } else if (actionModal.action === 'delete') {
                    deleteRider(actionModal.rider.uid, actionModal.rider.profile?.fullName);
                  } else if (actionModal.action === 'edit') {
                    const phone = document.getElementById('edit-phone')?.value;
                    const bike = document.getElementById('edit-bike')?.value;
                    updateRiderInfo(actionModal.rider.uid, {
                      'profile.phone': phone,
                      'profile.bikeDescription': bike
                    });
                  }
                }}
                className="flex-1 py-3 rounded-lg font-semibold text-white transition-colors"
                style={{ 
                  backgroundColor: actionModal.action === 'delete' ? THEME.error :
                                 actionModal.action === 'suspend' ? THEME.warning :
                                 actionModal.action === 'activate' ? THEME.success : THEME.primary 
                }}
              >
                {actionModal.action === 'suspend' && 'Suspend'}
                {actionModal.action === 'activate' && 'Activate'}
                {actionModal.action === 'delete' && 'Delete Permanently'}
                {actionModal.action === 'edit' && 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Salary Ledger Modal */}
      {ledgerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: THEME.surface }}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold" style={{ color: THEME.text }}>Salary Ledger</h3>
                <p className="text-sm" style={{ color: THEME.textSecondary }}>{ledgerModal.profile?.fullName}</p>
              </div>
              <button onClick={() => setLedgerModal(null)} className="p-2 rounded-lg" style={{ color: THEME.textSecondary }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Add Entry Form */}
            <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: THEME.bg }}>
              <p className="text-sm font-medium mb-3" style={{ color: THEME.text }}>Add Payment Entry</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input type="month" id="ledger-month" className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: THEME.border }} />
                <input type="number" id="ledger-amount" placeholder="Amount (KSH)" className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: THEME.border }} />
              </div>
              <input type="text" id="ledger-notes" placeholder="Notes (optional)" className="w-full px-3 py-2 rounded-lg border text-sm mb-3" style={{ borderColor: THEME.border }} />
              <button
                onClick={() => {
                  const month = document.getElementById('ledger-month').value;
                  const amount = parseFloat(document.getElementById('ledger-amount').value);
                  const notes = document.getElementById('ledger-notes').value;
                  if (month && amount) {
                    addLedgerEntry(ledgerModal.uid, { month, amount, notes, method: 'bank_transfer' });
                    document.getElementById('ledger-month').value = '';
                    document.getElementById('ledger-amount').value = '';
                    document.getElementById('ledger-notes').value = '';
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: THEME.primary }}
              >
                + Add Entry
              </button>
            </div>

            {/* Ledger Entries */}
            <div className="space-y-3">
              {(ledgerModal.profile?.compensation?.ledger || []).length === 0 ? (
                <p className="text-center py-8" style={{ color: THEME.textSecondary }}>No salary entries yet</p>
              ) : (
                (ledgerModal.profile?.compensation?.ledger || []).slice().reverse().map(entry => (
                  <div key={entry.id} className="p-4 rounded-lg flex justify-between items-center" style={{ backgroundColor: THEME.bg }}>
                    <div>
                      <p className="font-medium" style={{ color: THEME.text }}>{entry.month}</p>
                      <p className="text-sm" style={{ color: THEME.textSecondary }}>{entry.notes || 'Salary payment'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" style={{ color: THEME.success }}>{formatKSH(entry.amount)}</p>
                      <p className="text-xs" style={{ color: THEME.textSecondary }}>{entry.method || '—'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}