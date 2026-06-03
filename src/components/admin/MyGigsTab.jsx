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

function isNightTime(time) {
  if (!time) return false;
  const hour = parseInt(time.split(':')[0], 10);
  return hour >= 18 || hour < 6;
}

function NotesBanner({ notes }) {
  if (!notes) return null;
  return (
    <div style={{background:'#1a1400',border:'1px solid #ffbb0040',borderRadius:6,padding:'7px 10px',marginTop:8,fontSize:12,color:'#ffdd80',display:'flex',alignItems:'flex-start',gap:7}}>
      <span style={{fontSize:14,flexShrink:0}}>📌</span>
      <span>{notes}</span>
    </div>
  );
}

function TodayBanner({ gigs, hideFees }) {
  const sorted = [...gigs].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const allDay = sorted.every(g => !isNightTime(g.time));
  const label  = allDay ? '📅 Today' : '🎧 Tonight';
  const accent = allDay ? '#00ffc2' : '#ff9900';
  const bg     = allDay ? '#001a10' : '#1a0a00';
  const border = allDay ? '#00ffc240' : '#ff990060';

  return (
    <div style={{background:bg, border:`2px solid ${border}`, borderRadius:12, padding:'16px 20px', marginBottom:20}}>
      <div style={{fontSize:12,fontWeight:700,color:accent,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:14}}>{label}</div>
      {sorted.map((g, i) => {
        const vc   = getVenueColor(g.venue);
        const logo = getVenueLogo(g.venue);
        return (
          <div key={g.id} style={{display:'flex',alignItems:'center',gap:14,paddingTop:i>0?14:0,marginTop:i>0?14:0,borderTop:i>0?`1px solid ${accent}20`:'none'}}>
            {logo ? (
              <img src={logo} alt={g.venue} style={{width:54,height:54,borderRadius:10,objectFit:'cover',flexShrink:0}} onError={e=>{e.target.style.display='none';}} />
            ) : (
              <div style={{width:54,height:54,borderRadius:10,background:vc.bg,border:`1px solid ${vc.color}40`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{width:14,height:14,borderRadius:'50%',background:vc.color}} />
              </div>
            )}
            <div style={{flex:1}}>
              <div style={{fontSize:18,fontWeight:700,color:'#ffffff',marginBottom:4}}>{g.venue}</div>
              <div style={{fontSize:14,color:'#d0d0e8',fontWeight:500}}>{g.time}</div>
              {!hideFees && g.fee && <div style={{fontSize:15,color:'#00ffc2',fontWeight:700,marginTop:6}}>€{g.fee}</div>}
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
      borderLeft: isPast ? '3px solid #2a2a40' : `3px solid ${vc.color}`,
      opacity: isPast ? 0.7 : 1,
    }}>
      <div className="timeline-date">
        <div className="timeline-day" style={{color: isPast ? '#505070' : vc.color, fontSize:18, fontWeight:700}}>{d.getDate()}</div>
        <div className="timeline-month" style={{color:'#505070', fontSize:11}}>{d.toLocaleDateString('en-IE',{month:'short'})}</div>
      </div>
      <div className="timeline-line" style={{background: isPast ? '#2a2a4040' : vc.color+'40'}} />
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
          {logo && <img src={logo} alt={g.venue} style={{width:44,height:44,borderRadius:8,objectFit:'cover',flexShrink:0,opacity:isPast?0.6:1}} onError={e=>{e.target.style.display='none';}} />}
          <div>
            <div style={{fontSize:15,fontWeight:700,color: isPast ? '#8080a0' : '#ffffff'}}>{g.venue}</div>
            <div style={{fontSize:13,color:'#505070',fontWeight:500,marginTop:2}}>{g.time} · {d.toLocaleDateString('en-IE',{weekday:'long'})}</div>
          </div>
        </div>
        {!hideFees && g.fee && <div style={{fontSize:14,color: isPast ? '#506050' : '#00ffc2',fontWeight:700,marginTop:2}}>€{g.fee}</div>}
        {g.notes && <NotesBanner notes={g.notes} />}
      </div>
      {!hideFees && g.fee && (
        <button
          onClick={() => onInvoice(g)}
          style={{background:'transparent',border:'1px solid #2a2a40',color: isPast ? '#505070' : '#9090b0',borderRadius:5,padding:'4px 10px',fontSize:11,cursor:'pointer',whiteSpace:'nowrap',alignSelf:'center'}}
        >
          🧾 Invoice
        </button>
      )}
    </div>
  );
}

export default function MyGigsTab({ myGigs, myUnavail, userUid, allGigs, hideFees, onAccept, onReject, onToggleUnavail, invoiceGig, setInvoiceGig }) {
  const [subtab, setSubtab] = useState('upcoming');
  const now   = new Date();
  const today = todayStr();

  const myConfirmed  = myGigs.filter(g => g.status === 'confirmed');
  const myPending    = myGigs.filter(g => g.status === 'pending');
  const todayGigs    = myConfirmed.filter(g => g.date === today);
  const upcomingGigs = myConfirmed.filter(g => g.date > today);
  const pastGigs     = myConfirmed.filter(g => g.date < today).reverse();
  const nextGig      = upcomingGigs[0];

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
    border: `1px solid ${active ? '#00ffc250' : '#2a2a40'}`,
    background: active ? '#00ffc215' : 'transparent',
    color: active ? '#00ffc2' : '#8080a0',
    fontSize: 12, fontWeight: active ? 600 : 400,
    cursor: 'pointer', transition: 'all 0.15s',
  });

  return (
    <div className="page-body">
      <div className="stats-row" style={{marginBottom:20}}>
        <div className="stat-card"><div className="stat-label">This month</div><div className="stat-val neon">{hideFees ? '—' : `€${myMonthEarnings}`}</div></div>
        <div className="stat-card"><div className="stat-label">Upcoming total</div><div className="stat-val" style={{color:'#a080ff'}}>{hideFees ? '—' : `€${myUpcomingEarnings}`}</div></div>
        <div className="stat-card"><div className="stat-label">Confirmed</div><div className="stat-val">{upcomingGigs.length + todayGigs.length}</div></div>
      </div>

      {/* Sub-tab switcher */}
      <div style={{display:'flex', gap:6, marginBottom:20}}>
        <button style={subBtnStyle(subtab==='upcoming')}     onClick={() => setSubtab('upcoming')}>Upcoming</button>
        <button style={subBtnStyle(subtab==='history')}      onClick={() => setSubtab('history')}>
          History {pastGigs.length > 0 && <span style={{fontSize:10,color:'#8080a0'}}>({pastGigs.length})</span>}
        </button>
        <button style={subBtnStyle(subtab==='availability')} onClick={() => setSubtab('availability')}>Availability</button>
      </div>

      {/* UPCOMING */}
      {subtab === 'upcoming' && (
        <>
          {todayGigs.length > 0 && <TodayBanner gigs={todayGigs} hideFees={hideFees} />}

          {todayGigs.length === 0 && nextGig && (
            <div className="next-gig-card" style={{borderColor: getVenueColor(nextGig.venue).color+'40', marginBottom:20}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:700,color:'#8080a0',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10}}>Next up</div>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                  {getVenueLogo(nextGig.venue) && <img src={getVenueLogo(nextGig.venue)} alt={nextGig.venue} style={{width:52,height:52,borderRadius:10,objectFit:'cover'}} onError={e=>{e.target.style.display='none';}} />}
                  <div>
                    <div style={{fontSize:20,fontWeight:700,color:'#ffffff'}}>{nextGig.venue}</div>
                    <div style={{fontSize:14,color:'#d0d0e8',fontWeight:500,marginTop:3}}>{formatDate(nextGig.date)} · {nextGig.time}</div>
                  </div>
                </div>
                {!hideFees && nextGig.fee && <div style={{fontSize:16,color:'#00ffc2',fontWeight:700}}>€{nextGig.fee}</div>}
                {nextGig.notes && <NotesBanner notes={nextGig.notes} />}
              </div>
              <div style={{textAlign:'center',flexShrink:0}}>
                <div style={{fontSize:40,fontWeight:700,fontFamily:'var(--font-mono)',color:'#00ffc2',lineHeight:1}}>
                  {Math.round((new Date(nextGig.date + 'T12:00:00') - new Date().setHours(0,0,0,0)) / 86400000)}
                </div>
                <div style={{fontSize:11,color:'#8080a0',letterSpacing:'0.1em',textTransform:'uppercase',marginTop:4}}>days away</div>
              </div>
            </div>
          )}

          {todayGigs.length === 0 && !nextGig && upcomingGigs.length === 0 && (
            <div style={{background:'#0d0d18',border:'1px solid #1e1e30',borderRadius:10,padding:20,marginBottom:20,textAlign:'center',color:'#505070',fontSize:13}}>
              No upcoming confirmed gigs.
            </div>
          )}

          {myPending.length > 0 && (
            <>
              <div className="section-title" style={{color:'#ffbb00'}}>Pending — action required</div>
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
                          <div style={{fontSize:16,fontWeight:700,color:'#ffffff'}}>{g.venue}</div>
                          <div style={{fontSize:13,color:'#d0d0e8',fontWeight:500,marginTop:2}}>{formatDate(g.date)} · {g.time}</div>
                        </div>
                      </div>
                      {!hideFees && g.fee && <div style={{fontSize:15,color:'#00ffc2',fontWeight:700,marginBottom:10}}>Fee: €{g.fee}</div>}
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

          {upcomingGigs.length > 0 && (
            <>
              <div className="section-title">Upcoming gigs</div>
              <div className="panel">
                {upcomingGigs.map(g => <GigRow key={g.id} g={g} hideFees={hideFees} onInvoice={setInvoiceGig} isPast={false} />)}
              </div>
            </>
          )}
        </>
      )}

      {/* HISTORY */}
      {subtab === 'history' && (
        <>
          {pastGigs.length === 0 ? (
            <div style={{background:'#0d0d18',border:'1px solid #1e1e30',borderRadius:10,padding:20,textAlign:'center',color:'#505070',fontSize:13}}>
              No past gigs yet.
            </div>
          ) : (
            <>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div style={{fontSize:13,color:'#8080a0'}}>{pastGigs.length} completed gig{pastGigs.length !== 1 ? 's' : ''}</div>
                {!hideFees && <div style={{fontSize:13,color:'#00ffc2',fontWeight:700}}>Total earned: €{pastEarnings}</div>}
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
        <>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:700,color:'#ffffff',marginBottom:6}}>My availability</div>
            <div style={{fontSize:12,color:'#8080a0'}}>Tap a free day to mark yourself unavailable. Tap again to remove.</div>
          </div>
          <CalendarView gigs={myGigs} unavailDates={myUnavail} onToggleUnavail={onToggleUnavail} />
        </>
      )}

      {invoiceGig && (
        <InvoiceModal gig={invoiceGig} userUid={userUid} allGigs={allGigs} onClose={() => setInvoiceGig(null)} />
      )}
    </div>
  );
}
