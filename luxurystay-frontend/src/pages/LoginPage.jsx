import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import api from '../lib/api';
import Icon from '../components/Icon';

// Quick-fill demo credentials — remove in production
const DEMO_ACCOUNTS = [
  { label: 'Admin · Margaux',     email: 'm.devereaux@luxurystay.co', pwd: 'Admin@1234!'   },
  { label: 'Manager · Henri',     email: 'h.cassel@luxurystay.co',    pwd: 'Manager@1234!' },
  { label: 'Reception · Yuki',    email: 'y.tanaka@luxurystay.co',    pwd: 'Reception@1234!' },
  { label: 'Housekeep · Rosa',    email: 'r.mendoza@luxurystay.co',   pwd: 'House@1234!'   },
  { label: 'Service · Tomás',     email: 't.reyes@luxurystay.co',     pwd: 'Service@1234!' },
];

const ROLE_LABELS = {
  admin:        'Admin console',
  manager:      'Manager console',
  receptionist: 'Front desk console',
  housekeeping: 'Housekeeping console',
  maintenance:  'Maintenance console',
};

export default function LoginPage() {
  const [tab, setTab] = useState('signin');

  // Sign-in state
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [showPwd, setShowPwd]               = useState(false);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [loginFieldErrors, setLoginFieldErrors] = useState({});

  // Registration state
  const [regName, setRegName]               = useState('');
  const [regEmail, setRegEmail]             = useState('');
  const [regPhone, setRegPhone]             = useState('');
  const [regPassword, setRegPassword]       = useState('');
  const [regConfirm, setRegConfirm]         = useState('');
  const [showRegPwd, setShowRegPwd]         = useState(false);
  const [regLoading, setRegLoading]         = useState(false);
  const [regError, setRegError]             = useState('');
  const [regFieldErrors, setRegFieldErrors] = useState({});

  const { login, isAuthenticated, user } = useAuth();
  const toast    = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, isTablet } = useBreakpoint();

  const from = location.state?.from?.pathname;

  function getDefaultRoute(role) {
    if (role === 'guest') return '/guest';
    if (role === 'housekeeping') return '/housekeeping';
    if (role === 'service') return '/services';
    return '/dashboard';
  }

  function canAccessRoute(role, path) {
    if (!path) return false;
    if (role === 'admin') return true;
    if (role === 'manager') return true;
    if (role === 'receptionist') {
      return ['/dashboard', '/reservations', '/checkin', '/rooms', '/billing', '/guests'].some(prefix => path.startsWith(prefix));
    }
    if (role === 'housekeeping') {
      return ['/rooms', '/housekeeping', '/maintenance'].some(prefix => path.startsWith(prefix));
    }
    if (role === 'service') {
      return ['/rooms', '/services', '/maintenance'].some(prefix => path.startsWith(prefix));
    }
    return false;
  }

  // Already authenticated — skip login
  useEffect(() => {
    if (isAuthenticated) {
      const defaultRoute = getDefaultRoute(user?.role);
      const dest = canAccessRoute(user?.role, from) ? from : defaultRoute;
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  // Identity resolver from email domain
  const staffDomain  = email.trim().toLowerCase().endsWith('@luxurystay.co');
  const resolvedRole = staffDomain ? 'staff' : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoginFieldErrors({});

    const clientErrors = {};
    if (!email.trim())    clientErrors.email    = 'Email is required.';
    if (!password.trim()) clientErrors.password = 'Password is required.';
    if (Object.keys(clientErrors).length > 0) {
      setLoginFieldErrors(clientErrors);
      return;
    }

    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(`Welcome back, ${user.name?.split(' ')[0] || 'there'}.`);
      const defaultRoute = getDefaultRoute(user.role);
      const dest = canAccessRoute(user.role, from) ? from : defaultRoute;
      navigate(dest, { replace: true });
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors?.length) {
        const fieldMap = {};
        serverErrors.forEach(e => { fieldMap[e.field] = e.message; });
        setLoginFieldErrors(fieldMap);
      } else {
        setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  const PASSWORD_REGEX = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

  async function handleRegister(e) {
    e.preventDefault();
    setRegError('');
    setRegFieldErrors({});

    const clientErrors = {};
    if (!regName.trim())   clientErrors.name = 'Name is required.';
    else if (regName.trim().length < 2) clientErrors.name = 'Name must be at least 2 characters.';
    if (!regEmail.trim())  clientErrors.email = 'Email is required.';
    if (!regPassword)      clientErrors.password = 'Password is required.';
    else if (regPassword.length < 8) clientErrors.password = 'Password must be at least 8 characters.';
    else if (!PASSWORD_REGEX.test(regPassword)) clientErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number.';
    if (!regConfirm) clientErrors.confirmPassword = 'Please confirm your password.';
    else if (regPassword !== regConfirm) clientErrors.confirmPassword = 'Passwords do not match.';

    if (Object.keys(clientErrors).length > 0) {
      setRegFieldErrors(clientErrors);
      return;
    }

    setRegLoading(true);
    try {
      const { data } = await api.post('/api/auth/register', {
        name:     regName.trim(),
        email:    regEmail.trim(),
        password: regPassword,
        phone:    regPhone.trim() || undefined,
      });
      const { token, user: newUser } = data.data;
      localStorage.setItem('ls_token', token);
      localStorage.setItem('ls_user', JSON.stringify(newUser));
      toast.success(`Welcome to LuxuryStay, ${newUser.name?.split(' ')[0] || 'there'}!`);
      navigate('/guest', { replace: true });
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors?.length) {
        const fieldMap = {};
        serverErrors.forEach(e => { fieldMap[e.field] = e.message; });
        setRegFieldErrors(fieldMap);
      } else {
        setRegError(err.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setRegLoading(false);
    }
  }

  function quickFill(acc) {
    setEmail(acc.email);
    setPassword(acc.pwd);
    setTab('signin');
    setError('');
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: isTablet ? 'flex' : 'grid',
      flexDirection: isTablet ? 'column' : undefined,
      gridTemplateColumns: isTablet ? undefined : '1.1fr 1fr',
      background: 'var(--ivory)',
    }}>

      {/* ── Left dark panel (desktop) / Top dark banner (tablet+mobile) ── */}
      {!isTablet ? (
        /* ── Full-height desktop side panel ── */
        <div style={{
          background: 'linear-gradient(160deg, #2A2620 0%, #1A1814 100%)',
          color: 'var(--ivory)',
          padding: '56px 56px 56px 64px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 25%, rgba(160,128,84,0.22), transparent 55%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 40, right: 56, fontFamily: 'var(--serif)', fontSize: 300, fontStyle: 'italic', color: 'rgba(160,128,84,0.08)', lineHeight: 0.8, pointerEvents: 'none', userSelect: 'none' }}>★</div>

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 30, fontStyle: 'italic' }}>Luxury</span>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 30, letterSpacing: '0.04em' }}>STAY</span>
            </div>
            <div style={{ fontSize: 12, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--brass-soft)', marginTop: 10, fontWeight: 600 }}>
              One door · every guest
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ width: 60, height: 1, background: 'var(--brass)', marginBottom: 28 }} />
            <div className="display display-italic" style={{ fontSize: 64, lineHeight: 1.02, maxWidth: 560, color: 'var(--ivory)', letterSpacing: '-0.01em' }}>
              "Service is the architecture of memory."
            </div>
            <div style={{ marginTop: 28, fontSize: 12, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--brass-soft)', fontWeight: 600 }}>
              — House motto · MCMXXIV
            </div>
          </div>

          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--mute-2)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500 }}>
            <span>Maison Étoile · Côte d'Azur</span>
            <span>Vol. CII · MMXXVI</span>
          </div>
        </div>
      ) : (
        /* ── Compact dark banner for tablet / mobile ── */
        <div style={{
          background: 'linear-gradient(160deg, #2A2620 0%, #1A1814 100%)',
          color: 'var(--ivory)',
          padding: isMobile ? '28px 24px' : '32px 40px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          gap: isMobile ? 16 : 0,
        }}>
          {/* Brass glow */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 50%, rgba(160,128,84,0.25), transparent 60%)', pointerEvents: 'none' }} />
          {/* Watermark */}
          <div style={{ position: 'absolute', right: isMobile ? -10 : 20, top: -10, fontFamily: 'var(--serif)', fontSize: isMobile ? 140 : 180, fontStyle: 'italic', color: 'rgba(160,128,84,0.07)', lineHeight: 0.8, pointerEvents: 'none', userSelect: 'none' }}>★</div>

          {/* Brand */}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: isMobile ? 24 : 28, fontStyle: 'italic', color: 'var(--ivory)' }}>Luxury</span>
              <span style={{ fontFamily: 'var(--serif)', fontSize: isMobile ? 24 : 28, letterSpacing: '0.04em', color: 'var(--ivory)' }}>STAY</span>
            </div>
            <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--brass-soft)', marginTop: 6, fontWeight: 600 }}>
              Maison Étoile · Côte d'Azur
            </div>
          </div>

          {/* Quote — hide on very narrow mobile */}
          {!isMobile && (
            <div style={{ position: 'relative', textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontStyle: 'italic', color: 'rgba(247,243,236,0.7)', lineHeight: 1.5, maxWidth: 320 }}>
                "Service is the architecture of memory."
              </div>
              <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--brass-soft)', marginTop: 8, fontWeight: 600 }}>
                — House motto · MCMXXIV
              </div>
            </div>
          )}

          {/* Quote inline on mobile */}
          {isMobile && (
            <div style={{ position: 'relative' }}>
              <div style={{ width: 36, height: 1, background: 'var(--brass)', marginBottom: 10 }} />
              <div style={{ fontFamily: 'var(--serif)', fontSize: 14, fontStyle: 'italic', color: 'rgba(247,243,236,0.65)', lineHeight: 1.55 }}>
                "Service is the architecture of memory."
              </div>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--brass-soft)', marginTop: 8, fontWeight: 600 }}>
                — House motto · MCMXXIV
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Form panel ───────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '36px 24px 48px' : isTablet ? '48px 40px' : 56, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflowY: 'auto', flex: isTablet ? '1' : undefined }}>
        <div style={{ maxWidth: 460, margin: '0 auto', width: '100%' }}>

          <div className="eyebrow" style={{ marginBottom: 14 }}>
            {tab === 'signup' ? 'Create your account' : 'Welcome back'}
          </div>
          <h1 className="display" style={{ fontSize: isMobile ? 48 : 60, margin: '0 0 12px', lineHeight: 1 }}>
            {tab === 'signup' ? <>Begin your <em>residency.</em></> : <>Sign <em>in.</em></>}
          </h1>
          <p style={{ color: 'var(--ink-3)', marginBottom: 28, fontSize: 14, lineHeight: 1.6, fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
            One sign-in for guests and staff alike. We'll route you to the right place.
          </p>

          {/* Tab switcher — underline style */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--hairline)', marginBottom: 28 }}>
            {[{ id: 'signin', label: 'Sign in' }, { id: 'signup', label: 'Create account' }].map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setError(''); setLoginFieldErrors({}); setRegError(''); setRegFieldErrors({}); }}
                style={{
                  flex: 1, padding: '14px 16px',
                  fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
                  background: 'transparent',
                  color: tab === t.id ? 'var(--ink)' : 'var(--mute)',
                  border: 'none',
                  borderBottom: tab === t.id ? '2px solid var(--ink)' : '2px solid transparent',
                  marginBottom: -1,
                  cursor: 'pointer',
                  fontWeight: tab === t.id ? 600 : 400,
                }}
              >{t.label}</button>
            ))}
          </div>

          {tab === 'signin' ? (
            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div className="field" style={{ marginBottom: loginFieldErrors.email ? 6 : 18 }}>
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); setLoginFieldErrors(p => ({ ...p, email: '' })); }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  style={loginFieldErrors.email ? { borderColor: 'var(--terracotta)' } : {}}
                />
              </div>
              {loginFieldErrors.email && (
                <p style={{ color: 'var(--terracotta)', fontSize: 12, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="alert" size={11} />{loginFieldErrors.email}
                </p>
              )}

              {/* Password */}
              <div className="field" style={{ marginBottom: loginFieldErrors.password ? 6 : 14 }}>
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); setLoginFieldErrors(p => ({ ...p, password: '' })); }}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    style={{ width: '100%', paddingRight: 32, ...(loginFieldErrors.password ? { borderColor: 'var(--terracotta)' } : {}) }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    style={{ position: 'absolute', right: 0, bottom: 8, color: 'var(--mute)', padding: 0 }}
                    tabIndex={-1}
                  >
                    <Icon name="eye" size={14} />
                  </button>
                </div>
              </div>
              {loginFieldErrors.password && (
                <p style={{ color: 'var(--terracotta)', fontSize: 12, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="alert" size={11} />{loginFieldErrors.password}
                </p>
              )}

              {/* Identity resolver strip */}
              {resolvedRole && email && (
                <div style={{
                  background: 'var(--linen)', border: '1px solid var(--hairline)',
                  padding: '12px 16px', marginBottom: 20,
                  fontSize: 12, color: 'var(--ink-3)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <Icon name="key" size={14} style={{ color: 'var(--brass-deep)' }} />
                  <span style={{ fontFamily: 'var(--serif)' }}>
                    LuxuryStay staff address recognised · routing to{' '}
                    <strong style={{ fontWeight: 600, fontStyle: 'italic' }}>staff console</strong>
                  </span>
                </div>
              )}

              {/* General error */}
              {error && (
                <div style={{
                  background: 'var(--terracotta-soft)', border: '1px solid var(--terracotta)',
                  padding: '10px 14px', marginBottom: 18,
                  fontSize: 12, color: 'var(--terracotta)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <Icon name="alert" size={12} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: 16, justifyContent: 'center', opacity: loading ? 0.6 : 1 }}
              >
                {loading
                  ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} /> Signing in…</>
                  : <>{resolvedRole ? `Sign in to ${ROLE_LABELS.staff || 'console'}` : 'Sign in to My Stay'} <Icon name="arrow_right" size={12} /></>
                }
              </button>
            </form>
          ) : (
            /* ── Guest registration form ── */
            <form onSubmit={handleRegister} noValidate>
              <div className="field" style={{ marginBottom: regFieldErrors.name ? 6 : 14 }}>
                <label>Full name <span style={{ color: 'var(--terracotta)' }}>*</span></label>
                <input
                  type="text"
                  value={regName}
                  onChange={e => { setRegName(e.target.value); setRegFieldErrors(p => ({ ...p, name: '' })); }}
                  placeholder="Jane Smith"
                  autoComplete="name"
                  autoFocus
                  style={regFieldErrors.name ? { borderColor: 'var(--terracotta)' } : {}}
                />
              </div>
              {regFieldErrors.name && (
                <p style={{ color: 'var(--terracotta)', fontSize: 12, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="alert" size={11} />{regFieldErrors.name}
                </p>
              )}

              <div className="field" style={{ marginBottom: regFieldErrors.email ? 6 : 14 }}>
                <label>Email address <span style={{ color: 'var(--terracotta)' }}>*</span></label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={e => { setRegEmail(e.target.value); setRegFieldErrors(p => ({ ...p, email: '' })); }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  style={regFieldErrors.email ? { borderColor: 'var(--terracotta)' } : {}}
                />
              </div>
              {regFieldErrors.email && (
                <p style={{ color: 'var(--terracotta)', fontSize: 12, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="alert" size={11} />{regFieldErrors.email}
                </p>
              )}

              <div className="field" style={{ marginBottom: regFieldErrors.phone ? 6 : 14 }}>
                <label>Phone <span style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 400 }}>optional</span></label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={e => { setRegPhone(e.target.value); setRegFieldErrors(p => ({ ...p, phone: '' })); }}
                  placeholder="+1 555 000 0000"
                  autoComplete="tel"
                  style={regFieldErrors.phone ? { borderColor: 'var(--terracotta)' } : {}}
                />
              </div>
              {regFieldErrors.phone && (
                <p style={{ color: 'var(--terracotta)', fontSize: 12, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="alert" size={11} />{regFieldErrors.phone}
                </p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: (regFieldErrors.password || regFieldErrors.confirmPassword) ? 6 : 14 }}>
                <div className="field">
                  <label>Password <span style={{ color: 'var(--terracotta)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showRegPwd ? 'text' : 'password'}
                      value={regPassword}
                      onChange={e => { setRegPassword(e.target.value); setRegFieldErrors(p => ({ ...p, password: '' })); }}
                      placeholder="Min 8 chars"
                      autoComplete="new-password"
                      style={{ width: '100%', paddingRight: 32, ...(regFieldErrors.password ? { borderColor: 'var(--terracotta)' } : {}) }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPwd(v => !v)}
                      style={{ position: 'absolute', right: 0, bottom: 8, color: 'var(--mute)', padding: 0 }}
                      tabIndex={-1}
                    ><Icon name="eye" size={14} /></button>
                  </div>
                </div>
                <div className="field">
                  <label>Confirm password <span style={{ color: 'var(--terracotta)' }}>*</span></label>
                  <input
                    type={showRegPwd ? 'text' : 'password'}
                    value={regConfirm}
                    onChange={e => { setRegConfirm(e.target.value); setRegFieldErrors(p => ({ ...p, confirmPassword: '' })); }}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    style={regFieldErrors.confirmPassword ? { borderColor: 'var(--terracotta)' } : {}}
                  />
                </div>
              </div>
              {regFieldErrors.password && (
                <p style={{ color: 'var(--terracotta)', fontSize: 12, margin: '0 0 6px', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <Icon name="alert" size={11} style={{ marginTop: 2, flexShrink: 0 }} />{regFieldErrors.password}
                </p>
              )}
              {regFieldErrors.confirmPassword && (
                <p style={{ color: 'var(--terracotta)', fontSize: 12, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="alert" size={11} />{regFieldErrors.confirmPassword}
                </p>
              )}

              {regError && (
                <div style={{
                  background: 'var(--terracotta-soft)', border: '1px solid var(--terracotta)',
                  padding: '10px 14px', marginBottom: 14,
                  fontSize: 12, color: 'var(--terracotta)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <Icon name="alert" size={12} />
                  <span>{regError}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={regLoading}
                style={{ width: '100%', padding: 16, justifyContent: 'center', opacity: regLoading ? 0.7 : 1 }}
              >
                {regLoading
                  ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} /> Creating account…</>
                  : <>Create account <Icon name="arrow_right" size={12} /></>
                }
              </button>

              <p style={{ fontSize: 11, color: 'var(--mute)', marginTop: 12, lineHeight: 1.6 }}>
                Staff accounts are created by the property administrator via the admin panel.
              </p>
            </form>
          )}

          {/* ── Demo quick-fill ── */}
          <div className="rule" style={{ margin: '28px 0 20px' }}><div className="dot" /></div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Demo · try a role</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.email}
                className="btn btn-ghost"
                style={{ justifyContent: 'flex-start', fontSize: 11, padding: '10px 12px' }}
                onClick={() => quickFill(acc)}
              >
                {acc.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 24, fontSize: 11, color: 'var(--mute)', textAlign: 'center' }}>
            <a href="/" style={{ color: 'var(--brass-deep)', borderBottom: '1px solid var(--brass-deep)', cursor: 'pointer', textDecoration: 'none' }}>
              ← Back to the public site
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
