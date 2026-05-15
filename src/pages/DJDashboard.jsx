import React, { useState, useEffect } from 'react';
import { getAllUsers, getGigsForDJ, getUnavailableDates } from '../lib/db';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function CalendarView({ gigs = [], unavailDates = [], allUnavail = [], onToggleUnavail, readOnly = false, venueFilter = null, showDJPicker = false }) {
  const now = new Date();
  const [year, setYear]         = useState(now.getFullYear());
  const [month, setMonth]       = useState(now.getMonth());
  const [selectedDJ, setSelectedDJ] = useState('all');
  const [djList, setDjList]     = useState([]);
  const [djGigs, setDjGigs]     = useState([]);
  const [djUnavail, setDjUnavail] = useState([]);
  const [loadingDJ, setLoadingDJ] = useState(false);

  useEffect(() => {
    if (showDJPicker) {
      getAllUsers().then(u => setDjList(u.filter(x => x.role !== 'full_admin')));
    }
  }, [showDJPicker]);

  useEffect(() => {
    if (!showDJPicker || selectedDJ === 'all') {
      setDjGigs([]);
      setDjUnavail([]);
      return;
    }
    setLoadingDJ(true);
    Promise.all([
      getGigsForDJ(selectedDJ),
      getUnavailableDates(selectedDJ),
    ]).then(([g, u]) => {
      setDjGigs(g);
      setDjUnavail(u);
      setLoadingDJ(false);
    });
  }, [selectedDJ, showDJPicker]);

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7;

  const activeGigs       = showDJPicker && selectedDJ !== 'all' ? djGigs : (venueFilter ? gigs.filter(g => g.venue === venueFilter) : gigs);
  const activeUnavail    = showDJPicker && selectedDJ !== 'all' ? djUnavail : unavailDates;
  const activeAllUnavail = showDJPicker && selectedDJ !== 'all' ? [] : allUnavail;

  function isoForDay(d) {
    return `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  function gigsOnDay(d) {
    return activeGigs.filter(g => g.date === isoForDay(d));
  }

  function isUnavail(d) {
    return activeUnavail.includes(isoForDay(d));
  }

  function isAnyUnavail(d) {
    const iso = isoForDay(d);
    return activeAllUnavail.some(u => u.dates?.includes(iso));
  }

  function dayClass(d) {
    const classes = ['cal-day'];
    const today = new Date();
    if (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) classes.push('today');
    const dayGigs = gigsOnDay(d);
    if (dayGigs.some(g => g.status === 'confirmed')) classes.push('has-gig');
    else if (dayGigs.some(g => g.status === 'pending')) classes.push('pending-gig');
    if (isUnavail(d)) classes.push('unavail');
    if (readOnly && isAnyUnavail(d)) classes.push('unavail-admin');
    return classes.join(' ');
  }

  function handleClick(d) {
    if (readOnly) return;
    if (gigsOnDay(d).length > 0) return;
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

      {showDJPicker && (
        <div style={{marginBottom:14}}>
          <label style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:5}}>View DJ calendar</label>
          <select
            className="perm-select"
            style={{width:'100%',padding:'8px 10px',fontSize:13}}
            value={selectedDJ}
            onChange={e => setSelectedDJ(e.target.value)}
          >
            <option value="all">All gigs overview</option>
            {djList.map(u => <option key={u.uid} value={u.uid}>{u.name}</option>)}
          </select>
        </div>
      )}

      {!readOnly && <p className="unavail-hint">Tap a free day to mark yourself unavailable. Tap again to remove.</p>}
      {showDJPicker && selectedDJ !== 'all' && (
        <p className="unavail-hint" style={{color:'#a080ff80'}}>
          Showing gigs and unavailability for {djList.find(u => u.uid === selectedDJ)?.name}
        </p>
      )}

      {loadingDJ ? (
        <div style={{textAlign:'center',padding:'20px',color:'var(--text-muted)',fontSize:13}}>Loading…</div>
      ) : (
        <div className="cal-grid">
          {DAYS.map(d => <div key={d} className="cal-dow">{d}</div>)}
          {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} className="cal-day empty" />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            const dayGigs = gigsOnDay(d);
            return (
              <div key={d} className={dayClass(d)} onClick={() => handleClick(d)} title={dayGigs.map(g => `${g.djName} – ${g.venue}`).join('\n')}>
                {d}
                {dayGigs.length > 0 && <div style={{fontSize:8,marginTop:1,color:'inherit',opacity:0.75}}>{dayGigs[0].djName?.split(' ')[0]}</div>}
              </div>
            );
          })}
        </div>
      )}

      <div className="cal-legend">
        <div className="cal-legend-item"><div className="cal-legend-dot" style={{background:'#001a12',border:'1px solid #00d4aa50'}}></div>Confirmed</div>
        <div className="cal-legend-item"><div className="cal-legend-dot" style={{background:'#2a1a00',border:'1px solid #ffbb0050'}}></div>Pending</div>
        <div className="cal-legend-item"><div className="cal-legend-dot" style={{background:'#1a0008',border:'1px solid #ff407050'}}></div>Unavailable</div>
        {readOnly && <div className="cal-legend-item"><div className="cal-legend-dot" style={{background:'#1a000820',border:'1px solid #ff407030'}}></div>DJ unavailable (admin view)</div>}
      </div>
    </div>
  );
}
