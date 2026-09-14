import React, { useState, useEffect } from 'react';
import { getAllUsers, getGigsForDJ, getUnavailableDates } from '../lib/db';
import { getVenueColor, getVenueLogo } from '../lib/venueGroups';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_SHORT = ['M','T','W','T','F','S','S'];

// Same palette and ordering as the gig list columns (admin first, then DJs in roster order)
const DJ_COLORS = ['#00d4aa','#a080ff','#40a0ff','#ff60c0','#ffbb00','#80d040'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 640 : false
  );
  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth <= 640); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

export default function CalendarView({ gigs = [], unavailDates = [], allUnavail = [], onToggleUnavail, readOnly = false, venueFilter = null, showDJPicker = false }) {
  const now = new Date();
  const isMobile = useIsMobile();
  const [year, setYear]             = useState(now.getFullYear());
  const [month, setMonth]           = useState(now.getMonth());
  const [selectedDJ, setSelectedDJ] = useState('all');
  const [allUsers, setAllUsers]     = useState([]);
  const [djGigs, setDjGigs]         = useState([]);
  const [djUnavail, setDjUnavail]   = useState([]);
  const [loadingDJ, setLoadingDJ]   = useState(false);
  const [popup, setPopup]           = useState(null);
  const [editMode, setEditMode]     = useState(false);

  const canEdit = !!onToggleUnavail && !readOnly;

  useEffect(() => {
    if (showDJPicker) {
      getAllUsers().then(u => {
        // Admin first, then everyone else in roster order — matches the gig list columns
        const admins = u.filter(x => x.role === 'full_admin');
        const rest   = u.filter(x => x.role !== 'full_admin');
        setAllUsers([...admins, ...rest]);
      });
    }
  }, [showDJPicker]);

  // Picker shows non-admin DJs only (admin sees their own gigs in My gigs)
  const djList = allUsers.filter(x => x.role !== 'full_admin');

  // Colour lookup for the All DJs view — keyed by uid and lowercased name
  const djColorMap = {};
  allUsers.forEach((u, i) => {
    const c = DJ_COLORS[i % DJ_COLORS.length];
    if (u.uid)  djColorMap[u.uid] = c;
    if (u.name) djColorMap[u.name.toLowerCase()] = c;
  });
  function djColorFor(g) {
    return djColorMap[g.djUid] || djColorMap[(g.djName || '').toLowerCase()] || 'var(--text-secondary)';
  }

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

  const isDJView         = showDJPicker && selectedDJ !== 'all';
  const isAllDJsView     = showDJPicker && selectedDJ === 'all';
  const activeGigs       = isDJView ? djGigs : (venueFilter ? gigs.filter(g => g.venue === venueFilter) : gigs);
  const activeUnavail    = isDJView ? djUnavail : unavailDates;
  const activeAllUnavail = isDJView ? [] : allUnavail;
  const selectedDJName   = djList.find(d => d.uid === selectedDJ)?.name;

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
    const iso       = isoForDay(d);
    const isToday   = iso === todayStr();
    const unavail   = isUnavail(d);
    const confirmed = dayGigs.some(g => g.status === 'confirmed');
    const pending   = dayGigs.some(g => g.status === 'pending');

    let bg     = 'var(--bg-base)';
    let border = '1px solid var(--border)';

    // All DJs view: keep the cell neutral so the per-DJ tile colours carry the meaning
    if (isAllDJsView) {
      if (dayGigs.length > 0) { bg = 'var(--bg-surface)'; border = '1px solid var(--border-mid)'; }
    } else {
      if (confirmed)    { bg = 'var(--ok-bg)'; border = '1px solid var(--ok-border)'; }
      else if (pending) { bg = 'var(--pending-bg)'; border = '1px solid var(--pending-border)'; }
    }
    if (unavail)      { bg = 'var(--danger-bg)'; border = '1px solid var(--danger-border)'; }
    if (isToday)      { border = '2px solid var(--neon)'; }

    return { background: bg, border, isToday, unavail };
  }

  function handleClick(d) {
    const iso = isoForDay(d);

    // Edit mode: every tap toggles availability, nothing else.
    if (editMode) {
      onToggleUnavail && onToggleUnavail(iso);
      return;
    }

    // View mode: taps only ever SHOW things — never change availability.
    const dayGigs    = gigsOnDay(d);
    const unavailDJs = unavailDJsOnDay(d);
    const unavail    = isUnavail(d);

    if (dayGigs.length > 0 || unavailDJs.length > 0 || (isDJView && unavail)) {
      setPopup({ day: d, iso, gigs: dayGigs, unavailDJs, djUnavail: isDJView && unavail });
    }
  }

  // Tile colours: All DJs view → per-DJ colour; otherwise status colour
  function tileColor(g) {
    if (isAllDJsView) return djColorFor(g);
    return g.status === 'confirmed' ? 'var(--ok)' : 'var(--pending)';
  }

  const dayLabels = isMobile ? DAYS_SHORT : DAYS;

  return (
    <div className="cal-wrap" style={{position:'relative'}} onClick={() => setPopup(null)}>

      {/* Header row */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: showDJPicker ? 12 : 20, gap:8, flexWrap:'wrap'}}>
        <div style={{fontSize: isMobile ? 17 : 20, fontWeight:700, color:'var(--text-primary)'}}>{MONTHS[month]} {year}</div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          {canEdit && (
            <button
              onClick={e => { e.stopPropagation(); setEditMode(m => !m); setPopup(null); }}
              style={{
                background: editMode ? 'var(--neon-bg)' : 'transparent',
                border: `1px solid ${editMode ? 'var(--neon-border)' : 'var(--border-mid)'}`,
                color: editMode ? 'var(--neon)' : 'var(--text-secondary)',
                borderRadius:6, padding:'6px 14px', fontSize:12, fontWeight:600, cursor:'pointer',
                whiteSpace:'nowrap',
              }}
            >
              {editMode ? '✓ Done' : '✏️ Edit availability'}
            </button>
          )}
          <button onClick={prevMonth} style={{background:'var(--bg-raised)',border:'1px solid var(--border-mid)',color:'var(--text-primary)',borderRadius:6,width:32,height:32,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
          <button onClick={nextMonth} style={{background:'var(--bg-raised)',border:'1px solid var(--border-mid)',color:'var(--text-primary)',borderRadius:6,width:32,height:32,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
        </div>
      </div>

      {/* Edit mode banner */}
      {editMode && (
        <div style={{background:'var(--pending-bg)',border:'1px solid var(--pending-border)',borderRadius:8,padding:'9px 14px',marginBottom:14,fontSize:12,color:'var(--pending)',fontWeight:600}}>
          ✏️ Editing availability — tap days to toggle unavailable, then press Done.
        </div>
      )}

      {/* DJ picker */}
      {showDJPicker && (
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap'}}>
          <span style={{fontSize:12, color:'var(--text-secondary)'}}>View:</span>
          <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
            <button
              onClick={() => setSelectedDJ('all')}
              style={{
                padding:'5px 14px', borderRadius:6, fontSize:12, cursor:'pointer',
                border: `1px solid ${selectedDJ === 'all' ? 'var(--neon-border)' : 'var(--border-mid)'}`,
                background: selectedDJ === 'all' ? 'var(--neon-bg)' : 'transparent',
                color: selectedDJ === 'all' ? 'var(--neon)' : 'var(--text-secondary)',
                fontWeight: selectedDJ === 'all' ? 600 : 400,
              }}
            >
              All DJs
            </button>
            {djList.map(dj => {
              const c = djColorMap[dj.uid] || '#a080ff';
              const active = selectedDJ === dj.uid;
              return (
                <button
                  key={dj.uid}
                  onClick={() => setSelectedDJ(dj.uid)}
                  style={{
                    padding:'5px 14px', borderRadius:6, fontSize:12, cursor:'pointer',
                    border: `1px solid ${active ? c+'50' : 'var(--border-mid)'}`,
                    background: active ? c+'15' : 'transparent',
                    color: active ? c : 'var(--text-secondary)',
                    fontWeight: active ? 600 : 400,
                    display:'flex', alignItems:'center', gap:6,
                  }}
                >
                  <span style={{width:6,height:6,borderRadius:'50%',background:c,display:'inline-block'}} />
                  {dj.name.split(' ')[0]}
                </button>
              );
            })}
          </div>
          {isDJView && !isMobile && (
            <div style={{marginLeft:'auto', fontSize:12, color:'var(--text-secondary)'}}>
              <span style={{color:'var(--danger)', fontWeight:600}}>■</span> Unavailable &nbsp;
              <span style={{color:'var(--ok)', fontWeight:600}}>■</span> Confirmed
            </div>
          )}
        </div>
      )}

      {/* DJ view info banner */}
      {isDJView && (
        <div style={{background:'var(--bg-surface)', border:'1px solid var(--border-mid)', borderRadius:8, padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
          <div style={{width:8, height:8, borderRadius:'50%', background:'#a080ff', flexShrink:0}} />
          <span style={{fontSize:13, color:'var(--text-primary)', fontWeight:600}}>{selectedDJName}</span>
          <span style={{fontSize:12, color:'var(--text-secondary)'}}>— red days = marked unavailable</span>
        </div>
      )}

      {canEdit && !editMode && !showDJPicker && (
        <p style={{fontSize:11,color:'var(--text-muted)',marginBottom:12}}>Use ✏️ Edit availability to mark days you can't play.</p>
      )}

      {loadingDJ ? (
        <div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)',fontSize:13}}>Loading…</div>
      ) : (
        <>
          <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap: isMobile ? 2 : 3, marginBottom: isMobile ? 2 : 3}}>
            {dayLabels.map((d, i) => (
              <div key={i} style={{fontSize: isMobile ? 10 : 11, color:'var(--text-muted)', textAlign:'center', padding:'6px 0', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600}}>
                {d}
              </div>
            ))}
          </div>

          <div
            style={{
              display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap: isMobile ? 2 : 3,
              outline: editMode ? '2px dashed var(--pending-border)' : 'none',
              outlineOffset: 4, borderRadius: 6,
            }}
            onClick={e => e.stopPropagation()}
          >
            {Array.from({length: firstDow}, (_, i) => <div key={`e${i}`} style={{minHeight: isMobile ? 52 : 90}} />)}
            {Array.from({length: daysInMonth}, (_, i) => {
              const d       = i + 1;
              const dayGigs = gigsOnDay(d);
              const style   = getDayStyle(d);
              const iso     = isoForDay(d);
              const isPast  = iso < todayStr();

              /* ---------- MOBILE CELL: compact, dots instead of cards ---------- */
              if (isMobile) {
                return (
                  <div
                    key={d}
                    onClick={() => handleClick(d)}
                    style={{
                      background: style.background,
                      border: style.border,
                      borderRadius: 6,
                      minHeight: 52,
                      cursor: editMode ? 'pointer' : (dayGigs.length > 0 || (isDJView && style.unavail) ? 'pointer' : 'default'),
                      userSelect: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      paddingTop: 6,
                      gap: 4,
                      opacity: isPast && !dayGigs.length && !style.unavail ? 0.4 : 1,
                    }}
                  >
                    <div style={{
                      fontSize: 12, fontWeight: 700, lineHeight: 1,
                      color: style.isToday ? 'var(--neon)' : style.unavail ? 'var(--danger)' : isPast ? 'var(--text-muted)' : 'var(--text-primary)',
                    }}>
                      {d}
                    </div>
                    {dayGigs.length > 0 && (
                      <div style={{display:'flex', gap:3, flexWrap:'wrap', justifyContent:'center', maxWidth:'90%'}}>
                        {dayGigs.slice(0, 4).map((g, idx) => (
                          <div key={idx} style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: tileColor(g),
                          }} />
                        ))}
                        {dayGigs.length > 4 && (
                          <div style={{fontSize:8, color:'var(--text-secondary)', lineHeight:'6px'}}>+</div>
                        )}
                      </div>
                    )}
                    {style.unavail && dayGigs.length === 0 && (
                      <div style={{width:6, height:6, borderRadius:'50%', background:'var(--danger)'}} />
                    )}
                  </div>
                );
              }

              /* ---------- DESKTOP CELL ---------- */
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
                    cursor: editMode ? 'pointer' : (dayGigs.length > 0 || (isDJView && style.unavail) ? 'pointer' : 'default'),
                    userSelect: 'none',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    opacity: isPast && !dayGigs.length && !style.unavail ? 0.4 : 1,
                    position: 'relative',
                  }}
                >
                  {/* Unavailable indicator for DJ view */}
                  {isDJView && style.unavail && (
                    <div style={{
                      position:'absolute', top:0, left:0, right:0, bottom:0,
                      background:'var(--danger-bg)', borderRadius:5,
                      pointerEvents:'none',
                    }} />
                  )}

                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: style.isToday ? 'var(--neon)' : style.unavail ? 'var(--danger)' : isPast ? 'var(--text-muted)' : 'var(--text-primary)',
                    marginBottom: 2,
                  }}>
                    {d}
                    {style.isToday && <span style={{marginLeft:5, width:5, height:5, borderRadius:'50%', background:'var(--neon)', display:'inline-block', verticalAlign:'middle'}} />}
                    {isDJView && style.unavail && <span style={{marginLeft:5, fontSize:9, color:'var(--danger)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em'}}>unavail</span>}
                  </div>

                  {dayGigs.slice(0, 3).map((g, idx) => {
                    const vc   = getVenueColor(g.venue);
                    const logo = getVenueLogo(g.venue);
                    const tc   = tileColor(g);
                    const isPending = g.status === 'pending';
                    return (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: tc + '12',
                        border: `1px ${isPending && isAllDJsView ? 'dashed' : 'solid'} ${tc + (isPending && isAllDJsView ? '60' : '25')}`,
                        borderRadius: 4, padding: '3px 5px',
                      }}>
                        {logo ? (
                          <img src={logo} alt={g.venue} style={{width:16,height:16,borderRadius:3,objectFit:'cover',flexShrink:0}} onError={e=>{e.target.style.display='none';}} />
                        ) : (
                          <div style={{width:16,height:16,borderRadius:3,background:vc.bg,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <div style={{width:5,height:5,borderRadius:'50%',background:vc.color}} />
                          </div>
                        )}
                        <div style={{minWidth:0, flex:1}}>
                          <div style={{fontSize:10,fontWeight:600,color:tc,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                            {isAllDJsView ? `${g.djName?.split(' ')[0]} · ` : ''}{g.venue?.split(' ').slice(0,2).join(' ')}
                          </div>
                          <div style={{fontSize:9,color:'var(--text-secondary)'}}>{g.time}{isPending && isAllDJsView ? ' · pending' : ''}</div>
                        </div>
                      </div>
                    );
                  })}
                  {dayGigs.length > 3 && (
                    <div style={{fontSize:9,color:'var(--text-muted)',marginTop:1}}>+{dayGigs.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Popup */}
      {popup && !editMode && (
        <div
          style={{
            position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
            zIndex:200, background:'var(--bg-surface)', border:'1px solid var(--border-mid)',
            borderRadius:12, padding:20,
            width: isMobile ? 'calc(100vw - 32px)' : undefined,
            minWidth: isMobile ? undefined : 280,
            maxWidth: isMobile ? 380 : 380,
            maxHeight:'75vh', overflowY:'auto',
            boxShadow:'0 16px 48px #00000090',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:'var(--text-primary)'}}>{popup.day} {MONTHS[month]}</div>
            <button onClick={() => setPopup(null)} style={{background:'transparent',border:'none',color:'var(--text-muted)',fontSize:18,cursor:'pointer',lineHeight:1,padding:'4px 8px'}}>✕</button>
          </div>

          {/* DJ unavailable banner */}
          {popup.djUnavail && (
            <div style={{background:'var(--danger-bg)',border:'1px solid var(--danger-border)',borderRadius:6,padding:'8px 12px',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:13}}>🚫</span>
              <span style={{fontSize:12,color:'var(--danger)',fontWeight:600}}>{selectedDJName} is unavailable this day</span>
            </div>
          )}

          {popup.gigs.length === 0 && !popup.djUnavail && popup.unavailDJs.length === 0 && (
            <div style={{fontSize:13,color:'var(--text-muted)',padding:'8px 0'}}>No gigs on this day.</div>
          )}

          {popup.gigs.map((g, i) => {
            const vc   = getVenueColor(g.venue);
            const logo = getVenueLogo(g.venue);
            const tc   = tileColor(g);
            return (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'10px 0',
                borderBottom: i < popup.gigs.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                {logo ? (
                  <img src={logo} alt={g.venue} style={{width:40,height:40,borderRadius:8,objectFit:'cover',flexShrink:0}} onError={e=>{e.target.style.display='none';}} />
                ) : (
                  <div style={{width:40,height:40,borderRadius:8,background:vc.bg,border:`1px solid ${vc.color}40`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:vc.color}} />
                  </div>
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:'var(--text-primary)',marginBottom:2,lineHeight:1.3}}>{g.venue}</div>
                  {isAllDJsView && (
                    <div style={{fontSize:12,color:tc,fontWeight:600,marginBottom:2,display:'flex',alignItems:'center',gap:6}}>
                      <span style={{width:7,height:7,borderRadius:'50%',background:tc,display:'inline-block'}} />
                      {g.djName}
                    </div>
                  )}
                  <div style={{fontSize:12,color:'var(--text-primary)',fontWeight:500}}>{g.time}</div>
                  {g.fee && <div style={{fontSize:13,color:'var(--money)',fontWeight:700,marginTop:3}}>€{g.fee}</div>}
                  {g.notes && (
                    <div style={{fontSize:11,color:'var(--pending)',marginTop:5,background:'var(--pending-bg)',border:'1px solid var(--pending-border)',borderRadius:4,padding:'4px 6px'}}>
                      📌 {g.notes}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize:10,fontWeight:700,
                  color: g.status === 'confirmed' ? 'var(--ok)' : 'var(--pending)',
                  background: g.status === 'confirmed' ? 'var(--ok-bg)' : 'var(--pending-bg)',
                  border: `1px solid ${g.status === 'confirmed' ? 'var(--ok-border)' : 'var(--pending-border)'}`,
                  borderRadius:4, padding:'2px 6px', flexShrink:0,
                }}>
                  {g.status.charAt(0).toUpperCase() + g.status.slice(1)}
                </div>
              </div>
            );
          })}

          {popup.unavailDJs.length > 0 && (
            <div style={{marginTop: popup.gigs.length > 0 ? 12 : 0, padding:'10px 12px', background:'var(--danger-bg)', border:'1px solid var(--danger-border)', borderRadius:6}}>
              <div style={{fontSize:10,color:'var(--danger)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6,fontWeight:700}}>Unavailable</div>
              {popup.unavailDJs.map((name, i) => (
                <div key={i} style={{fontSize:12,color:'var(--danger)',marginTop:2}}>· {name}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{display:'flex',gap:16,marginTop:16,flexWrap:'wrap'}}>
        {isAllDJsView ? (
          <>
            {allUsers.map((u, i) => (
              <div key={u.uid} style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text-muted)'}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:DJ_COLORS[i % DJ_COLORS.length]}} />
                {u.name.split(' ')[0]}
              </div>
            ))}
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text-muted)'}}>
              <div style={{width:10,height:10,borderRadius:2,border:'1px dashed var(--text-secondary)'}} />
              Pending
            </div>
          </>
        ) : (
          <>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text-muted)'}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:'var(--ok)'}} />
              Confirmed
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text-muted)'}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:'#ffbb00'}} />
              Pending
            </div>
            {(canEdit || isDJView) && (
              <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text-muted)'}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:'var(--danger)'}} />
                Unavailable
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
