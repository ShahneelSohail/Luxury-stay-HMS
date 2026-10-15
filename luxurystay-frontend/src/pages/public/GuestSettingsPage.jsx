import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import PublicShell from '../../layouts/PublicShell';
import Icon from '../../components/Icon';
import { useBreakpoint } from '../../hooks/useBreakpoint';

export default function GuestSettingsPage() {
  const navigate               = useNavigate();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const toast                  = useToast();
  const { isMobile }           = useBreakpoint();

  // Redirect if not an authenticated guest
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'guest') {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Profile form state
  const [name,    setName]    = useState(user?.name  || '');
  const [phone,   setPhone]   = useState(user?.phone || '');
  const [saving,  setSaving]  = useState(false);

  // Keep form in sync if user object updates
  useEffect(() => {
    if (user) {
      setName(user.name  || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/api/auth/me', { name, phone });
      await refreshUser();
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  }

  if (!isAuthenticated || user?.role !== 'guest') return null;

  return (
    <PublicShell>
      <section style={{ padding: isMobile ? '40px 24px 60px' : '60px 64px 80px', maxWidth: 1280, margin: '0 auto' }}>

        {/* ── Page header ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 48 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Settings</div>
          <h1 className="display" style={{ fontSize: 'clamp(42px, 5vw, 64px)', margin: 0, lineHeight: 1 }}>
            Your <em>profile.</em>
          </h1>
        </div>

        {/* ── Two-column grid ───────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 32 : 48, alignItems: 'start' }}>

          {/* Left — Personal details */}
          <div>
            <div style={{
              paddingBottom: 20, marginBottom: 28,
              borderBottom: '1px solid var(--hairline)',
            }}>
              <h2 className="display" style={{ fontSize: 22, margin: 0 }}>Personal details</h2>
            </div>

            <form onSubmit={saveProfile}>
              <div className="field" style={{ marginBottom: 16 }}>
                <label>Full name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>

              <div className="field" style={{ marginBottom: 16 }}>
                <label>Email</label>
                <input
                  value={user.email}
                  disabled
                  style={{ opacity: 0.55, cursor: 'not-allowed' }}
                />
                <p style={{ fontSize: 11, color: 'var(--mute)', margin: '6px 0 0' }}>
                  Email cannot be changed. Contact reception if needed.
                </p>
              </div>

              <div className="field" style={{ marginBottom: 24 }}>
                <label>Phone</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ opacity: saving ? 0.7 : 1 }}
              >
                {saving
                  ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Saving…</>
                  : <>Save changes <Icon name="arrow_right" size={12} /></>}
              </button>
            </form>
          </div>

          {/* Right — Password / security */}
          <div>
            <div style={{
              paddingBottom: 20, marginBottom: 28,
              borderBottom: '1px solid var(--hairline)',
            }}>
              <h2 className="display" style={{ fontSize: 22, margin: 0 }}>Change password</h2>
            </div>

            <div style={{
              border: '1px solid var(--hairline)',
              padding: '32px 28px',
              background: 'var(--paper)',
            }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{
                  width: 40, height: 40, flexShrink: 0,
                  background: 'var(--linen)', border: '1px solid var(--hairline)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--brass-deep)',
                }}>
                  <Icon name="key" size={17} />
                </div>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>Security</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>Password update</div>
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.7, margin: '0 0 20px' }}>
                To update your password, please contact our front desk or email us directly.
                Our concierge team will assist you securely.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <a
                  href="mailto:concierge@luxurystay.co"
                  className="btn btn-ghost"
                  style={{ justifyContent: 'flex-start', textDecoration: 'none', fontSize: 13 }}
                >
                  <Icon name="mail" size={13} />
                  concierge@luxurystay.co
                </a>
                <a
                  href="tel:+33493881424"
                  className="btn btn-ghost"
                  style={{ justifyContent: 'flex-start', textDecoration: 'none', fontSize: 13 }}
                >
                  <Icon name="phone" size={13} />
                  +33 4 93 88 14 24
                </a>
              </div>
            </div>
          </div>
        </div>

      </section>
    </PublicShell>
  );
}
