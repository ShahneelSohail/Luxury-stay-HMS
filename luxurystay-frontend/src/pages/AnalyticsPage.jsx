import { useState, useMemo } from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart,
} from 'recharts';
import { useApi } from '../hooks/useApi';
import Spinner from '../components/Spinner';
import Icon from '../components/Icon';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(val) {
  if (val == null) return '—';
  if (val >= 1_000_000) return `€${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000)     return `€${(val / 1_000).toFixed(1)}k`;
  return `€${Number(val).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

function fmtPct(val) {
  if (val == null) return '—';
  return `${Number(val).toFixed(1)}%`;
}

function currentQuarter() {
  const m = new Date().getMonth();
  return `Q${Math.floor(m / 3) + 1} ${new Date().getFullYear()}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Mini({ label, value }) {
  return (
    <div style={{ background: 'var(--paper)', padding: '20px 24px' }}>
      <div className="label" style={{ marginBottom: 8 }}>{label}</div>
      <div className="display numeral" style={{ fontSize: 36, lineHeight: 1 }}>{value ?? '—'}</div>
    </div>
  );
}

function SectionHead({ title, caption }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
      <h2 className="display" style={{ fontSize: 28, margin: 0 }}>{title}</h2>
      {caption && <span className="eyebrow">{caption}</span>}
    </div>
  );
}

function Legend({ color, label, dashed }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--ink-3)' }}>
      <div style={{ width: 24, height: 2, background: dashed ? 'transparent' : color, borderTop: dashed ? `1px dashed ${color}` : 'none' }} />
      <span>{label}</span>
    </div>
  );
}

// ─── Shared chart styles ──────────────────────────────────────────────────────

const CHART_TICK  = { fontSize: 10, fill: '#a09880', fontFamily: 'monospace' };
const CHART_GRID  = { stroke: '#e8e2d8', strokeDasharray: '3 5' };

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--hairline)', padding: '8px 12px', fontSize: 11, fontFamily: 'monospace' }}>
      <div style={{ color: 'var(--mute)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: 'var(--ink)', fontWeight: 600 }}>
          {formatter ? formatter(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

// ─── Revenue Bar Chart ────────────────────────────────────────────────────────

function RevenueBarChart({ series }) {
  const data = series.map(d => {
    const date = new Date(d.date || d.period || '');
    return {
      label: isNaN(date) ? (d.period || '') : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      revenue: d.revenue || 0,
    };
  });

  const step = Math.ceil(data.length / 6);

  return (
    <div style={{ padding: '20px 16px 8px' }}>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barCategoryGap="30%">
          <CartesianGrid vertical={false} {...CHART_GRID} />
          <XAxis dataKey="label" tick={CHART_TICK} tickLine={false} axisLine={false}
            interval={step - 1} />
          <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} tickFormatter={v => fmtCurrency(v)} width={52} />
          <Tooltip content={<ChartTooltip formatter={fmtCurrency} />} cursor={{ fill: 'var(--linen)' }} wrapperStyle={{ transition: 'none' }} />
          <Bar dataKey="revenue" fill="var(--ink)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Occupancy Line Chart ─────────────────────────────────────────────────────

function OccupancyLineChart({ series }) {
  if (!series.length) return (
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mute)', fontSize: 12 }}>
      No data
    </div>
  );

  const data = series.map(d => {
    const raw = d.date || d.period || '';
    return { label: raw.length === 10 ? raw.slice(5) : raw, occ: d.occupancyPct || 0 };
  });

  const step = Math.ceil(data.length / 6);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--brass)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--brass)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...CHART_GRID} />
        <XAxis dataKey="label" tick={CHART_TICK} tickLine={false} axisLine={false} interval={step - 1} />
        <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]} tickFormatter={v => `${v}%`} width={36} />
        <Tooltip content={<ChartTooltip formatter={v => `${Number(v).toFixed(1)}%`} />} wrapperStyle={{ transition: 'none' }} />
        <Area type="monotone" dataKey="occ" stroke="var(--ink)" strokeWidth={2}
          fill="url(#occGrad)" dot={{ r: 3, fill: 'var(--ink)', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: 'var(--brass-deep)' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Bar row ──────────────────────────────────────────────────────────────────

function BarRow({ label, value, pct, color = 'var(--brass)', suffix = '' }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 13 }}>{label}</span>
        <span className="numeral" style={{ fontSize: 16 }}>{value}{suffix}</span>
      </div>
      <div style={{ height: 4, background: 'var(--hairline-2)', position: 'relative', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function TableRow({ label, values, border = true }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: border ? '1px solid var(--hairline-2)' : 'none', fontSize: 12 }}>
      <span style={{ color: 'var(--ink)', flex: 2 }}>{label}</span>
      {values.map((v, i) => (
        <span key={i} className="numeral" style={{ flex: 1, textAlign: 'right', color: i === 0 ? 'var(--ink)' : 'var(--mute)' }}>{v}</span>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('month');
  const { isMobile, isTablet } = useBreakpoint();

  // Parallel API calls
  const { data: dashData, loading: dashLoading }   = useApi('/api/reports/dashboard');
  const { data: revData,  loading: revLoading }    = useApi(`/api/reports/revenue?period=${period}`, { deps: [period] });
  const { data: occData,  loading: occLoading }    = useApi(`/api/reports/occupancy?period=${period}`, { deps: [period] });
  const { data: roomData, loading: roomLoading }   = useApi('/api/reports/room-performance');
  const { data: guestData, loading: guestLoading } = useApi('/api/reports/guests');

  const metrics    = dashData?.metrics    || {};
  const revSeries  = revData?.series      || [];
  const occSeries  = occData?.series      || [];
  const roomPerf   = roomData?.performance || [];
  const guestStats = guestData            || {};

  const revByCategory = revData?.byCategory || [];
  const sources       = guestStats.sources       || [];
  const nationalities = guestStats.nationalities || [];

  const loading = dashLoading || revLoading;

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Analytics · {currentQuarter()}</div>
          <h1 className="display">Patterns, <em>by season.</em></h1>
          <p className="sub">
            {metrics.occupancyPct != null
              ? `Current occupancy ${metrics.occupancyPct}% · ADR ${fmtCurrency(metrics.adr)} · RevPAR ${fmtCurrency(metrics.revpar)}.`
              : 'Loading performance metrics…'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="switch">
            {[{ id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }, { id: 'year', label: 'Year' }].map(p => (
              <button key={p.id} className={period === p.id ? 'active' : ''} onClick={() => setPeriod(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 1, background: 'var(--hairline)', border: '1px solid var(--hairline)', marginBottom: 32 }}>
        {dashLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ background: 'var(--paper)', padding: '20px 24px', height: 88 }} />)
        ) : (
          <>
            <Mini label="Total revenue · YTD" value={fmtCurrency(metrics.revenueYTD)} />
            <Mini label="Avg. occupancy"       value={fmtPct(metrics.occupancyPct)} />
            <Mini label="ADR"                  value={fmtCurrency(metrics.adr)} />
            <Mini label="RevPAR"               value={fmtCurrency(metrics.revpar)} />
          </>
        )}
      </div>

      {/* ── Revenue chart + category breakdown ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1.6fr 1fr', gap: isMobile ? 20 : 32, marginBottom: 36 }}>
        <div>
          <SectionHead title="Revenue trend" caption={`by ${period}`} />
          <div className="card" style={{ minHeight: 220 }}>
            {revLoading
              ? <div style={{ padding: 60 }}><Spinner page /></div>
              : revSeries.length
                ? <RevenueBarChart series={revSeries} />
                : <div style={{ padding: '40px 28px', textAlign: 'center', color: 'var(--mute)', fontSize: 12 }}>No revenue data for this period.</div>
            }
          </div>
        </div>

        <div>
          <SectionHead title="Revenue by category" caption="this period" />
          <div className="card" style={{ padding: 28 }}>
            {revLoading
              ? <Spinner />
              : revByCategory.length
                ? revByCategory.map((row, i) => (
                    <BarRow
                      key={i}
                      label={row.label}
                      value={fmtCurrency(row.amount)}
                      pct={row.pct}
                      color={['var(--ink)', 'var(--brass)', 'var(--sage)', 'var(--terracotta)', 'var(--mute-2)'][i % 5]}
                    />
                  ))
                : <div style={{ fontSize: 12, color: 'var(--mute)', paddingTop: 8 }}>No data for this period.</div>
            }
          </div>
        </div>
      </div>

      {/* ── Occupancy line chart ── */}
      <div style={{ marginBottom: 36 }}>
        <SectionHead title="Occupancy trend" caption={`by ${period}`} />
        <div className="card" style={{ padding: '20px 16px 16px' }}>
          {occLoading
            ? <div style={{ padding: 40 }}><Spinner page /></div>
            : occSeries.length
              ? (
                <>
                  <OccupancyLineChart series={occSeries} />
                  <div style={{ display: 'flex', gap: 24, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--hairline-2)' }}>
                    <Legend color="var(--ink)" label={`${period} occupancy`} />
                  </div>
                </>
              )
              : <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--mute)', fontSize: 12 }}>No occupancy data for this period.</div>
          }
        </div>
      </div>

      {/* ── Bottom 3 cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 20 }}>

        {/* Room performance */}
        <div className="card" style={{ padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Top room types</div>
          {roomLoading
            ? <Spinner />
            : roomPerf.length
              ? roomPerf.slice(0, 5).map((r, i) => (
                  <TableRow
                    key={i}
                    label={r.type?.replace('_', ' ') || r.roomType || '—'}
                    values={[fmtPct(r.occupancyPct || r.occupancy), fmtCurrency(r.adr || r.avgRate)]}
                    border={i < Math.min(roomPerf.length, 5) - 1}
                  />
                ))
              : <div style={{ fontSize: 12, color: 'var(--mute)', paddingTop: 8 }}>No stay data for this period.</div>
          }
        </div>

        {/* Booking sources */}
        <div className="card" style={{ padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Booking source</div>
          {guestLoading
            ? <Spinner />
            : sources.length
              ? sources.map((s, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span>{s.label}</span>
                      <span className="mono">{s.pct != null ? `${s.pct}%` : s.count}</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--hairline-2)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${s.pct || 0}%`, background: 'var(--brass)', borderRadius: 2 }} />
                    </div>
                  </div>
                ))
              : <div style={{ fontSize: 12, color: 'var(--mute)', paddingTop: 8 }}>No booking data yet.</div>
          }
        </div>

        {/* Guest origin */}
        <div className="card" style={{ padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Guest origin</div>
          {guestLoading
            ? <Spinner />
            : nationalities.length
              ? nationalities.slice(0, 5).map((n, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < Math.min(nationalities.length, 5) - 1 ? '1px solid var(--hairline-2)' : 'none', fontSize: 12 }}>
                    <span>{n.nationality || '—'}</span>
                    <span className="mono">{n.pct != null ? `${n.pct}%` : n.count}</span>
                  </div>
                ))
              : <div style={{ fontSize: 12, color: 'var(--mute)', paddingTop: 8 }}>No nationality data yet.</div>
          }
        </div>
      </div>
    </div>
  );
}
