import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

const PermissionsContext = createContext(null);

// Ordered by priority — first allowed path wins when redirecting
const ORDERED_PATHS = [
  '/reservations',
  '/checkin',
  '/rooms',
  '/housekeeping',
  '/services',
  '/billing',
  '/guests',
  '/inbox',
  '/analytics',
  '/dashboard',
  '/suite-types',
  '/staff',
];

const PATH_TO_LABEL = {
  '/dashboard':    'Dashboard',
  '/reservations': 'Reservations',
  '/checkin':      'Check-in / out',
  '/rooms':        'Rooms',
  '/housekeeping': 'Housekeeping',
  '/services':     'Service Requests',
  '/billing':      'Billing',
  '/guests':       'Guests',
  '/feedback':     'Feedback',
  '/inbox':        'Inbox',
  '/analytics':    'Analytics',
  '/suite-types':  'Suites',
  '/staff':        'Staff & Roles',
};

const CACHE_KEY = 'ls_role_perms';

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
}

export function PermissionsProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const cached = isAuthenticated ? readCache() : null;
  const [allPerms,    setAllPerms]    = useState(cached);
  const [permsLoaded, setPermsLoaded] = useState(!!cached);

  const fetchPermissions = useCallback(async () => {
    if (!isAuthenticated) {
      localStorage.removeItem(CACHE_KEY);
      setAllPerms(null);
      setPermsLoaded(false);
      return;
    }
    try {
      const { data } = await api.get('/api/role-permissions');
      const perms = data?.data?.permissions || null;
      if (perms) localStorage.setItem(CACHE_KEY, JSON.stringify(perms));
      setAllPerms(perms);
    } catch {
      // keep cached value on network error
    } finally {
      setPermsLoaded(true);
    }
  }, [isAuthenticated]);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  function isPageAllowed(pageLabel) {
    if (!allPerms || !user?.role) return null;
    const rolePerms = allPerms[user.role];
    if (!rolePerms) return null;
    return rolePerms[pageLabel] ?? false;
  }

  function getFirstAllowedPath(role) {
    if (!role || role === 'guest') return '/guest';
    const rolePerms = allPerms?.[role] || {};
    for (const path of ORDERED_PATHS) {
      const label = PATH_TO_LABEL[path];
      if (rolePerms[label] === true) return path;
    }
    return '/dashboard'; // ultimate fallback
  }

  return (
    <PermissionsContext.Provider value={{
      isPageAllowed,
      getFirstAllowedPath,
      refetchPermissions: fetchPermissions,
      permsLoaded,
      allPerms,
    }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionsProvider');
  return ctx;
}
