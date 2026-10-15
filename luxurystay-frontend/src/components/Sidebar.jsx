import { NavLink, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';

const NAV = [
  { section: 'Operations', items: [
    { id: 'dashboard',    label: 'Dashboard',      icon: 'dashboard', path: '/dashboard',    roles: ['admin', 'manager', 'receptionist'] },
    { id: 'reservations', label: 'Reservations',   icon: 'calendar',  path: '/reservations', roles: ['admin', 'manager', 'receptionist'] },
    { id: 'checkin',      label: 'Check-in / out', icon: 'key',       path: '/checkin',      roles: ['admin', 'manager', 'receptionist'] },
    { id: 'rooms',        label: 'Rooms',           icon: 'bed',       path: '/rooms',        roles: ['admin', 'manager', 'receptionist', 'housekeeping'] },
    { id: 'housekeeping', label: 'Housekeeping',   icon: 'sparkle',   path: '/housekeeping', roles: ['admin', 'manager', 'housekeeping'] },
    { id: 'services',     label: 'Service Requests', icon: 'wrench',  path: '/services',     roles: ['admin', 'manager', 'housekeeping', 'service'] },
  ]},
  { section: 'Commerce', items: [
    { id: 'billing',  label: 'Billing',   icon: 'receipt', path: '/billing',  roles: ['admin', 'manager', 'receptionist'] },
    { id: 'guests',   label: 'Guests',    icon: 'user',    path: '/guests',   roles: ['admin', 'manager', 'receptionist'] },
    { id: 'feedback', label: 'Feedback',  icon: 'star',    path: '/feedback', roles: ['admin', 'manager'] },
    { id: 'inbox',    label: 'Inbox',     icon: 'mail',    path: '/inbox',    roles: ['admin', 'manager', 'receptionist'] },
  ]},
  { section: 'Administration', items: [
    { id: 'analytics', label: 'Analytics',    icon: 'chart',    path: '/analytics', roles: ['admin', 'manager'] },
    { id: 'suites',    label: 'Suites',        icon: 'star',     path: '/suite-types', roles: ['admin'] },
    { id: 'staff',     label: 'Staff & Roles',icon: 'users',    path: '/staff',     roles: ['admin'] },
  ]},
];

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function getRoleTitle(role) {
  const titles = {
    admin:        'General Manager · Admin',
    manager:      'Front Office Manager',
    receptionist: 'Receptionist',
    housekeeping: 'Head of Housekeeping',
    service:      'Service Attendant',
  };
  return titles[role] || role;
}

export default function Sidebar({ open = false, onClose }) {
  const { user, logout } = useAuth();
  const { isPageAllowed } = usePermissions();
  const navigate = useNavigate();

  const role = user?.role || 'receptionist';
  const filteredNav = NAV
    .map(s => ({
      ...s,
      items: s.items.filter(item => {
        const fromDb = isPageAllowed(item.label);
        // While permissions are loading (null), fall back to hardcoded roles
        return fromDb === null ? item.roles.includes(role) : fromDb;
      }),
    }))
    .filter(s => s.items.length > 0);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-brand">
        <div className="mark">
          <span className="name">Luxury</span><span className="suf">STAY</span>
        </div>
        <div className="tag">Maison Étoile · Côte d'Azur</div>
      </div>

      {filteredNav.map(section => (
        <div key={section.section} style={{ marginBottom: 8 }}>
          <div className="sidebar-section">{section.section}</div>
          {section.items.map(item => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
            >
              <Icon name={item.icon} size={16} className="icon" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      ))}

      <div className="sidebar-user">
        <div className="avatar">{getInitials(user?.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.name || '—'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {getRoleTitle(user?.role)}
          </div>
        </div>
        <button className="icon-btn" title="Sign out" onClick={handleLogout}>
          <Icon name="logout" size={14} />
        </button>
      </div>
    </aside>
  );
}
