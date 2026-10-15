import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import { useBreakpoint } from '../hooks/useBreakpoint';

const NAV_ITEMS = [
  { id: 'landing', label: 'The House',  path: '/' },
  { id: 'suites',  label: 'Suites',     path: '/suites' },
  { id: 'book',    label: 'Reserve',    path: '/book' },
  { id: 'stay',    label: 'My Stay',    path: '/guest' },
  { id: 'contact', label: 'Contact',    path: '/contact' },
];

const FOOTER_COLS = [
  { h: 'House', links: ['About', 'Press', 'Careers', 'Sustainability'] },
  { h: 'Stay',  links: ['Suites', 'Dining', 'Spa', 'Events'] },
  { h: 'Guest', links: ['Reservations', 'Concierge', 'Gift cards', 'Sign in'] },
];

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

function PublicFooter({ isMobile }) {
  const navigate = useNavigate();
  return (
    <footer style={{
      background: 'var(--ink)', color: 'var(--ivory)',
      padding: isMobile ? '48px 24px 32px' : '60px 64px 36px',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr 1fr',
        gap: isMobile ? 36 : 48,
        marginBottom: 48,
      }}>
        <div>
          <div
            onClick={() => navigate('/')}
            style={{ fontFamily: 'var(--serif)', fontSize: 28, cursor: 'pointer' }}
          >
            <em>Luxury</em>STAY
          </div>
          <p style={{ fontSize: 12, color: 'var(--mute-2)', marginTop: 16, maxWidth: 320, lineHeight: 1.6 }}>
            Maison Étoile · 14 Promenade des Anglais, 06000 Nice, France.
            A member of Leading Hotels of the World.
          </p>
        </div>
        {!isMobile && FOOTER_COLS.map(col => (
          <div key={col.h}>
            <div className="eyebrow" style={{ color: 'var(--brass-soft)', marginBottom: 16 }}>{col.h}</div>
            {col.links.map(link => (
              <div key={link} style={{ fontSize: 13, color: 'var(--mute-2)', padding: '4px 0', cursor: 'pointer' }}>
                {link}
              </div>
            ))}
          </div>
        ))}
        {isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            {FOOTER_COLS.map(col => (
              <div key={col.h}>
                <div className="eyebrow" style={{ color: 'var(--brass-soft)', marginBottom: 12 }}>{col.h}</div>
                {col.links.map(link => (
                  <div key={link} style={{ fontSize: 13, color: 'var(--mute-2)', padding: '3px 0', cursor: 'pointer' }}>
                    {link}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{
        borderTop: '1px solid #4A443B', paddingTop: 24,
        fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--mute)',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        gap: isMobile ? 8 : 0,
      }}>
        <span>© MMXXVI LuxuryStay Hospitality</span>
        <span>Privacy · Terms · Press</span>
      </div>
    </footer>
  );
}

export default function PublicShell({ children, dark = false }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();
  const [dropOpen,  setDropOpen]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const dropRef = useRef(null);

  const fg     = dark ? 'var(--ivory)' : 'var(--ink)';
  const muted  = dark ? 'var(--mute-2)' : 'var(--mute)';
  const border = dark ? 'rgba(247, 243, 236, 0.12)' : 'var(--hairline-2)';
  const bg     = dark ? 'var(--ink)' : 'var(--ivory)';

  function isActive(path) {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }

  async function handleSignOut() {
    setDropOpen(false);
    setMenuOpen(false);
    await logout();
    navigate('/login');
  }

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    }
    if (dropOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [dropOpen]);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <div style={{ background: bg, minHeight: '100vh', color: fg }}>

      {/* ── Announcement bar (hidden on mobile) ─────────────────────── */}
      {!isMobile && (
        <div style={{
          background: 'var(--ink)', color: 'var(--brass-soft)',
          padding: '8px 32px',
          fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase',
          display: 'flex', justifyContent: 'space-between', gap: 16,
          whiteSpace: 'nowrap', overflow: 'hidden',
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            ★ Member of Leading Hotels of the World
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--mute-2)' }}>
            EN · FR · IT · 中文 · 日本語
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            +33 4 93 88 14 24
          </span>
        </div>
      )}

      {/* ── Sticky header ───────────────────────────────────────────── */}
      <header style={{
        display: 'grid',
        gridTemplateColumns: isTablet ? '1fr auto' : '1fr auto 1fr',
        alignItems: 'center',
        padding: isMobile ? '14px 20px' : isTablet ? '18px 32px' : '26px 64px',
        borderBottom: `1px solid ${border}`,
        position: 'sticky', top: 0,
        background: bg, zIndex: 50,
      }}>

        {/* Brand */}
        <div
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: 6 }}
        >
          <span style={{ fontFamily: 'var(--serif)', fontSize: isMobile ? 20 : 26, fontStyle: 'italic', color: fg }}>Luxury</span>
          <span style={{ fontFamily: 'var(--serif)', fontSize: isMobile ? 20 : 26, letterSpacing: '0.04em', color: fg }}>STAY</span>
        </div>

        {/* Centre nav — desktop only */}
        {!isTablet && (
          <nav style={{
            display: 'flex', gap: 36,
            fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
            justifyContent: 'center',
          }}>
            {NAV_ITEMS.map(item => (
              <a
                key={item.id}
                onClick={() => navigate(item.path)}
                style={{
                  cursor: 'pointer',
                  color: isActive(item.path) ? fg : muted,
                  borderBottom: isActive(item.path) ? `1px solid ${fg}` : '1px solid transparent',
                  paddingBottom: 4,
                  transition: 'color 0.15s',
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}

        {/* Right — desktop: guest auth + CTA; tablet/mobile: hamburger */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
          {!isTablet && (
            <>
              {isAuthenticated && user?.role === 'guest' ? (
                <div ref={dropRef} style={{ position: 'relative' }}>
                  <div
                    className="avatar"
                    onClick={() => setDropOpen(v => !v)}
                    style={{
                      width: 34, height: 34, fontSize: 12,
                      background: 'var(--brass)', color: 'var(--paper)',
                      cursor: 'pointer', userSelect: 'none',
                      outline: dropOpen ? '2px solid var(--brass)' : 'none',
                      outlineOffset: 2,
                    }}
                  >
                    {getInitials(user.name)}
                  </div>

                  {dropOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                      background: 'var(--paper)', border: '1px solid var(--hairline)',
                      minWidth: 200, zIndex: 100,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
                    }}>
                      <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--hairline)' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                          {user.name || user.email}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
                          Étoile member
                        </div>
                      </div>
                      {[
                        { icon: 'calendar', label: 'My Stay',  action: () => { setDropOpen(false); navigate('/guest'); } },
                        { icon: 'settings', label: 'Settings', action: () => { setDropOpen(false); navigate('/guest/settings'); } },
                      ].map(item => (
                        <button
                          key={item.label}
                          onClick={item.action}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            width: '100%', padding: '12px 18px',
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 12, letterSpacing: '0.06em', color: 'var(--ink)',
                            textAlign: 'left',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--linen)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <Icon name={item.icon} size={13} style={{ color: 'var(--brass-deep)' }} />
                          {item.label}
                        </button>
                      ))}
                      <div style={{ borderTop: '1px solid var(--hairline)', padding: '6px 0' }}>
                        <button
                          onClick={handleSignOut}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            width: '100%', padding: '11px 18px',
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 12, letterSpacing: '0.06em', color: 'var(--terracotta)',
                            textAlign: 'left',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--linen)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <Icon name="logout" size={13} />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <a
                  onClick={() => navigate('/login')}
                  style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: muted, cursor: 'pointer' }}
                >
                  Sign in
                </a>
              )}
              <button
                className={dark ? 'btn btn-sm' : 'btn btn-primary btn-sm'}
                style={dark ? {
                  border: '1px solid var(--brass)', color: 'var(--brass)',
                  background: 'transparent', padding: '8px 16px',
                  fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                } : { padding: '8px 16px' }}
                onClick={() => navigate('/book')}
              >
                Reserve <Icon name="arrow_right" size={10} />
              </button>
            </>
          )}

          {/* Tablet/mobile hamburger */}
          {isTablet && (
            <button
              onClick={() => setMenuOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, background: 'none', border: 'none',
                cursor: 'pointer', color: fg,
              }}
            >
              <Icon name={menuOpen ? 'x' : 'menu'} size={20} />
            </button>
          )}
        </div>
      </header>

      {/* ── Mobile full-screen nav ───────────────────────────────────── */}
      {isTablet && menuOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: bg, display: 'flex', flexDirection: 'column',
          padding: isMobile ? '20px 24px 40px' : '24px 40px 40px',
          overflowY: 'auto',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: fg }}>
              <em>Luxury</em>STAY
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: 'none', border: 'none', cursor: 'pointer', color: fg }}
            >
              <Icon name="x" size={20} />
            </button>
          </div>

          {/* Nav links */}
          <nav style={{ flex: 1 }}>
            {NAV_ITEMS.map(item => (
              <div
                key={item.id}
                onClick={() => navigate(item.path)}
                style={{
                  padding: '18px 0',
                  borderBottom: `1px solid ${border}`,
                  fontFamily: 'var(--serif)',
                  fontSize: 32,
                  fontStyle: isActive(item.path) ? 'italic' : 'normal',
                  color: isActive(item.path) ? fg : muted,
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                }}
              >
                {item.label}
              </div>
            ))}
          </nav>

          {/* Bottom actions */}
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {isAuthenticated && user?.role === 'guest' ? (
              <>
                <button className="btn btn-ghost" style={{ justifyContent: 'center' }} onClick={() => navigate('/guest')}>My Stay</button>
                <button className="btn btn-ghost" style={{ justifyContent: 'center' }} onClick={handleSignOut}>Sign out</button>
              </>
            ) : (
              <button className="btn btn-ghost" style={{ justifyContent: 'center' }} onClick={() => navigate('/login')}>Sign in</button>
            )}
            <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={() => navigate('/book')}>
              Reserve <Icon name="arrow_right" size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ── Page content ───────────────────────────────────────────── */}
      {children}

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <PublicFooter isMobile={isMobile} />
    </div>
  );
}
