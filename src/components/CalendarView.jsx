import React, { useState, useEffect } from 'react';
import { getAllUsers, getGigsForDJ, getUnavailableDates } from '../lib/db';
import { getVenueColor, getVenueLogo } from '../lib/venueGroups';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

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
    return activeGigs.filter(g => g.date === isoForDay(d) && g.status !== 'rejected');
  }

  function isUnavail(d) {
    return activeUnavail.includes(isoForDay(d));
  }

  function unavailDJsOnDay(d) {
    const iso = isoForDay(d);
    return activeAllUnavail
      .filter(u => u.dates?.includes(iso))
      .map(u => djList.find(dj => dj.uid === u.uid)?.name)
      .filter(Boolean);
  }

  function getDayStyle(d) {
    const dayGigs   = gigsOnDay(d);
    const today     = todayStr();
    const iso       = isoForDay(d);
    const isToday   = iso === today;
    const unavail   = isUnavail(d);
    const confirmed = dayGigs.some(g => g.status === 'confirmed');
    const pending   = dayGigs.some(g => g.status === 'pending');

    let bg     = '#0a0a12';
    let border = '1px solid #1a1a28';

    if (confirmed)    { bg = '#021a10'; border = '1px solid #00ffc225'; }
    else if (pending) { bg = '#1a1000'; border = '1px solid #ffbb0025'; }
    if (!readOnly && unavail) { bg = '#1a000a'; border = '1px solid #ff407025'; }
    if (isToday)      { border = '2px solid #00ffc2'; }

    return { background: bg, border, isToday };
  }

  function handleClick(d) {
    const dayGigs    = gigsOnDay(d);
    const unavailDJs = unavailDJsOnDay(d);
    const iso        = isoForDay(d);

    if (dayGigs.length > 0 || unavailDJs.length > 0) {
      setPopup({ day: d, iso, gigs: dayGigs, unavailDJs });
      return;
    }
    if (!readOnly) {
      onToggleUnavail && onToggleUnavail(iso);
    }
  }

  return (
    <div className="cal-wrap" style={{position:'relative'}} onClick={() => setPopup(null)}>
      {/* Header */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
        <div style={{fontSize:20, fontWeight:700, color:'#ffffff'}}>{MONTHS[month]} {year}</div>
        <div style={{display:'flex', gap:8}}>
          <button onClick={prevMonth} style={{background:'#131320',border:'1px solid #2a2a40',color:'#e8e8f0',borderRadius:6,width:32,height:32,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
          <button onClick={nextMonth} style={{background:'#131320',border:'1px solid #2a2a40',color:'#e8e8f0',borderRadius:6,width:32,height:32,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
        </div>
      </div>

      {!readOnly && <p style={{fontSize:11,color:'#505070',marginBottom:12}}>Tap a free day to mark yourself unavailable. Tap again to remove.</p>}

      {loadingDJ ? (
        <div style={{textAlign:'center',padding:'40px',color:'#505070',fontSize:13}}>Loading…</div>
      ) : (
        <>
          {/* Day headers */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:3, marginBottom:3}}>
            {DAYS.map(d => (
              <div key={d} style={{fontSize:11, color:'#505070', textAlign:'center', padding:'6px 0', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600}}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:3}} onClick={e => e.stopPropagation()}>
            {Array.from({length: firstDow}, (_, i) => <div key={`e${i}`} style={{minHeight:90}} />)}
            {Array.from({length: daysInMonth}, (_, i) => {
              const d       = i + 1;
              const dayGigs = gigsOnDay(d);
              const style   = getDayStyle(d);
              const today   = todayStr();
              const iso     = isoForDay(d);
              const isPast  = iso < today;

              return (
                <div
                  key={d}
                  onClick={() => handleClick(d)}
                  style={{
                    background: style.background,
                    border: style.border,
                    borderRadius: 6,
                    padding: '8px 8px 6px',
                    minHeight: 90,
                    cursor: 'pointer',
                    userSelect: 'none',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    opacity: isPast && !dayGigs.length ? 0.5 : 1,
                  }}
                >
                  {/* Day number */}
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: style.isToday ? '#00ffc2' : isPast ? '#404060' : '#d0d0e8',
                    marginBottom: 2,
                  }}>
                    {d}
                    {style.isToday && (
                      <span style={{marginLeft:5, width:5, height:5, borderRadius:'50%', background:'#00ffc2', display:'inline-block', verticalAlign:'middle'}} />
                    )}
                  </div>

                  {/* Gigs */}
                  {dayGigs.slice(0, 3).map((g, idx) => {
                    const vc   = getVenueColor(g.venue);
                    const logo = getVenueLogo(g.venue);
                    return (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        background: g.status === 'confirmed' ? '#00ffc210' : '#ffbb0010',
                        border: `1px solid ${g.status === 'confirmed' ? '#00ffc220' : '#ffbb0020'}`,
                        borderRadius: 4,
                        padding: '3px 5px',
                      }}>
                        {logo ? (
                          <img src={logo} alt={g.venue} style={{width:16,height:16,borderRadius:3,objectFit:'cover',flexShrink:0}} onError={e=>{e.target.style.display='none';}} />
                        ) : (
                          <div style={{width:16,height:16,borderRadius:3,background:vc.bg,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <div style={{width:5,height:5,borderRadius:'50%',background:vc.color}} />
                          </div>
                        )}
                        <div style={{minWidth:0, flex:1}}>
                          <div style={{fontSize:10,fontWeight:600,color: g.status === 'confirmed' ? '#00ffc2' : '#ffbb00',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                            {showDJPicker ? `${g.djName?.split(' ')[0]}` : ''}{showDJPicker && g.venue ? ' · ' : ''}{g.venue?.split(' ')[0]}
                          </div>
                          <div style={{fontSize:9,color:'#8080a0'}}>{g.time}</div>
                        </div>
                      </div>
                    );
                  })}
                  {dayGigs.length > 3 && (
                    <div style={{fontSize:9,color:'#505070',marginTop:1}}>+{dayGigs.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Popup */}
      {popup && (
        <div
          style={{
            position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
            zIndex:200, background:'#0d0d18', border:'1px solid #2a2a40',
            borderRadius:12, padding:20, minWidth:280, maxWidth:360,
            boxShadow:'0 16px 48px #00000090',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:'#ffffff'}}>
              {popup.day} {MONTHS[month]}
            </div>
            <button onClick={() => setPopup(null)} style={{background:'transparent',border:'none',color:'#505070',fontSize:18,cursor:'pointer',lineHeight:1}}>✕</button>
          </div>

          {popup.gigs.length === 0 && popup.unavailDJs.length === 0 && (
            <div style={{fontSize:13,color:'#505070',padding:'8px 0'}}>No gigs on this day.</div>
          )}

          {popup.gigs.map((g, i) => {
            const vc   = getVenueColor(g.venue);
            const logo = getVenueLogo(g.venue);
            return (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'10px 0',
                borderBottom: i < popup.gigs.length - 1 ? '1px solid #1a1a28' : 'none',
              }}>
                {logo ? (
                  <img src={logo} alt={g.venue} style={{width:40,height:40,borderRadius:8,objectFit:'cover',flexShrink:0}} onError={e=>{e.target.style.display='none';}} />
                ) : (
                  <div style={{width:40,height:40,borderRadius:8,background:vc.bg,border:`1px solid ${vc.color}40`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:vc.color}} />
                  </div>
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#ffffff',marginBottom:2}}>{g.venue}</div>
                  {showDJPicker && <div style={{fontSize:12,color:'#8080a0',marginBottom:2}}>{g.djName}</div>}
                  <div style={{fontSize:12,color:'#d0d0e8',fontWeight:500}}>{g.time}</div>
                  {g.fee && <div style={{fontSize:13,color:'#00ffc2',fontWeight:700,marginTop:3}}>€{g.fee}</div>}
                  {g.notes && (
                    <div style={{fontSize:11,color:'#ffdd80',marginTop:5,background:'#1a1400',border:'1px solid #ffbb0030',borderRadius:4,padding:'4px 6px'}}>
                      📌 {g.notes}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize:10,fontWeight:700,
                  color: g.status === 'confirmed' ? '#00ffc2' : '#ffbb00',
                  background: g.status === 'confirmed' ? '#00ffc215' : '#ffbb0015',
                  border: `1px solid ${g.status === 'confirmed' ? '#00ffc230' : '#ffbb0030'}`,
                  borderRadius:4, padding:'2px 6px', flexShrink:0,
                }}>
                  {g.status.charAt(0).toUpperCase() + g.status.slice(1)}
                </div>
              </div>
            );
          })}

          {popup.unavailDJs.length > 0 && (
            <div style={{marginTop: popup.gigs.length > 0 ? 12 : 0, padding:'10px 12px', background:'#1a000a', border:'1px solid #ff407030', borderRadius:6}}>
              <div style={{fontSize:10,color:'#ff6090',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6,fontWeight:700}}>Unavailable</div>
              {popup.unavailDJs.map((name, i) => (
                <div key={i} style={{fontSize:12,color:'#ff607080',marginTop:2}}>· {name}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{display:'flex',gap:16,marginTop:16}}>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'#505070'}}>
          <div style={{width:10,height:10,borderRadius:2,background:'#021a10',border:'1px solid #00ffc225'}} />
          Confirmed
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'#505070'}}>
          <div style={{width:10,height:10,borderRadius:2,background:'#1a1000',border:'1px solid #ffbb0025'}} />
          Pending
        </div>
        {!readOnly && (
          <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'#505070'}}>
            <div style={{width:10,height:10,borderRadius:2,background:'#1a000a',border:'1px solid #ff407025'}} />
            Unavailable
          </div>
        )}
      </div>
    </div>
  );
}
