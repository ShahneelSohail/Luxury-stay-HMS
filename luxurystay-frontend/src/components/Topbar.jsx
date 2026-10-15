import { useLocation } from 'react-router-dom';
import Icon from './Icon';

const CRUMBS = {
  '/dashboard':    ['Operations', 'Dashboard'],
  '/reservations': ['Operations', 'Reservations'],
  '/checkin':      ['Operations', 'Front Desk'],
  '/rooms':        ['Operations', 'Rooms'],
  '/housekeeping': ['Operations', 'Housekeeping'],
  '/maintenance':  ['Operations', 'Maintenance'],
  '/billing':      ['Commerce', 'Billing'],
  '/guests':       ['Commerce', 'Guests'],
  '/feedback':     ['Commerce', 'Feedback'],
  '/analytics':    ['Administration', 'Analytics'],
  '/staff':        ['Administration', 'Staff'],
  '/settings':     ['Administration', 'Settings'],
};

export default function Topbar({ unreadCount = 0, onNotifClick, onMenuToggle }) {
  const { pathname } = useLocation();
  const base = '/' + pathname.split('/')[1];
  const crumbs = CRUMBS[base] || ['—'];

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn topbar-menu-btn" onClick={onMenuToggle} title="Menu">
          <Icon name="menu" size={18} />
        </button>
        <div className="crumbs">
          {crumbs.map((c, i) => (
            <span key={i}>
              {i > 0 && <span className="sep">/</span>}
              <span className={i === crumbs.length - 1 ? 'current' : ''}>{c}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="topbar-right" />
    </header>
  );
}
