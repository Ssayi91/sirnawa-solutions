import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to role-appropriate dashboard
    const redirectMap = {
      super_admin: '/admin',
      rider: '/rider',
      shop: '/shop'
    };
    return <Navigate to={redirectMap[role] || '/'} replace />;
  }

  return children;
};