import { useState } from 'react';
import Icon from './Icon';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const toISO = (year, month, day) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export const countNights = (checkIn, checkOut) =>
  checkIn && checkOut ? Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000) : 0;

export function fmtShortDate(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function DateRangePicker({ checkIn, checkOut, onChange, compact = false }) {
  const today = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);

  function handleDayClick(day) {
    const iso = toISO(calYear, calMonth, day);
    if (!checkIn || checkOut || iso <= checkIn) {
      onChange({ checkIn: iso, checkOut: '' });
    } else {
      onChange({ checkIn, checkOut: iso });
    }
  }

  function prevMonth() {
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); }
    else setCalMonth(m => m + 1);
  }

  const daysInMonth  = new Date(calYear, calMonth, 0).getDate();
  const firstDayOfWk = (new Date(calYear, calMonth - 1, 1).getDay() + 6) % 7;
  const cells = [
    ...Array(firstDayOfWk).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayISO = toISO(today.getFullYear(), today.getMonth() + 1, today.getDate());

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: compact ? 12 : 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={prevMonth}>
          <Icon name="arrow_left" size={10} />
        </button>
        <div className="display" style={{ fontSize: compact ? 16 : 20, fontStyle: 'italic' }}>
          {MONTHS[calMonth - 1]} {calYear}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={nextMonth}>
          <Icon name="arrow_right" size={10} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: compact ? 2 : 4 }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: compact ? 9 : 11, color: 'var(--mute)',
            letterSpacing: '0.14em', textTransform: 'uppercase', paddingBottom: 6, fontWeight: 600,
          }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const iso     = toISO(calYear, calMonth, day);
          const isEdge  = checkIn === iso || checkOut === iso;
          const inRange = checkIn && checkOut && iso > checkIn && iso < checkOut;
          const isPast  = iso < todayISO;
          return (
            <div
              key={i}
              onClick={() => !isPast && handleDayClick(day)}
              style={{
                aspectRatio: '1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontSize: compact ? 13 : 14,
                background: isEdge ? 'var(--ink)' : inRange ? 'var(--linen)' : 'transparent',
                color: isEdge ? 'var(--paper)' : inRange ? 'var(--ink)' : isPast ? 'var(--mute)' : 'var(--ink-3)',
                border: `1px solid ${isEdge ? 'var(--ink)' : inRange ? 'var(--hairline)' : 'transparent'}`,
                cursor: isPast ? 'default' : 'pointer',
                fontStyle: isEdge ? 'italic' : 'normal',
                opacity: isPast ? 0.38 : 1,
              }}
            >
              {day}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: compact ? 12 : 18, fontSize: compact ? 11 : 12, color: 'var(--mute)', fontWeight: 500 }}>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--ink)', marginRight: 6, verticalAlign: 'middle' }} />
          Arrival / Departure
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--linen)', border: '1px solid var(--hairline)', marginRight: 6, verticalAlign: 'middle' }} />
          Stay
        </span>
      </div>
    </div>
  );
}
