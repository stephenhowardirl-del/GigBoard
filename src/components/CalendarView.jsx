import React, { useState } from 'react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function CalendarView({ gigs = [], unavailDates = [], allUnavail = [], onToggleUnavail, readOnly = false, venueFilter = null }) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Day of week for first day (Mon=0 ... Sun=6)
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;

  const filteredGigs = venueFilter
    ? gigs.filter(g => g.venue === venueFilter)
    : gigs;

  function isoForDay(d) {
    return `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  function gigsOnDay(d) {
    const iso = isoForDay(d);
    return filteredGigs.filter(g => g.date === iso);
  }

  function isUnavail(d) {
    return unavailDates.includes(isoForDay(d));
  }

  function isAnyUnavail(d) {
    const iso = isoForDay(d);
    return allUnavail.some(u => u.dates?.includes(iso));
  }

  function dayClass(d) {
    const classes = ['cal-day'];
    const today = new Date();
    if (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) classes.push('today');
    const dayGigs = gigsOnDay(d);
    if (dayGigs.some(g => g.status === 'confirmed')) classes.push('has-gig');
    else if (dayGigs.some(g => g.status === 'pending')) classes.push('pending-gig');
    if (!readOnly && isUnavail(d)) classes.push('unavail');
    if (readOnly && isAnyUnavail(d)) classes.push('unavail-admin');
    return classes.join(' ');
  }

  function handleClick(d) {
    if (readOnly) return;
    if (gigsOnDay(d).length > 0) return; // can't mark a gig day unavailable
    onToggleUnavail && onToggleUnavail(isoForDay(d));
  }

  return (
    <div className="cal-wrap">
      <div className="cal-header">
        <div className="cal-month">{MONTHS[month]} {year}</div>
        <div className="cal-nav">
          <button onClick={prevMonth}>‹</button>
          <button onClick={nextMonth}>›</button>
        </div>
      </div>

      {!readOnly && (
        <p className="unavail-hint">Tap a free day to mark yourself unavailable. Tap again to remove.</p>
      )}

      <div className="cal-grid">
        {DAYS.map(d => <div key={d} className="cal-dow">{d}</div>)}
        {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} className="cal-day empty" />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1;
          const dayGigs = gigsOnDay(d);
          return (
            <div key={d} className={dayClass(d)} onClick={() => handleClick(d)} title={dayGigs.map(g => `${g.djName} – ${g.venue}`).join('\n')}>
              {d}
              {dayGigs.length > 0 && <div style={{fontSize:8,marginTop:2,color:'inherit',opacity:0.7}}>{dayGigs[0].djName?.split(' ')[0]}</div>}
            </div>
          );
        })}
      </div>

      <div className="cal-legend">
        <div className="cal-legend-item"><div className="cal-legend-dot" style={{background:'#001a12',border:'1px solid #00d4aa50'}}></div>Confirmed</div>
        <div className="cal-legend-item"><div className="cal-legend-dot" style={{background:'#2a1a00',border:'1px solid #ffbb0050'}}></div>Pending</div>
        {!readOnly && <div className="cal-legend-item"><div className="cal-legend-dot" style={{background:'#1a0008',border:'1px solid #ff407050'}}></div>Unavailable</div>}
        {readOnly && <div className="cal-legend-item"><div className="cal-legend-dot" style={{background:'#1a000820',border:'1px solid #ff407030'}}></div>DJ unavailable</div>}
      </div>
    </div>
  );
}
