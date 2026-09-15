import React, { useState } from 'react';
import { getVenueColor, getVenueLogo } from '../../lib/venueGroups';
import CalendarView from '../CalendarView';
import InvoiceModal from '../InvoiceModal';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-IE', { weekday:'short', day:'numeric', month:'short' });
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDateRange(filter) {
  const today = new Date(); today.setHours(0,0,0,0);
  const dow     = (today.getDay() + 6) % 7;
  const thisMon = new Date(today); thisMon.setDate(today.getDate() - dow);
  const thisSun = new Date(thisMon); thisSun.setDate(thisMon.getDate() + 6);
  const nextMon = new Date(thisMon); nextMon.setDate(thisMon.getDate() + 7);
  const nextSun = new Date(nextMon); nextSun.setDate(nextMon.getDate() + 6);

  if (filter === 'week')     return { from: toIso(thisMon), to: toIso(thisSun) };
  if (filter === 'nextweek') return { from: toIso(nextMon), to: toIso(nextSun) };
  if (filter === 'month') {
    return { from: toIso(new Date(today.getFullYear(), today.getMonth(), 1)), to: toIso(new Date(today.getFullYear(), today.getMonth() + 1, 0)) };
  }
  if (filter === 'nextmonth') {
    return { from: toIso(new Date(today.getFullYear(), today.getMonth() + 1, 1)), to: toIso(new Date(today.getFullYear(), today.getMonth() + 2, 0)) };
  }
  if (filter === 'restofyear') {
    const start = new Date(today.getFullYear(), today.getMonth() + 2, 1);
    return { from: toIso(start), to: `${today.getFullYear()}-12-31` };
  }
  if (filter === 'all') {
    return { from: toIso(today), to: null };
  }
  return null;
}

const FILTERS = [
  { key:'week',       label:'This week' },
  { key:'nextweek',   label:'Next week' },
  { key:'month',      label:'This month' },
  { key:'nextmonth',  label:'Next month' },
  { key:'restofyear', label:'Rest of year' },
  { key:'all',        label:'All' },
];

function isNightTime(time) {
  if (!time) return false;
  const hour = parseInt(time.split(':')[0], 10);
  return hour >= 18 || hour < 6;
}

function NotesBanner({ notes }) {
  if (!notes) return null;
  return (
    <div style={{background:'var(--pending-bg)',border:'1px solid var(--pending-border)',borderRadius:6,padding:'7px 10px',marginTop:8,fontSize:12,color:'var(--pending)',display:'flex',alignItems:'flex-start',gap:7}}>
      <span style={{fontSize:14,flexShrink:0}}>📌</span>
      <span>{notes}</span>
    </div>
  );
}

