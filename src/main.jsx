import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/admin/Dashboard';
import RiderOnboarding from './pages/admin/RiderOnboarding';
import RiderDashboard from './pages/rider/Dashboard';
import SystemSettings from './pages/admin/SystemSettings';
import ShopDashboard from './pages/shop/Dashboard';
import OrderDetail from './pages/shop/OrderDetail';
import TrackOrder from './pages/public/TrackOrder';
import OrderOversight from './pages/admin/OrderOversight';
import ShopManagement from './pages/admin/ShopManagement';
import Landing from './pages/public/Landing';
import RiderManagement from './pages/admin/RiderManagement';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<Landing />} />
        
        {/* Protected Routes - Super Admin */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/RiderOnboarding" element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <RiderOnboarding />
          </ProtectedRoute>
        } />
        <Route path="/admin/SystemSettings" element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <SystemSettings />
          </ProtectedRoute>
        } />
        
        {/* Protected Routes - Rider */}
        <Route path="/rider" element={
          <ProtectedRoute allowedRoles={['rider']}>
            <RiderDashboard />
          </ProtectedRoute>
        } />
        
        {/* Protected Routes - Shop */}
        <Route path="/shop" element={
          <ProtectedRoute allowedRoles={['shop']}>
            <ShopDashboard />
          </ProtectedRoute>
        } />
        <Route path="/shop/order/:orderId" element={
          <ProtectedRoute allowedRoles={['shop']}>
            <OrderDetail />
          </ProtectedRoute>
        } />
        
        {/* Public Tracking Page */}
        <Route path="/track/:trackingId" element={<TrackOrder />} />

        {/* Protected Routes - Order Oversight (Super Admin & Shop) */}
        <Route path="/admin/OrderOversight" element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <OrderOversight />
          </ProtectedRoute>
        } />

        {/* Protected Routes - Shop Management (Super Admin) */}
        <Route path="/admin/ShopManagement" element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <ShopManagement />
          </ProtectedRoute>
        } />

        {/* Protected Routes - Rider Management (Super Admin) */}
        <Route path="/admin/RiderManagement" element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <RiderManagement />
          </ProtectedRoute>
        } />

        {/* Landing Page */}  
        <Route path="/" element={<Landing />} /> 
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);