import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import Icon from '../components/Icon';
import Spinner from '../components/Spinner';
import MetricTile from '../components/MetricTile';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel() {
  const now = new Date();
  const datePart = now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' });
  const timePart = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

function fmtCurrency(val) {
  if (val == null) return '—';
  return `€${Number(val).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

function getInitials(first = '', last = '') {
  return ((first[0] || '') + (last[0] || '')).toUpperCase() || '?';
}

function buildRevenueSeries(dailyRevenue14Days = []) {
  const byDate = Object.fromEntries(dailyRevenue14Days.map(d => [d.date, d.revenue]));
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    return { date: key, revenue: byDate[key] || 0 };
  });
}

function fmtShortDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────



function SectionHead({ title, caption }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
      <h2 className="display" style={{ fontSize: 28, margin: 0 }}>{title}</h2>
      {caption && <span className="eyebrow">{caption}</span>}
    </div>
  );
}

function StatusLine({ color, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: 'var(--ink-3)', flex: 1 }}>{label}</span>
      <span className="numeral" style={{ fontSize: 18 }}>{value ?? '—'}</span>
    </div>
  );
}

function OccupancyDonut({ pct, occupied, available, cleaning, maintenance, total }) {
  const r = 60, circ = 2 * Math.PI * r;
  const segments = [
    { v: occupied,    color: 'var(--terracotta)' },
    { v: cleaning,    color: 'var(--brass)' },
    { v: maintenance, color: 'var(--plum)' },
    { v: available,   color: 'var(--sage)' },
  ];
  let offset = 0;
  return (
    <div style={{ position: 'relative', width: 180, height: 180, margin: '0 auto' }}>
      <svg width="180" height="180" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--hairline-2)" strokeWidth="14" />
        {total > 0 && segments.map((s, i) => {
          const len = (s.v / total) * circ;
          const dashoffset = -offset;
          offset += len;
          return (
            <circle key={i} cx="80" cy="80" r={r} fill="none"
              stroke={s.color} strokeWidth="14"
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={dashoffset}
              transform="rotate(-90 80 80)" />
          );
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="display numeral" style={{ fontSize: 40 }}>
          {pct}<span style={{ fontSize: 18, color: 'var(--mute)' }}>%</span>
        </div>
        <div className="label" style={{ marginTop: 4 }}>Occupied</div>
      </div>
    </div>
  );
}

function RevenueChart({ series, loading }) {
  const max = Math.max(...series.map(d => d.revenue), 1);
  const hasData = series.some(d => d.revenue > 0);
  return (
    <div className="card" style={{ padding: 28 }}>
      {loading ? <Spinner page /> : hasData ? (
        <>
          <div className="bar-row">
            {series.map((d, i) => {
              const h = d.revenue > 0 ? Math.max((d.revenue / max) * 100, 4) : 1;
              return (
                <div key={i} className="bar" style={{ height: `${h}%` }}
                  title={`${d.date}: ${fmtCurrency(d.revenue)}`} />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 10, color: 'var(--mute)', letterSpacing: '0.1em' }}>
            <span>{series[0]  && fmtShortDate(series[0].date)}</span>
            <span>{series[6]  && fmtShortDate(series[6].date)}</span>
            <span>{series[13] && fmtShortDate(series[13].date)}</span>
          </div>
        </>
      ) : (
        <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mute)', fontSize: 13 }}>
          No revenue data for the last 14 days.
        </div>
      )}
    </div>
  );
}

function ArrivalsTable({ arrivals, loading, navigate }) {
  if (loading) return <div className="card" style={{ padding: 40 }}><Spinner page /></div>;
  if (!arrivals?.length) {
    return (
      <div className="t-wrap" style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
        No arrivals expected today.
      </div>
    );
  }
  return (
    <div className="t-wrap">
      <table className="t">
        <thead>
          <tr><th>Guest</th><th>Room</th><th>Nights</th><th>ETA</th><th></th></tr>
        </thead>
        <tbody>
          {arrivals.map((r) => {
            const isVIP   = r.guest?.isVIP || r.guest?.tier === 'etoile';
            const initials = getInitials(r.guest?.firstName, r.guest?.lastName);
            const fullName = [r.guest?.firstName, r.guest?.lastName].filter(Boolean).join(' ') || '—';
            return (
              <tr key={r._id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{initials}</div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{fullName}</div>
                      {isVIP && (
                        <span className="chip chip-vip" style={{ marginTop: 4 }}>
                          <Icon name="crown" size={10} />Étoile
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="numeral" style={{ fontSize: 18 }}>{r.room?.roomNumber || '—'}</td>
                <td>{r.nights ?? '—'}</td>
                <td><span className="mono">{r.eta || '—'}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('/checkin')}>
                    Check in
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const { isMobile, isTablet } = useBreakpoint();
  const firstName   = user?.name?.split(' ')[0] || 'there';

  const { data: dashData,    loading: dashLoading }    = useApi('/api/reports/dashboard');
  const { data: arrivalsData, loading: arrivalsLoading } = useApi('/api/reservations/today-arrivals');
  const { data: roomsData,   loading: roomsLoading }   = useApi('/api/rooms?limit=200');

  const metrics       = dashData?.metrics || {};
  const revenueSeries = useMemo(() => buildRevenueSeries(dashData?.dailyRevenue14Days), [dashData]);

  // Derive room status counts from the full room list
  const roomCounts = useMemo(() => {
    return (roomsData?.rooms || []).reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});
  }, [roomsData]);

  const totalRooms  = metrics.totalRooms   || roomsData?.rooms?.length || 0;
  const occupied    = roomCounts.occupied   || metrics.occupiedRooms    || 0;
  const available   = roomCounts.available  || 0;
  const cleaning    = roomCounts.cleaning   || 0;
  const maintenance = roomCounts.maintenance || 0;

  const expectedArrivals = (arrivalsData?.arrivals || []).filter(r => r.status !== 'checked-in');
  const totalArrivalCount = arrivalsData
    ? (arrivalsData.expected ?? expectedArrivals.length)
    : metrics.arrivalsToday;

  const tiles = [
  {
    label: 'Occupancy',
    value: `${metrics.occupancyPct ?? '—'}%`,
    delta: totalRooms
      ? `${totalRooms} total rooms`
      : undefined,
  },
  {
    label: 'ADR',
    value: fmtCurrency(metrics.adr),
  },
  {
    label: 'RevPAR',
    value: fmtCurrency(metrics.revpar),
  },
  {
    label: 'In-house guests',
    value: metrics.inHouseGuests ?? '—',
    delta:
      totalArrivalCount != null
        ? `${totalArrivalCount} arrivals · ${metrics.departuresToday ?? 0} departures`
        : undefined,
  },
];

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>{todayLabel()}</div>
          <h1 className="display">{greeting()}, <em>{firstName}</em>.</h1>
          <p className="sub">
            {!dashLoading && metrics.arrivalsToday != null
              ? `${metrics.arrivalsToday} arrival${metrics.arrivalsToday !== 1 ? 's' : ''} expected · ${metrics.departuresToday || 0} departing today.`
              : 'Loading today\'s schedule…'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/reservations')}>
            <Icon name="calendar" size={12} />Reservations
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/reservations')}>
            <Icon name="plus" size={12} />New reservation
          </button>
        </div>
      </div>

      {/* ── KPI tiles ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: 1,
        background: 'var(--hairline)',
        border: '1px solid var(--hairline)',
      }}>
  {tiles.map((tile, i) => (
    <MetricTile
      key={i}
      label={tile.label}
      value={tile.value}
      delta={tile.delta}
      loading={dashLoading}
    />
  ))}
</div>

      {/* ── Arrivals + Room status ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1.4fr 1fr', gap: isMobile ? 24 : 32, marginTop: 40 }}>
        <div>
          <SectionHead
            title="Today's arrivals"
            caption={`${expectedArrivals.length || metrics.arrivalsToday || 0} expected`}
          />
          <ArrivalsTable arrivals={expectedArrivals} loading={arrivalsLoading} navigate={navigate} />
        </div>

        <div>
          <SectionHead title="Room status" caption={`${totalRooms} rooms`} />
          <div className="card" style={{ padding: 24 }}>
            {roomsLoading || dashLoading
              ? <Spinner page />
              : (
                <>
                  <OccupancyDonut
                    pct={metrics.occupancyPct ?? 0}
                    occupied={occupied} available={available}
                    cleaning={cleaning} maintenance={maintenance}
                    total={totalRooms}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
                    <StatusLine color="var(--terracotta)" label="Occupied"    value={occupied} />
                    <StatusLine color="var(--sage)"       label="Available"   value={available} />
                    <StatusLine color="var(--brass)"      label="Cleaning"    value={cleaning} />
                    <StatusLine color="var(--plum)"       label="Maintenance" value={maintenance} />
                  </div>
                </>
              )}
          </div>
        </div>
      </div>

      {/* ── Revenue chart ── */}
      <div style={{ marginTop: 48 }}>
        <SectionHead title="Revenue · last 14 days" caption="€ actual" />
        <RevenueChart series={revenueSeries} loading={dashLoading} />
      </div>
    </div>
  );
}