function TodayBanner({ gigs, hideFees }) {
  const sorted = [...gigs].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const allDay = sorted.every(g => !isNightTime(g.time));
  const label  = allDay ? '📅 Today' : '🎧 Tonight';
  const accent = allDay ? 'var(--ok)' : '#ff9900';
  const bg     = allDay ? 'var(--ok-bg)' : 'var(--pending-bg)';
  const border = allDay ? 'var(--ok-border)' : '#ff990060';

  return (
    <div style={{background:bg, border:`2px solid ${border}`, borderRadius:12, padding:'16px 20px', marginBottom:20}}>
      <div style={{fontSize:12,fontWeight:700,color:accent,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:14}}>{label}</div>
      {sorted.map((g, i) => {
        const vc   = getVenueColor(g.venue);
        const logo = getVenueLogo(g.venue);
        return (
          <div key={g.id} style={{display:'flex',alignItems:'center',gap:14,paddingTop:i>0?14:0,marginTop:i>0?14:0,borderTop:i>0?`1px solid ${border}`:'none'}}>
            {logo ? (
              <img src={logo} alt={g.venue} style={{width:54,height:54,borderRadius:10,objectFit:'cover',flexShrink:0}} onError={e=>{e.target.style.display='none';}} />
            ) : (
              <div style={{width:54,height:54,borderRadius:10,background:vc.bg,border:`1px solid ${vc.color}40`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{width:14,height:14,borderRadius:'50%',background:vc.color}} />
              </div>
            )}
            <div style={{flex:1}}>
              <div style={{fontSize:18,fontWeight:700,color:'var(--text-primary)',marginBottom:4}}>{g.venue}</div>
              <div style={{fontSize:14,color:'var(--text-primary)',fontWeight:500}}>{g.time}</div>
              {!hideFees && g.fee && <div style={{fontSize:15,color:'var(--money)',fontWeight:700,marginTop:6}}>€{g.fee}</div>}
              {g.notes && <NotesBanner notes={g.notes} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GigRow({ g, hideFees, onInvoice, isPast }) {
  const d    = new Date(g.date + 'T12:00:00');
  const vc   = getVenueColor(g.venue);
  const logo = getVenueLogo(g.venue);
  return (
    <div className="timeline-item" style={{
      borderLeft: isPast ? '3px solid var(--border-mid)' : `3px solid ${vc.color}`,
      opacity: isPast ? 0.7 : 1,
    }}>
      <div className="timeline-date">
        <div className="timeline-day" style={{color: isPast ? 'var(--text-muted)' : vc.color, fontSize:18, fontWeight:700}}>{d.getDate()}</div>
        <div className="timeline-month" style={{color:'var(--text-muted)', fontSize:11}}>{d.toLocaleDateString('en-IE',{month:'short'})}</div>
      </div>
      <div className="timeline-line" style={{background: isPast ? 'var(--border)' : vc.color+'40'}} />
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
          {logo && <img src={logo} alt={g.venue} style={{width:44,height:44,borderRadius:8,objectFit:'cover',flexShrink:0,opacity:isPast?0.6:1}} onError={e=>{e.target.style.display='none';}} />}
          <div>
            <div style={{fontSize:15,fontWeight:700,color: isPast ? 'var(--text-secondary)' : 'var(--text-primary)'}}>{g.venue}</div>
            <div style={{fontSize:13,color:'var(--text-muted)',fontWeight:500,marginTop:2}}>{g.time} · {d.toLocaleDateString('en-IE',{weekday:'long'})}</div>
          </div>
        </div>
        {!hideFees && g.fee && <div style={{fontSize:14,color: isPast ? 'var(--money-dim)' : 'var(--money)',fontWeight:700,marginTop:2}}>€{g.fee}</div>}
        {g.notes && <NotesBanner notes={g.notes} />}
      </div>
      {!hideFees && g.fee && (
        <button
          onClick={() => onInvoice(g)}
          style={{background:'transparent',border:'1px solid var(--border-mid)',color: isPast ? 'var(--text-muted)' : 'var(--text-secondary)',borderRadius:5,padding:'4px 10px',fontSize:11,cursor:'pointer',whiteSpace:'nowrap',alignSelf:'center'}}
        >
          🧾 Invoice
        </button>
      )}
    </div>
  );
}

export default function MyGigsTab({ myGigs, myUnavail, userUid, allGigs, hideFees, onAccept, onReject, onToggleUnavail, invoiceGig, setInvoiceGig }) {
  const [subtab, setSubtab] = useState('upcoming');
  const [filter, setFilter] = useState('week');
  const now   = new Date();
  const today = todayStr();

  const myConfirmed  = myGigs.filter(g => g.status === 'confirmed');
  const myPending    = myGigs.filter(g => g.status === 'pending');
  const todayGigs    = myConfirmed.filter(g => g.date === today);
  const upcomingGigs = myConfirmed.filter(g => g.date > today);
  const pastGigs     = myConfirmed.filter(g => g.date < today).reverse();
  const nextGig      = upcomingGigs[0];

  // Filtered list for the Upcoming sub-tab
  const range = getDateRange(filter);
  const filteredUpcoming = upcomingGigs.filter(g => {
    if (!range) return true;
    if (range.from && g.date < range.from) return false;
    if (range.to && g.date > range.to) return false;
    return true;
  });

  const rangeLabel = range
    ? range.to
      ? `${formatDate(range.from)} – ${formatDate(range.to)}`
      : `${formatDate(range.from)} onwards`
    : null;

  const myMonthEarnings    = myGigs.filter(g => {
    if (g.status !== 'confirmed' || !g.fee) return false;
    const d = new Date(g.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, g) => sum + Number(g.fee), 0);

  const myUpcomingEarnings = upcomingGigs.filter(g => g.fee).reduce((sum, g) => sum + Number(g.fee), 0);
  const pastEarnings       = pastGigs.filter(g => g.fee).reduce((sum, g) => sum + Number(g.fee), 0);

  const subBtnStyle = (active) => ({
    padding: '5px 14px',
    borderRadius: 6,
    border: `1px solid ${active ? 'var(--neon-border)' : 'var(--border-mid)'}`,
    background: active ? 'var(--neon-bg)' : 'transparent',
    color: active ? 'var(--neon)' : 'var(--text-secondary)',
    fontSize: 12, fontWeight: active ? 600 : 400,
    cursor: 'pointer', transition: 'all 0.15s',
  });

  const filterBtnStyle = (active) => ({
    background: active ? 'var(--neon-bg)' : 'transparent',
    border: `1px solid ${active ? 'var(--neon-border)' : 'var(--border-mid)'}`,
    color: active ? 'var(--neon)' : 'var(--text-secondary)',
    borderRadius: 5, padding: '4px 10px', fontSize: 11,
    cursor: 'pointer', whiteSpace: 'nowrap',
  });

  const nextVc   = nextGig ? getVenueColor(nextGig.venue) : null;
  const nextLogo = nextGig ? getVenueLogo(nextGig.venue) : null;
  const daysAway = nextGig ? Math.round((new Date(nextGig.date + 'T12:00:00') - new Date(todayStr() + 'T12:00:00')) / 86400000) : 0;
  const nextUpLabel = todayGigs.length > 0 ? (todayGigs.some(g => isNightTime(g.time)) ? 'After tonight' : 'After today') : 'Next up';

  return (
    <div className="page-body">
      {/* Sub-tab switcher */}
      <div style={{display:'flex', gap:6, marginBottom:20}}>
        <button style={subBtnStyle(subtab==='upcoming')}     onClick={() => setSubtab('upcoming')}>Upcoming</button>
        <button style={subBtnStyle(subtab==='history')}      onClick={() => setSubtab('history')}>
          History {pastGigs.length > 0 && <span style={{fontSize:10,color:'var(--text-secondary)'}}>({pastGigs.length})</span>}
        </button>
        <button style={subBtnStyle(subtab==='availability')} onClick={() => setSubtab('availability')}>Availability</button>
      </div>

      {/* UPCOMING */}
      {subtab === 'upcoming' && (
        <>
          {todayGigs.length > 0 && <TodayBanner gigs={todayGigs} hideFees={hideFees} />}

          {/* Next up + stats side by side */}
          <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap',alignItems:'stretch'}}>
            {/* Next up — compact single-row banner */}
            <div style={{
              flex:'2 1 380px', minWidth:0,
              background:'var(--bg-surface)', border:`1px solid ${nextGig ? nextVc.color+'40' : 'var(--border)'}`,
              borderRadius:12, padding:'14px 18px',
              display:'flex', alignItems:'center', gap:14,
            }}>
              {nextGig ? (
                <>
                  {nextLogo ? (
                    <img src={nextLogo} alt={nextGig.venue} style={{width:46,height:46,borderRadius:9,objectFit:'cover',flexShrink:0}} onError={e=>{e.target.style.display='none';}} />
                  ) : (
                    <div style={{width:46,height:46,borderRadius:9,background:nextVc.bg,border:`1px solid ${nextVc.color}40`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <div style={{width:11,height:11,borderRadius:'50%',background:nextVc.color}} />
                    </div>
                  )}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,fontWeight:700,color:'var(--text-secondary)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:3}}>{nextUpLabel}</div>
                    <div style={{fontSize:16,fontWeight:700,color:'var(--text-primary)',lineHeight:1.3}}>{nextGig.venue}</div>
                    <div style={{fontSize:12,color:'var(--text-primary)',marginTop:2}}>
                      {formatDate(nextGig.date)} · {nextGig.time}
                      {!hideFees && nextGig.fee && <span style={{color:'var(--money)',fontWeight:700,marginLeft:8}}>€{nextGig.fee}</span>}
                    </div>
                    {nextGig.notes && <NotesBanner notes={nextGig.notes} />}
                  </div>
                  <div style={{textAlign:'center',flexShrink:0,paddingLeft:8}}>
                    <div style={{fontSize:28,fontWeight:700,fontFamily:'var(--font-mono)',color:'var(--neon)',lineHeight:1}}>{daysAway}</div>
                    <div style={{fontSize:9,color:'var(--text-secondary)',letterSpacing:'0.08em',textTransform:'uppercase',marginTop:3}}>days away</div>
                  </div>
                </>
              ) : (
                <div style={{flex:1,textAlign:'center',color:'var(--text-secondary)',fontSize:13,padding:'10px 0'}}>
                  No upcoming confirmed gigs.
                </div>
              )}
            </div>

            {/* Compact stats panel */}
            <div style={{
              flex:'1 1 220px', minWidth:200,
              background:'var(--bg-surface)', border:'1px solid var(--border)',
              borderRadius:12, padding:'12px 18px',
              display:'flex', flexDirection:'column', justifyContent:'center', gap:8,
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                <span style={{fontSize:10,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.08em'}}>This month</span>
                <span style={{fontSize:16,fontWeight:700,fontFamily:'var(--font-mono)',color:'var(--money)'}}>{hideFees ? '—' : `€${myMonthEarnings}`}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                <span style={{fontSize:10,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Upcoming total</span>
                <span style={{fontSize:16,fontWeight:700,fontFamily:'var(--font-mono)',color:'#a080ff'}}>{hideFees ? '—' : `€${myUpcomingEarnings}`}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                <span style={{fontSize:10,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Confirmed gigs</span>
                <span style={{fontSize:16,fontWeight:700,fontFamily:'var(--font-mono)',color:'var(--text-primary)'}}>{upcomingGigs.length + todayGigs.length}</span>
              </div>
            </div>
          </div>

          {myPending.length > 0 && (
            <>
              <div className="section-title" style={{color:'var(--pending)'}}>Pending — action required</div>
              {myPending.map(g => {
                const vc   = getVenueColor(g.venue);
                const logo = getVenueLogo(g.venue);
                return (
                  <div key={g.id} className="pending-card" style={{marginBottom:12,borderColor:vc.color+'40'}}>
                    <div className="pending-head" style={{background:vc.bg,color:vc.color}}>⏳ Gig offer</div>
                    <div className="pending-body">
                      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                        {logo && <img src={logo} alt={g.venue} style={{width:44,height:44,borderRadius:8,objectFit:'cover'}} onError={e=>{e.target.style.display='none';}} />}
                        <div>
                          <div style={{fontSize:16,fontWeight:700,color:'var(--text-primary)'}}>{g.venue}</div>
                          <div style={{fontSize:13,color:'var(--text-primary)',fontWeight:500,marginTop:2}}>{formatDate(g.date)} · {g.time}</div>
                        </div>
                      </div>
                      {!hideFees && g.fee && <div style={{fontSize:15,color:'var(--money)',fontWeight:700,marginBottom:10}}>Fee: €{g.fee}</div>}
                      {g.notes && <NotesBanner notes={g.notes} />}
                      <div className="pending-actions" style={{marginTop:12}}>
                        <button className="btn btn-primary" onClick={() => onAccept(g)}>Accept</button>
                        <button className="btn btn-danger" onClick={() => onReject(g)}>Reject</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Date filter pills — same as the admin gig list */}
          <div style={{display:'flex',gap:4,flexWrap:'wrap',alignItems:'center',marginBottom:12}}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={filterBtnStyle(filter === f.key)}>
                {f.label}
              </button>
            ))}
            {rangeLabel && <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:6}}>{rangeLabel}</span>}
          </div>

          {filteredUpcoming.length > 0 ? (
            <>
              <div className="section-title">Upcoming gigs ({filteredUpcoming.length})</div>
              <div className="panel">
                {filteredUpcoming.map(g => <GigRow key={g.id} g={g} hideFees={hideFees} onInvoice={setInvoiceGig} isPast={false} />)}
              </div>
            </>
          ) : (
            upcomingGigs.length > 0 && (
              <div style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:10,padding:20,textAlign:'center',color:'var(--text-muted)',fontSize:13}}>
                No gigs in this period — try another filter.
              </div>
            )
          )}
        </>
      )}

      {/* HISTORY */}
      {subtab === 'history' && (
        <>
          {pastGigs.length === 0 ? (
            <div style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:10,padding:20,textAlign:'center',color:'var(--text-muted)',fontSize:13}}>
              No past gigs yet.
            </div>
          ) : (
            <>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div style={{fontSize:13,color:'var(--text-secondary)'}}>{pastGigs.length} completed gig{pastGigs.length !== 1 ? 's' : ''}</div>
                {!hideFees && <div style={{fontSize:13,color:'var(--money)',fontWeight:700}}>Total earned: €{pastEarnings}</div>}
              </div>
              <div className="panel">
                {pastGigs.map(g => <GigRow key={g.id} g={g} hideFees={hideFees} onInvoice={setInvoiceGig} isPast={true} />)}
              </div>
            </>
          )}
        </>
      )}

      {/* AVAILABILITY */}
      {subtab === 'availability' && (
        <CalendarView gigs={myGigs} unavailDates={myUnavail} onToggleUnavail={onToggleUnavail} />
      )}

      {invoiceGig && (
        <InvoiceModal gig={invoiceGig} userUid={userUid} allGigs={allGigs} onClose={() => setInvoiceGig(null)} />
      )}
    </div>
  );
}
