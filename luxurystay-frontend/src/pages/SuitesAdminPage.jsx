import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import api from '../lib/api';
import Icon from '../components/Icon';
import Dropdown from '../components/Dropdown';
import Spinner from '../components/Spinner';

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_MGR = ['admin', 'manager'];

const ICON_OPTIONS = [
  'wifi', 'coffee', 'spa', 'leaf', 'crown', 'pool', 'star', 'bed',
  'key', 'phone', 'mail', 'check', 'arrow_right', 'sparkle',
];

const FALLBACK_GRAD = {
  deluxe_twin:   'linear-gradient(140deg, #EFE8DB, #C9AE82)',
  deluxe_king:   'linear-gradient(140deg, #C9AE82, #A08054)',
  junior_suite:  'linear-gradient(140deg, #A08054, #806339)',
  premier_suite: 'linear-gradient(140deg, #806339, #4A443B)',
  penthouse:     'linear-gradient(140deg, #4A443B, #1A1814)',
};

const EMPTY_FORM = {
  slug: '', name: '', description: '', sqm: '', maxGuests: '',
  baseRate: '', gradient: '', images: '', sortOrder: '0',
  amenities: [{ icon: 'wifi', label: '', vip: false }],
};

// ─── Suite visual (image or gradient) ────────────────────────────────────────

