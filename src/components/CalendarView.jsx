import React, { useState, useEffect } from 'react';
import { getAllUsers, getGigsForDJ, getUnavailableDates } from '../lib/db';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function CalendarView({ gigs = [], unavailDates = [], allUnavail = [], onToggleUnavail, readOnly = false, venueFilter = null, showDJPicker = false }) {
  const now = new Date();
  const [year, setYear]             = useState(now.getFullYear());
  const [month, setMonth]           = useState(now.getMonth());
  const [selectedDJ, setSelectedDJ] = useState('all');
  const [djList, setDjList]         = useState([]);
  const [djGigs, setDjGigs]         = useState([]);
  const [djUnavail, setDjUnavail]   = useState([]);
  const [loadingDJ, setLoadingDJ]   = useState(false);
  const [popup, setPopup]           = useState(null);

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

  function unavailDJsOnDay(d) {
    const iso = isoForDay(d);
    return activeAllUnavail
      .filter(u => u.dates?.includes(iso))
      .map(u => djList.find(dj => dj.uid === u.uid)?.name)
      .filter(Boolean);
  }

  function getDayStyle(d) {
    const dayGigs    = gigsOnDay(d);
    const today      = new Date();
    const isToday    = year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
    const unavail    = isUnavail(d);
    const confirmed  = dayGigs.some(g => g.status === 'confirmed');
    const pending    = dayGigs.some(g => g.status === 'pending');

    let bg     = '#0f0f1a';
    let color  = '#6060a0';
    let border = '1px solid #252538';

    if (confirmed)    { bg = '#002a1a'; color = '#00ffcc'; border = '1px solid #00ffcc50'; }
    else if (pending) { bg = '#2a1800'; color = '#ffcc00'; border = '1px solid #ffcc0050'; }

    // Only show red unavail for the DJ's own calendar (not readOnly admin view)
    if (!readOnly && unavail) { bg = '#2a0010'; color = '#ff6090'; border = '1px solid #ff407050'; }

    if (isToday) { border = '2px solid #00ffc2'; if (!confirmed) color = '#00ffc2'; }

    return { background: bg, color, border };
  }

  function handleClick(d) {
    const dayGigs     = gigsOnDay(d);
    const unavailDJs  = readOnly || showDJPicker ? unavailDJsOnDay(d) : [];
    const selfUnavail = !readOnly && isUnavail(d);

    if (dayGigs.length > 0 || unavailDJs.length > 0) {
      setPopup({ day: d, gigs: dayGigs, unavailDJs });
      return;
    }
    if (!readOnly && !selfUnavail && dayGigs.length === 0) {
      onToggleUnavail && onToggleUnavail(isoForDay(d));
      return;
    }
    if (!readOnly && selfUnavail) {
      onToggleUnavail && onToggleUnavail(isoForDay(d));
      return;
    }
  }

  const selectedDJName = djList.find(u => u.uid === selectedDJ)?.name;

  return (
    <div className="cal-wrap" style={{position:'relative'}} onClick={() => setPopup(null)}>
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
            onChange={e => { setSelectedDJ(e.target.value); setPopup(null); }}
          >
            <option value="all">All DJs — overview</option>
            {djList.map(u => <option key={u.uid} value={u.uid}>{u.name}</option>)}
          </select>
        </div>
      )}

      {!readOnly && <p className="unavail-hint">Tap a free day to mark yourself unavailable. Tap again to remove.</p>}
      {showDJPicker && selectedDJ !== 'all' && <p className="unavail-hint" style={{color:'#a080ff80'}}>Showing gigs and unavailability for {selectedDJName}</p>}
      {showDJPicker && selectedDJ === 'all' && <p className="unavail-hint">Tap a date to see gig details</p>}

      {loadingDJ ? (
        <div style={{textAlign:'center',padding:'20px',color:'var(--text-muted)',fontSize:13}}>Loading…</div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:3}} onClick={e => e.stopPropagation()}>
          {DAYS.map(d => (
            <div key={d} style={{fontSize:10,color:'#50508080',textAlign:'center',padding:'4px 0',letterSpacing:'0.05em',textTransform:'uppercase'}}>
              {d}
            </div>
          ))}
          {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} style={{height:60}} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            const dayGigs = gigsOnDay(d);
            const style = getDayStyle(d);
            return (
              <div
                key={d}
                onClick={() => handleClick(d)}
                style={{
                  ...style,
                  borderRadius: 4,
                  padding: '4px 5px',
                  height: 60,
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background 0.1s',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{fontSize:11, fontFamily:'var(--font-mono)', fontWeight:700, marginBottom:2, color: style.color}}>
                  {d}
                </div>
                {dayGigs.slice(0, 2).map((g, i) => (
                  <div key={i} style={{
                    fontSize: 9,
                    lineHeight: 1.4,
                    color: g.status === 'confirmed' ? '#00ffcc' : '#ffcc00',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {g.djName?.split(' ')[0]} · {g.venue?.split(' ')[0]}
                  </div>
                ))}
                {dayGigs.length > 2 && (
                  <div style={{fontSize:8, color:'#6060a0', marginTop:1}}>+{dayGigs.length - 2} more</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {popup && (
        <div
          style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:50,background:'#0d0d14',border:'1px solid #2a2a40',borderRadius:10,padding:16,minWidth:240,boxShadow:'0 8px 32px #00000080'}}
          onClick={e => e.stopPropagation()}
        >
          <div style={{fontSize:11,color:'#6060a0',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:10}}>
            {popup.day} {MONTHS[month]}
          </div>

          {popup.gigs.length === 0 && popup.unavailDJs.length === 0 && (
            <div style={{fontSize:13,color:'var(--text-muted)',padding:'4px 0'}}>No gigs on this day.</div>
          )}

          {popup.gigs.map((g, i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid #1e1e2e'}}>
              <div style={{width:6,height:6,borderRadius:'50%',background: g.status === 'confirmed' ? '#00ffcc' : '#ffcc00',flexShrink:0}} />
              <div>
                <div style={{fontSize:13,fontWeight:500,color:'#e8e8f0'}}>{g.djName} — {g.venue}</div>
                <div style={{fontSize:11,color:'#6060a0',fontFamily:'var(--font-mono)'}}>{g.time}{g.fee ? ` · €${g.fee}` : ''}</div>
              </div>
            </div>
          ))}

          {popup.unavailDJs.length > 0 && (
            <div style={{marginTop: popup.gigs.length > 0 ? 10 : 0, padding:'8px 10px', background:'#1a000a', border:'1px solid #ff407030', borderRadius:6}}>
              <div style={{fontSize:10,color:'#ff6090',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>Unavailable</div>
              {popup.unavailDJs.map((name, i) => (
                <div key={i} style={{fontSize:12,color:'#ff607090',marginTop:2}}>· {name}</div>
              ))}
            </div>
          )}

          <button onClick={() => setPopup(null)} style={{marginTop:12,width:'100%',padding:'6px',background:'transparent',border:'1px solid #1e1e2e',borderRadius:5,color:'#6060a0',fontSize:12,cursor:'pointer'}}>Close</button>
        </div>
      )}

      <div className="cal-legend">
        <div className="cal-legend-item"><div className="cal-legend-dot" style={{background:'#002a1a',border:'1px solid #00ffcc50'}}></div>Confirmed</div>
        <div className="cal-legend-item"><div className="cal-legend-dot" style={{background:'#2a1800',border:'1px solid #ffcc0050'}}></div>Pending</div>
        {!readOnly && <div className="cal-legend-item"><div className="cal-legend-dot" style={{background:'#2a0010',border:'1px solid #ff407050'}}></div>Unavailable (tap to toggle)</div>}
      </div>
    </div>
  );
}
