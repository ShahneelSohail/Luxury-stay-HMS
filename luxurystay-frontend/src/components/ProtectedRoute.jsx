import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';

/**
 * Wraps a route that requires authentication.
 * - `roles`     — hardcoded role whitelist (fast, no DB needed)
 * - `pageLabel` — page label to check against DB permissions (e.g. "Dashboard")
 *                 When provided, blocks access even if the role would normally allow it.
 */
export default function ProtectedRoute({ children, roles, pageLabel }) {
  const { isAuthenticated, user } = useAuth();
  const { isPageAllowed, getFirstAllowedPath, permsLoaded } = usePermissions();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Hardcoded role check (fast path, no DB)
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to={getFirstAllowedPath(user.role)} replace />;
  }

  // DB permission check — wait for permissions to load before evaluating
  if (pageLabel && user) {
    if (!permsLoaded) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
        </div>
      );
    }
    if (isPageAllowed(pageLabel) === false) {
      return <Navigate to={getFirstAllowedPath(user.role)} replace />;
    }
  }

  return children;
}
