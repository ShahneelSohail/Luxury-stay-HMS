import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import api from '../lib/api';
import Icon from '../components/Icon';
import Dropdown from '../components/Dropdown';
import Spinner from '../components/Spinner';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ['available', 'occupied', 'cleaning', 'maintenance', 'reserved'];
const TYPES    = ['deluxe_twin', 'deluxe_king', 'junior_suite', 'premier_suite', 'penthouse'];

const TYPE_LABELS = {
  deluxe_twin:   'Deluxe Twin',
  deluxe_king:   'Deluxe King',
  junior_suite:  'Junior Suite',
  premier_suite: 'Premier Suite',
  penthouse:     'Penthouse',
};

const STATUS_CONFIG = {
  available:   { chip: 'chip-available',   label: 'Available' },
  occupied:    { chip: 'chip-occupied',    label: 'Occupied' },
  cleaning:    { chip: 'chip-cleaning',    label: 'Cleaning' },
  maintenance: { chip: 'chip-maintenance', label: 'Maintenance' },
  reserved:    { chip: 'chip-reserved',    label: 'Reserved' },
};

const FLOOR_NAMES = { 1: 'First', 2: 'Second', 3: 'Third', 4: 'Fourth', 5: 'Fifth', 6: 'Sixth' };

const ADMIN_MGR  = ['admin', 'manager'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(val) {
  if (val == null) return '—';
  return `€${Number(val).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusChip({ status }) {
  const { chip, label } = STATUS_CONFIG[status] || { chip: 'chip-reserved', label: status };
  return <span className={`chip ${chip}`}><span className="chip-dot" />{label}</span>;
}

function SectionHead({ title, caption }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
      <h2 className="display" style={{ fontSize: 28, margin: 0 }}>{title}</h2>
      {caption && <span className="eyebrow">{caption}</span>}
    </div>
  );
}

// ─── Room Card ────────────────────────────────────────────────────────────────

function RoomCard({ room, canManage, canChangeStatus, onManage }) {
  const statusNote = {
    cleaning:    'Awaiting housekeeping turn-down',
    maintenance: 'Maintenance in progress',
    available:   'Ready for arrival',
    reserved:    'Reservation pending check-in',
    occupied:    'Occupied · no reservation on record',
  }[room.status];

  return (
    <div className="card" style={{ padding: 20, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="display numeral" style={{ fontSize: 40, lineHeight: 1 }}>{room.roomNumber}</div>
          <div className="label" style={{ marginTop: 4 }}>{TYPE_LABELS[room.type] || room.type}</div>
        </div>
        <StatusChip status={room.status} />
      </div>

      <div style={{ height: 1, background: 'var(--hairline-2)', margin: '16px 0' }} />

      <div style={{ minHeight: 38 }}>
        {room.currentGuest && (room.status === 'occupied' || room.status === 'reserved') ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{room.currentGuest}</div>
            <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>
              {room.status === 'occupied'
                ? `Departs ${room.checkoutDate}`
                : `Arriving · ${room.checkoutDate ? `departs ${room.checkoutDate}` : 'date TBC'}`}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--mute)', fontStyle: 'italic' }}>
            {statusNote || '—'}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--hairline-2)' }}>
        <span className="numeral" style={{ fontSize: 16 }}>
          {fmtCurrency(room.rates?.standard)}
          <span style={{ fontSize: 10, color: 'var(--mute)', marginLeft: 4 }}>/ NIGHT</span>
        </span>
        {(canManage || canChangeStatus) && (
          <button className="btn btn-ghost btn-sm" onClick={() => onManage(room)}>
            Manage
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Manage Modal ─────────────────────────────────────────────────────────────

// Status options each role may set manually
function allowedStatuses(role, current) {
  if (['admin', 'manager'].includes(role)) return STATUSES;
  if (role === 'housekeeping') {
    if (current === 'cleaning') {
      return ['cleaning', 'maintenance', 'available'];
    }
    if (current === 'maintenance') {
      return ['maintenance', 'available'];
    }
    return [current];
  }
  if (role === 'service') {
    return ['maintenance', 'available'].filter(s => s !== current || current === s);
  }
  return [current];
}

function DeleteWarningModal({ roomNumber, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      {/* Backdrop — slightly darker to stack over ManageModal */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,20,0.55)' }} onClick={onCancel} />

      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', background: 'var(--paper)',
          border: '1px solid var(--hairline)', width: '100%', maxWidth: 420,
          padding: 0, overflow: 'hidden',
        }}
      >
        {/* Warning banner */}
        <div style={{
          background: 'var(--terracotta-soft)', borderBottom: '1px solid var(--terracotta)',
          padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, flexShrink: 0, borderRadius: '50%',
            background: 'var(--terracotta)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--ivory)',
          }}>
            <Icon name="alert" size={17} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--terracotta)' }}>Delete room</div>
            <div style={{ fontSize: 11, color: 'var(--terracotta)', opacity: 0.8, marginTop: 1 }}>
              Room {roomNumber} · Permanent action
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 24px 20px' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--ink)', margin: '0 0 12px' }}>
            This will permanently delete Room {roomNumber} from the system.
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--ink-3)', margin: 0 }}>
            All associated data, reservations, and history will be removed. This action cannot be undone.
          </p>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px 20px', display: 'flex',
          justifyContent: 'flex-end', gap: 10,
        }}>
          <button className="btn btn-ghost" onClick={onCancel}>Keep room</button>
          <button
            className="btn btn-primary"
            style={{ background: 'var(--terracotta)', borderColor: 'var(--terracotta)' }}
            onClick={onConfirm}
          >
            <Icon name="check" size={13} /> Yes, delete room
          </button>
        </div>
      </div>
    </div>
  );
}

function OccupiedWarningModal({ roomNumber, newStatus, onConfirm, onCancel }) {
  const newLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,20,0.55)' }} onClick={onCancel} />

      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', background: 'var(--paper)',
          border: '1px solid var(--hairline)', width: '100%', maxWidth: 440,
          padding: 0, overflow: 'hidden',
        }}
      >
        <div style={{
          background: 'var(--terracotta-soft)', borderBottom: '1px solid var(--terracotta)',
          padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, flexShrink: 0, borderRadius: '50%',
            background: 'var(--terracotta)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--ivory)',
          }}>
            <Icon name="alert" size={17} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--terracotta)' }}>Room is currently occupied</div>
            <div style={{ fontSize: 11, color: 'var(--terracotta)', opacity: 0.8, marginTop: 1 }}>
              Room {roomNumber} · Change to {newLabel}
            </div>
          </div>
        </div>

        <div style={{ padding: '24px 24px 20px' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--ink)', margin: '0 0 12px' }}>
            Room {roomNumber} is currently occupied by a guest. You are about to mark it as <strong>{newLabel}</strong>.
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--ink-3)', margin: 0 }}>
            Only proceed if the guest has checked out or the status change has been authorised.
          </p>
        </div>

        <div style={{
          padding: '14px 24px 20px', display: 'flex',
          justifyContent: 'flex-end', gap: 10,
        }}>
          <button className="btn btn-ghost" onClick={onCancel}>Keep occupied</button>
          <button className="btn btn-primary" onClick={onConfirm}>
            <Icon name="check" size={13} /> Confirm — mark {newLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ManageModal({ room, canManage, canDelete, role, onClose, onSaved }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { isMobile } = useBreakpoint();
  const [status, setStatus] = useState(room.status);
  const [note, setNote]     = useState(room.statusNote || '');
  const [saving, setSaving] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const roomId = room.id || room._id;

  const [guestId,       setGuestId]       = useState('');
  const [guests,        setGuests]        = useState([]);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [activeResId,   setActiveResId]   = useState(null);

  const todayStr    = new Date().toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [checkIn,  setCheckIn]  = useState(todayStr);
  const [checkOut, setCheckOut] = useState(tomorrowStr);

  const statusOptions = allowedStatuses(role, room.status);

  // On mount: if room is already occupied, fetch guests + active reservation together
  useEffect(() => {
    if (room.status !== 'occupied') return;
    setGuestsLoading(true);
    const roomId = room.id || room._id;
    Promise.all([
      api.get('/api/guests?limit=200&sort=name'),
      api.get(`/api/reservations?roomId=${roomId}&status=checked-in&limit=1`),
    ])
      .then(([gR, rR]) => {
        setGuests(gR.data?.data?.guests ?? []);
        const activeRes = rR.data?.data?.reservations?.[0];
        if (activeRes) {
          setActiveResId(activeRes.id || activeRes._id);
          const gId = activeRes.guest?.id || activeRes.guest?._id || activeRes.guest;
          if (gId) setGuestId(String(gId));
          if (activeRes.checkInDate)  setCheckIn(activeRes.checkInDate.slice(0, 10));
          if (activeRes.checkOutDate) setCheckOut(activeRes.checkOutDate.slice(0, 10));
        }
      })
      .catch(() => {})
      .finally(() => setGuestsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch guest list whenever the user selects "occupied" (and room wasn't already occupied)
  useEffect(() => {
    if (room.status === 'occupied') return; // handled by mount effect above
    if (status === 'occupied') {
      setGuestsLoading(true);
      api.get('/api/guests?limit=200&sort=name')
        .then(r => setGuests(r.data?.data?.guests ?? []))
        .catch(() => {})
        .finally(() => setGuestsLoading(false));
    } else {
      setGuestId('');
      setGuests([]);
    }
  }, [status, room.status]);

  const [priceStd, setPriceStd]   = useState(room.rates?.standard ?? '');
  const [pricePeak, setPricePeak] = useState(room.rates?.peak ?? '');
  const [maxGuests, setMaxGuests] = useState(room.maxGuests ?? '');

  async function handleSave() {
    if (room.status === 'occupied' && status !== 'occupied') {
      setShowWarning(true);
      return;
    }
    if (status === 'occupied' && room.status !== 'occupied' && !guestId) {
      toast.error('Please select a guest to assign to this room.');
      return;
    }
    await doSave();
  }

  async function doSave() {
    setShowWarning(false);

    if (!canManage && role !== 'housekeeping' && role !== 'service') {
      toast.error('Only admin, manager, or housekeeping can update room status.');
      return;
    }

    setSaving(true);
    try {
      const occupiedFieldsChanged = status === 'occupied' && room.status === 'occupied' && guestId;
      if (status !== room.status || note !== (room.statusNote || '') || occupiedFieldsChanged) {
        const statusPayload = { status, statusNote: note };
        if (status === 'occupied' && guestId) {
          statusPayload.guestId  = guestId;
          statusPayload.checkIn  = checkIn;
          statusPayload.checkOut = checkOut;
        }
        await api.patch(`/api/rooms/${roomId}/status`, statusPayload);
      }
      if (canManage && (priceStd !== room.rates?.standard || pricePeak !== room.rates?.peak || maxGuests !== room.maxGuests)) {
        await api.patch(`/api/rooms/${roomId}`, {
          rates: { ...room.rates, standard: Number(priceStd), peak: Number(pricePeak) },
          maxGuests: Number(maxGuests),
        });
      }
      toast.success(`Room ${room.roomNumber} updated.`);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setShowDeleteConfirm(false);

    if (role !== 'admin') {
      toast.error('Only admin can delete rooms.');
      return;
    }

    setSaving(true);
    try {
      await api.delete(`/api/rooms/${roomId}`);
      toast.success(`Room ${room.roomNumber} deleted.`);

      const cached = queryClient.getQueryData([ROOMS_QUERY_KEY]);
      if (cached?.rooms) {
        queryClient.setQueryData([ROOMS_QUERY_KEY], {
          ...cached,
          rooms: cached.rooms.filter(r => (r.id || r._id) !== roomId),
        });
      }
      queryClient.invalidateQueries({ queryKey: [ROOMS_QUERY_KEY] });

      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      {showWarning && (
        <OccupiedWarningModal
          roomNumber={room.roomNumber}
          newStatus={status}
          onConfirm={doSave}
          onCancel={() => setShowWarning(false)}
        />
      )}
      {showDeleteConfirm && (
        <DeleteWarningModal
          roomNumber={room.roomNumber}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      <div className="modal" style={{ width: 500, maxWidth: '100%' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              className="numeral"
              style={{
                width: 48, height: 48, flexShrink: 0,
                background: 'var(--linen)', border: '1px solid var(--hairline)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 600, color: 'var(--ink)',
              }}
            >
              {room.roomNumber}
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 3 }}>Manage room</div>
              <h2 className="display" style={{ fontSize: 22, margin: 0, lineHeight: 1.1 }}>
                {TYPE_LABELS[room.type] || room.type}
              </h2>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <StatusChip status={room.status} />
            <button
              onClick={onClose}
              style={{
                background: 'none', border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                width: 32, height: 32, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'var(--ink-3)', flexShrink: 0,
              }}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Status section */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Status</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Room status</label>
                <Dropdown
                  value={status}
                  onChange={value => setStatus(value)}
                  options={statusOptions.map(s => ({ value: s, label: STATUS_CONFIG[s]?.label || s }))}
                  placeholder="Select status"
                />
                {statusOptions.length === 1 && (
                  <p style={{ fontSize: 11, color: 'var(--mute)', margin: '4px 0 0' }}>
                    Contact a manager to change status.
                  </p>
                )}
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Status note</label>
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. AC repair in progress…"
                />
              </div>
            </div>

            {/* Guest + date fields — shown when status is (or will become) occupied */}
            {status === 'occupied' && canManage && (
              <>
                <div style={{ height: 1, background: 'var(--hairline)' }} />
                <div>
                  <div className="eyebrow" style={{ marginBottom: 12 }}>Guest &amp; stay dates</div>
                  <div className="field" style={{ margin: '0 0 14px' }}>
                    <label>
                      Assign guest <span style={{ color: 'var(--terracotta)' }}>*</span>
                    </label>
                    {guestsLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--mute)', padding: '8px 0' }}>
                        <div className="spinner" style={{ width: 13, height: 13, borderWidth: 1.5 }} />
                        Loading guests…
                      </div>
                    ) : (
                      <Dropdown
                        value={guestId}
                        onChange={value => setGuestId(value)}
                        options={[
                          { value: '', label: '— Select a guest —', disabled: true },
                          ...guests.map(g => {
                            const gid = g.id || g._id;
                            return {
                              value: gid,
                              label: `${[g.firstName, g.lastName].filter(Boolean).join(' ')}${g.email ? ` · ${g.email}` : ''}`,
                            };
                          }),
                        ]}
                        placeholder="Select a guest"
                      />
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                    <div className="field" style={{ margin: 0 }}>
                      <label>Check-in date</label>
                      <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label>Check-out date</label>
                      <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} min={checkIn} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Room details section — admin/manager only */}
          {canManage && (
            <>
              <div style={{ height: 1, background: 'var(--hairline)' }} />
              <div>
                <div className="eyebrow" style={{ marginBottom: 12 }}>Rates &amp; capacity</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 14 }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label>Standard (€)</label>
                    <input type="number" value={priceStd} onChange={e => setPriceStd(e.target.value)} />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label>Peak (€)</label>
                    <input type="number" value={pricePeak} onChange={e => setPricePeak(e.target.value)} />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label>Max guests</label>
                    <input type="number" min={1} max={10} value={maxGuests} onChange={e => setMaxGuests(e.target.value)} />
                  </div>
                </div>
              </div>

              {room.amenities?.length > 0 && (
                <>
                  <div style={{ height: 1, background: 'var(--hairline)' }} />
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 12 }}>Amenities</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {room.amenities.map((a, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
                            textTransform: 'uppercase', padding: '4px 10px',
                            background: 'var(--linen)', border: '1px solid var(--hairline)',
                            color: 'var(--ink-3)',
                          }}
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-foot">
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            {canDelete && (
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--terracotta)', borderColor: 'var(--terracotta)', color: 'var(--ivory)' }}
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving}
              >
                <Icon name="trash" size={13} />Delete room
              </button>
            )}
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ opacity: saving ? 0.7 : 1 }}
          >
            {saving
              ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Saving…</>
              : <><Icon name="check" size={13} />Save changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Room Modal ───────────────────────────────────────────────────────────

function AddRoomModal({ onClose, onSaved }) {
  const toast = useToast();
  const { isMobile } = useBreakpoint();
  const [form, setForm] = useState({
    roomNumber: '', floor: '', type: 'deluxe_king',
    maxGuests: 2,
    ratesLow: '', ratesStandard: '', ratesHigh: '', ratesPeak: '',
    amenities: '',
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleCreate() {
    setSaving(true);
    try {
      await api.post('/api/rooms', {
        roomNumber: form.roomNumber,
        floor: Number(form.floor),
        type: form.type,
        maxGuests: Number(form.maxGuests),
        rates: {
          low:      Number(form.ratesLow),
          standard: Number(form.ratesStandard),
          high:     Number(form.ratesHigh),
          peak:     Number(form.ratesPeak),
        },
        amenities: form.amenities.split(',').map(s => s.trim()).filter(Boolean),
      });
      toast.success(`Room ${form.roomNumber} created.`);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Create failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>

        <div className="modal-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>Rooms</div>
            <h2 className="display" style={{ fontSize: 22, margin: 0, lineHeight: 1.1 }}>Add room</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', flexShrink: 0 }}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Room details</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Room number</label>
                <input value={form.roomNumber} onChange={e => set('roomNumber', e.target.value)} placeholder="e.g. 205" />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Floor</label>
                <input type="number" value={form.floor} onChange={e => set('floor', e.target.value)} placeholder="2" />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Type</label>
                <Dropdown
                  value={form.type}
                  onChange={value => set('type', value)}
                  options={TYPES.map(t => ({ value: t, label: TYPE_LABELS[t] }))}
                  placeholder="Select room type"
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Max guests</label>
                <input type="number" value={form.maxGuests} onChange={e => set('maxGuests', e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--hairline)' }} />

          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Seasonal rates (€/night)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {[['ratesLow','Low'],['ratesStandard','Standard'],['ratesHigh','High'],['ratesPeak','Peak']].map(([k, l]) => (
                <div className="field" style={{ margin: 0, minWidth: 0 }} key={k}>
                  <label>{l}</label>
                  <input type="number" value={form[k]} onChange={e => set(k, e.target.value)} placeholder="0" />
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--hairline)' }} />

          <div className="field" style={{ margin: 0 }}>
            <label>Amenities (comma-separated)</label>
            <input value={form.amenities} onChange={e => set('amenities', e.target.value)} placeholder="wifi, tv, minibar, bathtub" />
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}
            style={{ opacity: saving ? 0.7 : 1 }}>
            {saving
              ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 1.5, borderTopColor: 'var(--ivory)' }} />Creating…</>
              : <><Icon name="plus" size={12} />Create room</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ROOMS_QUERY_KEY = '/api/rooms?limit=200&isActive=true';

export default function RoomsPage() {
  const { user }  = useAuth();
  const toast     = useToast();
  const role      = user?.role;
  const { isMobile, isTablet } = useBreakpoint();
  const queryClient = useQueryClient();

  const canManage      = ADMIN_MGR.includes(role);
  const canChangeStatus = ADMIN_MGR.includes(role) || role === 'housekeeping' || role === 'service';
  const canDelete       = role === 'admin';

  const [filter,   setFilter]   = useState('all');
  const [managing, setManaging] = useState(null);
  const [showAdd,  setShowAdd]  = useState(false);

  const { data, loading } = useApi(ROOMS_QUERY_KEY, { staleTime: 0 });
  const rooms = data?.rooms || [];

  function onSaved() {
    setManaging(null);
    setShowAdd(false);
    queryClient.invalidateQueries({ queryKey: [ROOMS_QUERY_KEY] });
  }

  const filtered = filter === 'all' ? rooms : rooms.filter(r => r.status === filter);

  // Group by floor
  const floors = [...new Set(filtered.map(r => r.floor))].sort((a, b) => a - b);

  // Status summary counts
  const counts = rooms.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});

  const filterButtons = [
    { id: 'all',         label: `All · ${rooms.length}` },
    { id: 'occupied',    label: `Occupied · ${counts.occupied    || 0}` },
    { id: 'available',   label: `Available · ${counts.available  || 0}` },
    { id: 'cleaning',    label: `Cleaning · ${counts.cleaning    || 0}` },
    { id: 'maintenance', label: `Maint · ${counts.maintenance    || 0}` },
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Rooms</div>
          <h1 className="display">A <em>floor-by-floor</em> view.</h1>
          <p className="sub">
            Live status across {rooms.length} rooms. Updates from housekeeping and maintenance flow here in real time.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="switch" style={{ flexWrap: 'wrap' }}>
            {filterButtons.map(b => (
              <button key={b.id} className={filter === b.id ? 'active' : ''} onClick={() => setFilter(b.id)}>
                {b.label}
              </button>
            ))}
          </div>
          {canManage && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <Icon name="plus" size={12} />Add room
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ padding: 80 }}><Spinner page /></div>
      ) : !rooms.length ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
          No rooms found. {canManage && 'Add your first room to get started.'}
        </div>
      ) : !filtered.length ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
          No rooms match the selected filter.
        </div>
      ) : (
        floors.map(floor => (
          <div key={floor} style={{ marginBottom: 40 }}>
            <SectionHead
              title={`${FLOOR_NAMES[floor] || `Floor ${floor}`} floor`}
              caption={`${filtered.filter(r => r.floor === floor).length} rooms`}
            />
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : isTablet ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', gap: 16 }}>
              {filtered.filter(r => r.floor === floor).map(r => (
                <RoomCard
                  key={r.id || r._id}
                  room={r}
                  canManage={canManage}
                  canChangeStatus={canChangeStatus}
                  onManage={setManaging}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* ── Modals ── */}
      {managing && (
        <ManageModal
          room={managing}
          canManage={canManage}
          canDelete={canDelete}
          role={role}
          onClose={() => setManaging(null)}
          onSaved={onSaved}
        />
      )}
      {showAdd && (
        <AddRoomModal
          onClose={() => setShowAdd(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