function SuiteVisual({ suite, size = 80 }) {
  const hasImage = suite.images?.length > 0;
  const grad = suite.gradient || FALLBACK_GRAD[suite.slug] || 'linear-gradient(140deg, #C9AE82, #A08054)';
  return (
    <div style={{ width: size, height: size, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
      {hasImage ? (
        <img src={suite.images[0]} alt={suite.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: grad }} />
      )}
    </div>
  );
}

// ─── Suite form modal ─────────────────────────────────────────────────────────

function SuiteModal({ suite, onClose, onSaved }) {
  const { user } = useAuth();
  const toast = useToast();
  const { isMobile } = useBreakpoint();
  const isEdit = !!suite;

  const [form, setForm] = useState(() => {
    if (!suite) return EMPTY_FORM;
    return {
      slug:        suite.slug        || '',
      name:        suite.name        || '',
      description: suite.description || '',
      sqm:         suite.sqm         != null ? String(suite.sqm)       : '',
      maxGuests:   suite.maxGuests   != null ? String(suite.maxGuests)  : '',
      baseRate:    suite.baseRate    != null ? String(suite.baseRate)   : '',
      gradient:    suite.gradient    || '',
      images:      (suite.images     || []).join('\n'),
      sortOrder:   suite.sortOrder   != null ? String(suite.sortOrder)  : '0',
      amenities:   suite.amenities?.length
        ? suite.amenities.map(a => ({ icon: a.icon, label: a.label, vip: !!a.vip }))
        : [{ icon: 'wifi', label: '', vip: false }],
    };
  });

  const [saving, setSaving] = useState(false);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function setAmenity(i, k, v) {
    setForm(f => {
      const amenities = [...f.amenities];
      amenities[i] = { ...amenities[i], [k]: v };
      return { ...f, amenities };
    });
  }

  function addAmenity()    { setForm(f => ({ ...f, amenities: [...f.amenities, { icon: 'star', label: '', vip: false }] })); }
  function removeAmenity(i) { setForm(f => ({ ...f, amenities: f.amenities.filter((_, idx) => idx !== i) })); }

  async function handleSave() {
    if (!form.slug.trim()) return toast.error('Slug is required.');
    if (!form.name.trim()) return toast.error('Name is required.');
    setSaving(true);
    try {
      const payload = {
        slug:        form.slug.trim().toLowerCase().replace(/\s+/g, '_'),
        name:        form.name.trim(),
        description: form.description.trim() || null,
        sqm:         form.sqm         ? Number(form.sqm)       : null,
        maxGuests:   form.maxGuests   ? Number(form.maxGuests)  : null,
        baseRate:    form.baseRate    ? Number(form.baseRate)   : null,
        gradient:    form.gradient.trim() || null,
        images:      form.images.split('\n').map(s => s.trim()).filter(Boolean),
        sortOrder:   Number(form.sortOrder) || 0,
        amenities:   form.amenities.filter(a => a.label.trim()),
      };
      if (isEdit) {
        await api.patch(`/api/suites/${suite.id}`, payload);
        toast.success(`Suite "${payload.name}" updated.`);
      } else {
        await api.post('/api/suites', payload);
        toast.success(`Suite "${payload.name}" created.`);
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  const previewGrad = form.gradient || FALLBACK_GRAD[form.slug] || 'linear-gradient(140deg, #C9AE82, #A08054)';
  const previewImage = form.images.split('\n').map(s => s.trim()).filter(Boolean)[0] || null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 620, maxWidth: '95vw', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>{isEdit ? 'Edit suite' : 'New suite'}</div>
            <h2 className="display" style={{ fontSize: 22, margin: 0 }}>{form.name || 'Untitled'}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Live preview */}
            <div style={{ width: 52, height: 52, overflow: 'hidden', border: '1px solid var(--hairline)', flexShrink: 0 }}>
              {previewImage
                ? <img src={previewImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: previewGrad }} />
              }
            </div>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
              <Icon name="x" size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Identity */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Identity</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Name <span style={{ color: 'var(--terracotta)' }}>*</span></label>
                <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Junior Suite" />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Slug <span style={{ color: 'var(--terracotta)' }}>*</span></label>
                <input
                  value={form.slug}
                  onChange={e => setField('slug', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  placeholder="e.g. junior_suite"
                  disabled={isEdit}
                  style={{ opacity: isEdit ? 0.6 : 1 }}
                />
                <p style={{ fontSize: 10, color: 'var(--mute)', margin: '4px 0 0' }}>
                  Must match Room type enum (e.g. junior_suite). Cannot be changed after creation.
                </p>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--hairline)' }} />

          {/* Details */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Details</div>
            <div className="field" style={{ margin: '0 0 14px' }}>
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Marketing description shown on the public suites page…" style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 12 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Sqm</label>
                <input type="number" value={form.sqm} onChange={e => setField('sqm', e.target.value)} placeholder="48" />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Max guests</label>
                <input type="number" value={form.maxGuests} onChange={e => setField('maxGuests', e.target.value)} placeholder="3" />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Base rate (€)</label>
                <input type="number" value={form.baseRate} onChange={e => setField('baseRate', e.target.value)} placeholder="720" />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Sort order</label>
                <input type="number" value={form.sortOrder} onChange={e => setField('sortOrder', e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--hairline)' }} />

          {/* Visuals */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Visuals</div>
            <div className="field" style={{ margin: '0 0 14px' }}>
              <label>Image URLs <span style={{ fontSize: 10, color: 'var(--mute)', fontWeight: 400 }}>(one per line — first image shown as thumbnail)</span></label>
              <textarea
                rows={3}
                value={form.images}
                onChange={e => setField('images', e.target.value)}
                placeholder="https://example.com/suite-photo.jpg"
                style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 11 }}
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Fallback gradient <span style={{ fontSize: 10, color: 'var(--mute)', fontWeight: 400 }}>(shown when no image is provided)</span></label>
              <input
                value={form.gradient}
                onChange={e => setField('gradient', e.target.value)}
                placeholder="linear-gradient(140deg, #A08054, #806339)"
              />
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--hairline)' }} />

          {/* Amenities */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="eyebrow">Amenities</div>
              <button className="btn btn-ghost btn-sm" onClick={addAmenity}>
                <Icon name="plus" size={11} /> Add
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {form.amenities.map((a, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 120px) minmax(160px, 1fr) minmax(75px, 90px) 32px', gap: 10, alignItems: 'center', minWidth: 0, padding: '10px 0', borderBottom: '1px solid var(--hairline)', }}>
                  <div className="field" style={{ margin: 0 }}>
                    <Dropdown
                      value={a.icon}
                      onChange={value => setAmenity(i, 'icon', value)}
                      options={ICON_OPTIONS.map(ic => ({ value: ic, label: ic }))}
                      placeholder="Select icon"
                      className="dropdown-compact"
                    />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <input
                      value={a.label}
                      onChange={e => setAmenity(i, 'label', e.target.value)}
                      placeholder="e.g. Fibre Wi-Fi"
                      style={{ fontSize: 12, minWidth: 0, width: '100%' }}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink-3)', cursor: 'pointer', paddingLeft: 4 }}>
                      <input type="checkbox" checked={a.vip} onChange={e => setAmenity(i, 'vip', e.target.checked)} />
                      <span style={{ fontSize: 11 }}>VIP</span>
                    </label>
                  </div>
                  <button
                    onClick={() => removeAmenity(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon name="x" size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
            {saving
              ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Saving…</>
              : <><Icon name="check" size={13} />{isEdit ? 'Save changes' : 'Create suite'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuitesAdminPage() {
  const { isMobile } = useBreakpoint();
  const { user } = useAuth();
  const role = user?.role;
  const canManage = ADMIN_MGR.includes(role);
  const toast = useToast();
  const [editing,    setEditing]    = useState(null);
  const [creating,   setCreating]   = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, loading } = useApi('/api/suites?all=true', { deps: [refreshKey] });
  const suites = data?.suites ?? [];

  function onSaved() {
    setEditing(null);
    setCreating(false);
    setRefreshKey(k => k + 1);
  }

  async function handleToggle(suite) {
    if (!canManage) {
      toast.error('Only admin and manager can update suite status.');
      return;
    }

    try {
      await api.patch(`/api/suites/${suite.id}`, { isActive: !suite.isActive });
      toast.success(`Suite "${suite.name}" ${suite.isActive ? 'deactivated' : 'activated'}.`);
      setRefreshKey(k => k + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    }
  }

  return (
    <div>
      {/* Modals */}
{creating && canManage && <SuiteModal onClose={() => setCreating(false)} onSaved={onSaved} />}
          {editing  && canManage && <SuiteModal suite={editing} onClose={() => setEditing(null)} onSaved={onSaved} />}

      {/* Header */}
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Suites</div>
          <h1 className="display">Suite <em>catalogue.</em></h1>
          <p className="sub">
            Manage the suite types shown on the public website, booking flow, and guest portal.
          </p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={12} /> New suite
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: 80 }}><Spinner page /></div>
      ) : suites.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
          No suites yet. Create your first suite to populate the public pages.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {suites.map(suite => (
            <div
              key={suite.id}
              style={{
                border: '1px solid var(--hairline)',
                background: suite.isActive ? 'var(--paper)' : 'var(--ivory)',
                opacity: suite.isActive ? 1 : 0.6,
                display: 'grid',
                gridTemplateColumns: isMobile ? '64px 1fr' : '80px 1fr auto',
                gap: 0,
                overflow: 'hidden',
              }}
            >
              <SuiteVisual suite={suite} size={80} />

              <div style={{ padding: '16px 20px', borderLeft: '1px solid var(--hairline)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{suite.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--mute)', fontFamily: 'monospace' }}>{suite.slug}</span>
                  {!suite.isActive && (
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--terracotta)', background: 'var(--terracotta-soft)', padding: '2px 7px' }}>
                      Inactive
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-3)', marginBottom: 8, flexWrap: 'wrap' }}>
                  {suite.sqm       && <span>{suite.sqm} m²</span>}
                  {suite.maxGuests && <span>Up to {suite.maxGuests} guests</span>}
                  {suite.baseRate  && <span>From €{Number(suite.baseRate).toLocaleString()}</span>}
                  {suite.images?.length > 0
                    ? <span style={{ color: 'var(--sage)' }}>{suite.images.length} image{suite.images.length > 1 ? 's' : ''}</span>
                    : <span style={{ color: 'var(--brass)' }}>Gradient only</span>
                  }
                  {suite.amenities?.length > 0 && <span>{suite.amenities.length} amenities</span>}
                </div>
                {suite.description && (
                  <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0, maxWidth: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                    {suite.description}
                  </p>
                )}
              </div>

              <div style={{ padding: '16px 20px', borderLeft: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8, minWidth: 120 }}>
                {canManage && (
                  <>
                    <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }} onClick={() => setEditing(suite)}>
                      <Icon name="edit" size={12} /> Edit
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ justifyContent: 'center', color: suite.isActive ? 'var(--terracotta)' : 'var(--sage)' }}
                      onClick={() => handleToggle(suite)}
                    >
                      {suite.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
