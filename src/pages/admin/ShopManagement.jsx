import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, 
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

export default function ShopManagement() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, active, suspended
  const [selectedShop, setSelectedShop] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { shop, action: 'approve'|'suspend'|'activate' }

  // Load shops + real-time updates
  useEffect(() => {
    const shopsRef = collection(db, 'users');
    const q = query(
      shopsRef, 
      where('role', '==', 'shop'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const shopsList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setShops(shopsList);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Filter shops by status
  const filteredShops = shops.filter(shop => {
    if (filter === 'all') return true;
    if (filter === 'pending') return shop.profile?.status === 'pending';
    if (filter === 'active') return shop.profile?.status === 'active';
    if (filter === 'suspended') return shop.profile?.status === 'suspended';
    return true;
  });

  // Approve shop registration
  const approveShop = async (shopUid) => {
    try {
      await updateDoc(doc(db, 'users', shopUid), {
        'profile.status': 'active',
        approvedAt: serverTimestamp(),
        approvedBy: 'super_admin',
        updatedAt: serverTimestamp()
      });
      setActionModal(null);
      alert('✅ Shop approved successfully');
    } catch (err) {
      console.error('Error approving shop:', err);
      alert('Failed to approve shop');
    }
  };

  // Suspend shop
  const suspendShop = async (shopUid, reason) => {
    try {
      await updateDoc(doc(db, 'users', shopUid), {
        'profile.status': 'suspended',
        suspensionReason: reason,
        suspendedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setActionModal(null);
      alert('✅ Shop suspended');
    } catch (err) {
      console.error('Error suspending shop:', err);
      alert('Failed to suspend shop');
    }
  };

  // Activate suspended shop
  const activateShop = async (shopUid) => {
    try {
      await updateDoc(doc(db, 'users', shopUid), {
        'profile.status': 'active',
        reactivatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setActionModal(null);
      alert('✅ Shop reactivated');
    } catch (err) {
      console.error('Error activating shop:', err);
      alert('Failed to activate shop');
    }
  };

  // Get status badge style
  const getStatusStyle = (status) => {
    const styles = {
      pending: { bg: '#FEF3C7', text: '#D97706', label: 'Pending Approval' },
      active: { bg: '#D1FAE5', text: '#059669', label: 'Active' },
      suspended: { bg: '#FEE2E2', text: '#DC2626', label: 'Suspended' },
      rejected: { bg: '#F3F4F6', text: '#6B7280', label: 'Rejected' }
    };
    return styles[status] || styles.pending;
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return '—';
    return timestamp.toDate().toLocaleDateString();
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
              <h1 className="text-xl font-bold" style={{ color: THEME.text }}>Manage Shops</h1>
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
        
        {/* Stats Summary */}
        <section className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-2xl font-bold" style={{ color: THEME.text }}>{shops.length}</p>
              <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Total Shops</p>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-2xl font-bold" style={{ color: THEME.warning }}>{shops.filter(s => s.profile?.status === 'pending').length}</p>
              <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Pending Approval</p>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-2xl font-bold" style={{ color: THEME.success }}>{shops.filter(s => s.profile?.status === 'active').length}</p>
              <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Active</p>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: THEME.surface }}>
              <p className="text-2xl font-bold" style={{ color: THEME.error }}>{shops.filter(s => s.profile?.status === 'suspended').length}</p>
              <p className="text-xs mt-1" style={{ color: THEME.textSecondary }}>Suspended</p>
            </div>
          </div>
        </section>

        {/* Filter Tabs */}
        <section className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { id: 'all', label: 'All Shops' },
              { id: 'pending', label: '⏳ Pending' },
              { id: 'active', label: '✅ Active' },
              { id: 'suspended', label: '🚫 Suspended' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === tab.id 
                    ? 'text-white' 
                    : 'border'
                }`}
                style={{
                  backgroundColor: filter === tab.id ? THEME.primary : THEME.surface,
                  borderColor: THEME.border,
                  color: filter === tab.id ? '#fff' : THEME.text
                }}
              >
                {tab.label}
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs" style={{
                  backgroundColor: filter === tab.id ? 'rgba(255,255,255,0.2)' : THEME.bg,
                  color: filter === tab.id ? '#fff' : THEME.textSecondary
                }}>
                  {tab.id === 'all' ? shops.length : shops.filter(s => {
                    if (tab.id === 'pending') return s.profile?.status === 'pending';
                    if (tab.id === 'active') return s.profile?.status === 'active';
                    if (tab.id === 'suspended') return s.profile?.status === 'suspended';
                    return true;
                  }).length}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Shops Table */}
        <section>
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: THEME.surface }}>
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-medium border-b" style={{ borderColor: THEME.border, color: THEME.textSecondary }}>
              <div className="col-span-3">Shop</div>
              <div className="col-span-2">Contact</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Joined</div>
              <div className="col-span-1">Orders</div>
              <div className="col-span-1">Actions</div>
            </div>

            {/* Shops List */}
            <div className="divide-y" style={{ divideColor: THEME.border }}>
              {filteredShops.length === 0 ? (
                <div className="px-4 py-12 text-center" style={{ color: THEME.textSecondary }}>
                  {filter === 'pending' ? 'No pending shop approvals' : 'No shops found'}
                </div>
              ) : (
                filteredShops.map(shop => {
                  const status = getStatusStyle(shop.profile?.status);
                  const orderCount = shop.stats?.totalOrders || 0;
                  
                  return (
                    <div key={shop.uid} className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm hover:bg-gray-50 transition-colors">
                      {/* Shop Info */}
                      <div className="col-span-3">
                        <p className="font-semibold" style={{ color: THEME.text }}>{shop.profile?.businessName || 'Unknown Shop'}</p>
                        <p className="text-xs" style={{ color: THEME.textSecondary }}>{shop.email}</p>
                        {shop.profile?.status === 'pending' && (
                          <p className="text-xs mt-1" style={{ color: THEME.warning }}>⏳ Awaiting approval</p>
                        )}
                      </div>
                      
                      {/* Contact */}
                      <div className="col-span-2">
                        <p className="font-medium" style={{ color: THEME.text }}>{shop.profile?.phone}</p>
                        <p className="text-xs" style={{ color: THEME.textSecondary }}>{shop.profile?.contactPerson}</p>
                      </div>
                      
                      {/* Location */}
                      <div className="col-span-2">
                        <p className="text-sm" style={{ color: THEME.text }}>{shop.profile?.address?.city || '—'}</p>
                        <p className="text-xs" style={{ color: THEME.textSecondary }}>{shop.profile?.address?.area || ''}</p>
                      </div>
                      
                      {/* Status */}
                      <div className="col-span-1">
                        <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: status.bg, color: status.text }}>
                          {status.label}
                        </span>
                      </div>
                      
                      {/* Joined */}
                      <div className="col-span-2">
                        <p className="text-xs" style={{ color: THEME.textSecondary }}>
                          {formatDate(shop.createdAt)}
                        </p>
                        {shop.approvedAt && (
                          <p className="text-xs" style={{ color: THEME.success }}>
                            Approved: {formatDate(shop.approvedAt)}
                          </p>
                        )}
                      </div>
                      
                      {/* Orders */}
                      <div className="col-span-1">
                        <p className="font-semibold" style={{ color: THEME.primary }}>{orderCount}</p>
                        <p className="text-xs" style={{ color: THEME.textSecondary }}>orders</p>
                      </div>
                      
                      {/* Actions */}
                      <div className="col-span-1 flex gap-1">
                        <button
                          onClick={() => setSelectedShop(shop)}
                          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                          title="View Details"
                          style={{ color: THEME.textSecondary }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        
                        {shop.profile?.status === 'pending' && (
                          <button
                            onClick={() => setActionModal({ shop, action: 'approve' })}
                            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                            title="Approve"
                            style={{ color: THEME.success }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        
                        {shop.profile?.status === 'active' && (
                          <button
                            onClick={() => setActionModal({ shop, action: 'suspend' })}
                            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                            title="Suspend"
                            style={{ color: THEME.warning }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        )}
                        
                        {shop.profile?.status === 'suspended' && (
                          <button
                            onClick={() => setActionModal({ shop, action: 'activate' })}
                            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                            title="Activate"
                            style={{ color: THEME.success }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
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

      {/* Shop Details Modal */}
      {selectedShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: THEME.surface }}>
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold" style={{ color: THEME.text }}>
                {selectedShop.profile?.businessName || 'Shop Details'}
              </h3>
              <button onClick={() => setSelectedShop(null)} className="p-2 rounded-lg" style={{ color: THEME.textSecondary }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Info */}
              <div>
                <h4 className="font-semibold mb-3" style={{ color: THEME.text }}>Business Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span style={{ color: THEME.textSecondary }}>Name:</span> <span style={{ color: THEME.text }}>{selectedShop.profile?.businessName}</span></p>
                  <p><span style={{ color: THEME.textSecondary }}>Category:</span> <span style={{ color: THEME.text }}>{selectedShop.profile?.category || '—'}</span></p>
                  <p><span style={{ color: THEME.textSecondary }}>KRA PIN:</span> <span style={{ color: THEME.text }}>{selectedShop.profile?.kraPin || '—'}</span></p>
                  <p><span style={{ color: THEME.textSecondary }}>Business Permit:</span> <span style={{ color: THEME.text }}>{selectedShop.profile?.permitNumber || '—'}</span></p>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="font-semibold mb-3" style={{ color: THEME.text }}>Contact Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span style={{ color: THEME.textSecondary }}>Email:</span> <span style={{ color: THEME.text }}>{selectedShop.email}</span></p>
                  <p><span style={{ color: THEME.textSecondary }}>Phone:</span> <span style={{ color: THEME.text }}>{selectedShop.profile?.phone}</span></p>
                  <p><span style={{ color: THEME.textSecondary }}>Contact Person:</span> <span style={{ color: THEME.text }}>{selectedShop.profile?.contactPerson}</span></p>
                  <p><span style={{ color: THEME.textSecondary }}>Alt Phone:</span> <span style={{ color: THEME.text }}>{selectedShop.profile?.altPhone || '—'}</span></p>
                </div>
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <h4 className="font-semibold mb-3" style={{ color: THEME.text }}>Address</h4>
                <div className="space-y-1 text-sm" style={{ color: THEME.text }}>
                  <p>{selectedShop.profile?.address?.street}</p>
                  <p>{selectedShop.profile?.address?.area}, {selectedShop.profile?.address?.city}</p>
                  <p>{selectedShop.profile?.address?.country || 'Kenya'}</p>
                </div>
              </div>

              {/* Documents */}
              <div className="md:col-span-2">
                <h4 className="font-semibold mb-3" style={{ color: THEME.text }}>Verification Documents</h4>
                <div className="grid grid-cols-2 gap-3">
                  {selectedShop.profile?.businessLicenseUrl && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: THEME.textSecondary }}>Business License</p>
                      <a href={selectedShop.profile.businessLicenseUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium" style={{ color: THEME.primary }}>View Document →</a>
                    </div>
                  )}
                  {selectedShop.profile?.kraCertUrl && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: THEME.textSecondary }}>KRA Certificate</p>
                      <a href={selectedShop.profile.kraCertUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium" style={{ color: THEME.primary }}>View Document →</a>
                    </div>
                  )}
                  {selectedShop.profile?.permitUrl && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: THEME.textSecondary }}>Business Permit</p>
                      <a href={selectedShop.profile.permitUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium" style={{ color: THEME.primary }}>View Document →</a>
                    </div>
                  )}
                  {!selectedShop.profile?.businessLicenseUrl && !selectedShop.profile?.kraCertUrl && !selectedShop.profile?.permitUrl && (
                    <p className="text-sm" style={{ color: THEME.textSecondary }}>No documents uploaded</p>
                  )}
                </div>
              </div>

              {/* Performance Stats */}
              <div className="md:col-span-2">
                <h4 className="font-semibold mb-3" style={{ color: THEME.text }}>Performance</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: THEME.bg }}>
                    <p className="text-xl font-bold" style={{ color: THEME.primary }}>{selectedShop.stats?.totalOrders || 0}</p>
                    <p className="text-xs" style={{ color: THEME.textSecondary }}>Total Orders</p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: THEME.bg }}>
                    <p className="text-xl font-bold" style={{ color: THEME.success }}>{selectedShop.stats?.completedOrders || 0}</p>
                    <p className="text-xs" style={{ color: THEME.textSecondary }}>Completed</p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: THEME.bg }}>
                    <p className="text-xl font-bold" style={{ color: THEME.primary }}>{selectedShop.stats?.rating?.toFixed(1) || '—'}/5</p>
                    <p className="text-xs" style={{ color: THEME.textSecondary }}>Avg Rating</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t" style={{ borderColor: THEME.border }}>
              {selectedShop.profile?.status === 'pending' && (
                <button
                  onClick={() => { setActionModal({ shop: selectedShop, action: 'approve' }); setSelectedShop(null); }}
                  className="flex-1 py-3 rounded-lg font-semibold text-white transition-colors"
                  style={{ backgroundColor: THEME.success }}
                >
                  ✅ Approve Shop
                </button>
              )}
              {selectedShop.profile?.status === 'active' && (
                <button
                  onClick={() => { setActionModal({ shop: selectedShop, action: 'suspend' }); setSelectedShop(null); }}
                  className="flex-1 py-3 rounded-lg font-semibold text-white transition-colors"
                  style={{ backgroundColor: THEME.warning }}
                >
                  🚫 Suspend Shop
                </button>
              )}
              {selectedShop.profile?.status === 'suspended' && (
                <button
                  onClick={() => { setActionModal({ shop: selectedShop, action: 'activate' }); setSelectedShop(null); }}
                  className="flex-1 py-3 rounded-lg font-semibold text-white transition-colors"
                  style={{ backgroundColor: THEME.success }}
                >
                  ✅ Reactivate Shop
                </button>
              )}
              <button
                onClick={() => setSelectedShop(null)}
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
              {actionModal.action === 'approve' && '✅ Approve Shop'}
              {actionModal.action === 'suspend' && '🚫 Suspend Shop'}
              {actionModal.action === 'activate' && '✅ Reactivate Shop'}
            </h3>
            
            <p className="text-sm mb-4" style={{ color: THEME.textSecondary }}>
              {actionModal.shop.profile?.businessName} ({actionModal.shop.email})
            </p>

            {actionModal.action === 'suspend' && (
              <>
                <label className="block text-sm font-medium mb-2" style={{ color: THEME.text }}>Reason (Required)</label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg border mb-4"
                  style={{ borderColor: THEME.border, color: THEME.text }}
                  rows="3"
                  placeholder="e.g., Policy violation, fraud suspected, inactive..."
                  id="suspend-reason"
                  required
                />
              </>
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
                  if (actionModal.action === 'approve') {
                    approveShop(actionModal.shop.uid);
                  } else if (actionModal.action === 'suspend') {
                    const reason = document.getElementById('suspend-reason')?.value || 'Suspended by admin';
                    suspendShop(actionModal.shop.uid, reason);
                  } else if (actionModal.action === 'activate') {
                    activateShop(actionModal.shop.uid);
                  }
                }}
                className="flex-1 py-3 rounded-lg font-semibold text-white transition-colors"
                style={{ 
                  backgroundColor: actionModal.action === 'suspend' ? THEME.error : 
                                 actionModal.action === 'activate' ? THEME.success : THEME.primary 
                }}
              >
                {actionModal.action === 'approve' && 'Approve'}
                {actionModal.action === 'suspend' && 'Suspend'}
                {actionModal.action === 'activate' && 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}