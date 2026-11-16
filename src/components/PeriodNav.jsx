import React from 'react';

// Shared period navigation for gig lists: Week | Month | All segmented
// control, with ‹ › arrows to step through periods and a Today reset.
// This is the single source of truth for date-range filtering — GigList,
// MyGigsTab and DJDashboard all use it.

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtShort(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-IE', { day:'numeric', month:'short' });
}

// mode: 'week' | 'month' | 'all'; offset: whole periods from the current one
// (0 = this week/month, -1 = last, 1 = next...). 'all' ignores offset.
export function getPeriodRange(mode, offset) {
  const today = new Date(); today.setHours(12, 0, 0, 0);

  if (mode === 'all') {
    return { from: todayStr(), to: null, label: `${fmtShort(todayStr())} onwards` };
  }

  if (mode === 'week') {
    const dow = (today.getDay() + 6) % 7;
    const mon = new Date(today); mon.setDate(today.getDate() - dow + offset * 7);
    const sun = new Date(mon);   sun.setDate(mon.getDate() + 6);
    return { from: toIso(mon), to: toIso(sun), label: `${fmtShort(toIso(mon))} – ${fmtShort(toIso(sun))}` };
  }

  // month
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const last  = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);
  return { from: toIso(first), to: toIso(last), label: `${MONTHS[first.getMonth()]} ${first.getFullYear()}` };
}

const MODES = [
  { key: 'week',  label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'all',   label: 'All' },
];

export default function PeriodNav({ mode, offset, onChange }) {
  const range = getPeriodRange(mode, offset);

  const segStyle = (active, first, last) => ({
    background: active ? 'var(--neon-bg)' : 'transparent',
    border: `1px solid ${active ? 'var(--neon-border)' : 'var(--border-mid)'}`,
    color: active ? 'var(--neon)' : 'var(--text-secondary)',
    padding: '4px 12px', fontSize: 11, fontWeight: active ? 600 : 400,
    cursor: 'pointer', whiteSpace: 'nowrap',
    borderRadius: first ? '5px 0 0 5px' : last ? '0 5px 5px 0' : 0,
    marginLeft: first ? 0 : -1,
  });

  const arrowStyle = {
    background: 'transparent', border: '1px solid var(--border-mid)',
    color: 'var(--text-secondary)', borderRadius: 5,
    width: 26, height: 26, fontSize: 14, lineHeight: 1,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, flexShrink: 0,
  };

  return (
    <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
      <div style={{display:'flex'}}>
        {MODES.map((m, i) => (
          <button key={m.key} onClick={() => onChange(m.key, 0)} style={segStyle(mode === m.key, i === 0, i === MODES.length - 1)}>
            {m.label}
          </button>
        ))}
      </div>

      {mode !== 'all' && (
        <div style={{display:'flex', alignItems:'center', gap:4}}>
          <button title={`Previous ${mode}`} onClick={() => onChange(mode, offset - 1)} style={arrowStyle}>‹</button>
          <button title={`Next ${mode}`}     onClick={() => onChange(mode, offset + 1)} style={arrowStyle}>›</button>
          {offset !== 0 && (
            <button onClick={() => onChange(mode, 0)} style={{...arrowStyle, width:'auto', padding:'0 10px', fontSize:11}}>
              Today
            </button>
          )}
        </div>
      )}

      <span style={{fontSize:15, fontWeight:700, color: offset === 0 || mode === 'all' ? 'var(--text-primary)' : 'var(--neon)', whiteSpace:'nowrap'}}>
        {range.label}
      </span>
    </div>
  );
}
