import React, { useState } from 'react';
import { getVenueColor } from '../../lib/venueGroups';
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

function VenueBadge({ venue }) {
  const { color, bg, group } = getVenueColor(venue);
  return (
    <div style={{display:'flex', alignItems:'center', gap:6, marginTop:3}}>
      <div style={{width:7, height:7, borderRadius:'50%', background:color, flexShrink:0}} />
      {group && <span style={{fontSize:10, color, background:bg, padding:'1px 6px', borderRadius:4, fontWeight:500}}>{group}</span>}
    </div>
  );
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

function GigRow({ g, hideFees, onInvoice }) {
  const d  = new Date(g.date + 'T12:00:00');
  const vc = getVenueColor(g.venue);
  return (
    <div className="timeline-item" style={{borderLeft:`3px solid ${vc.color}`}}>
      <div className="timeline-date">
        <div className="timeline-day" style={{color:vc.color}}>{d.getDate()}</div>
        <div className="timeline-month">{d.toLocaleDateString('en-IE',{month:'short'})}</div>
      </div>
      <div className="timeline-line" style={{background:vc.color+'40'}} />
      <div style={{flex:1}}>
        <div className="timeline-venue">{g.venue}</div>
        <VenueBadge venue={g.venue} />
        <div className="timeline-sub" style={{marginTop:4}}>{g.time} · {d.toLocaleDateString('en-IE',{weekday:'long'})}</div>
        {!hideFees && g.fee && <div style={{fontSize:12,color:'#00ffc2',fontWeight:600,marginTop:3}}>€{g.fee}</div>}
        {g.notes && <NotesBanner notes={g.notes} />}
      </div>
      {!hideFees && g.fee && (
        <button
          onClick={() => onInvoice(g)}
          style={{background:'transparent',border:'1px solid #2a2a40',color:'#9090b0',borderRadius:5,padding:'4px 10px',fontSize:11,cursor:'pointer',whiteSpace:'nowrap',alignSelf:'center'}}
        >
          🧾 Invoice
        </button>
      )}
    </div>
  );
}

export default function MyGigsTab({ myGigs, myUnavail, userUid, allGigs, hideFees, onAccept, onReject, onToggleUnavail, invoiceGig, setInvoiceGig }) {
  const [showPastGigs, setShowPastGigs] = useState(false);
  const now     = new Date();
  const today   = todayStr();

  const myConfirmed  = myGigs.filter(g => g.status === 'confirmed');
  const myPending    = myGigs.filter(g => g.status === 'pending');
  const tonightGigs  = myConfirmed.filter(g => g.date === today);
  const upcomingGigs = myConfirmed.filter(g => g.date > today);
  const pastGigs     = myConfirmed.filter(g => g.date < today).reverse();
  const nextGig      = tonightGigs.length > 0 ? tonightGigs[0] : upcomingGigs[0];

  const myMonthEarnings    = myGigs.filter(g => {
    if (g.status !== 'confirmed' || !g.fee) return false;
    const d = new Date(g.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, g) => sum + Number(g.fee), 0);

  const myUpcomingEarnings = upcomingGigs.filter(g => g.fee).reduce((sum, g) => sum + Number(g.fee), 0);

  return (
    <div className="page-body">
      <div className="stats-row" style={{marginBottom:20}}>
        <div className="stat-card"><div className="stat-label">This month</div><div className="stat-val neon">{hideFees ? '—' : `€${myMonthEarnings}`}</div></div>
        <div className="stat-card"><div className="stat-label">Upcoming total</div><div className="stat-val" style={{color:'#a080ff'}}>{hideFees ? '—' : `€${myUpcomingEarnings}`}</div></div>
        <div className="stat-card"><div className="stat-label">Confirmed</div><div className="stat-val">{upcomingGigs.length + tonightGigs.length}</div></div>
      </div>

      {/* TONIGHT banner */}
      {tonightGigs.length > 0 && (
        <div style={{background:'#1a0a00',border:'2px solid #ff990060',borderRadius:10,padding:'14px 18px',marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:'#ff9900',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:10}}>
            🎧 Tonight
          </div>
          {tonightGigs.map(g => {
            const vc = getVenueColor(g.venue);
            return (
              <div key={g.id} style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
                <div>
                  <div style={{fontSize:18,fontWeight:700,color:'#e8e8f0'}}>{g.venue}</div>
                  <VenueBadge venue={g.venue} />
                  <div style={{fontSize:13,color:'var(--text-muted)',marginTop:6}}>{g.time}</div>
                  {!hideFees && g.fee && <div style={{fontSize:13,color:'#00ffc2',fontWeight:600,marginTop:4}}>€{g.fee}</div>}
                  {g.notes && <NotesBanner notes={g.notes} />}
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:22,fontWeight:700,fontFamily:'var(--font-mono)',color:'#ff9900',lineHeight:1}}>TONIGHT</div>
                  <div style={{fontSize:10,color:'var(--text-muted)',letterSpacing:'0.1em',textTransform:'uppercase',marginTop:3}}>{g.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Next up — only show if no tonight gig */}
      {tonightGigs.length === 0 && nextGig && (
        <div className="next-gig-card" style={{borderColor: getVenueColor(nextGig.venue).color+'40'}}>
          <div style={{flex:1}}>
            <div className="next-label">Next up</div>
            <div className="next-venue">{nextGig.venue}</div>
            <VenueBadge venue={nextGig.venue} />
            <div className="next-sub" style={{marginTop:6}}>{formatDate(nextGig.date)} · {nextGig.time}</div>
            {!hideFees && nextGig.fee && <div style={{marginTop:6,fontSize:13,color:'#00ffc2',fontWeight:600}}>€{nextGig.fee}</div>}
            {nextGig.notes && <NotesBanner notes={nextGig.notes} />}
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:30,fontWeight:700,fontFamily:'var(--font-mono)',color:'#00ffc2',lineHeight:1}}>
              {Math.round((new Date(nextGig.date + 'T12:00:00') - new Date().setHours(0,0,0,0)) / 86400000)}
            </div>
            <div style={{fontSize:10,color:'var(--text-muted)',letterSpacing:'0.1em',textTransform:'uppercase',marginTop:3}}>days away</div>
          </div>
        </div>
      )}

      {tonightGigs.length === 0 && !nextGig && upcomingGigs.length === 0 && (
        <div style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:10,padding:20,marginBottom:20,textAlign:'center',color:'var(--text-muted)',fontSize:13}}>
          No upcoming confirmed gigs assigned to you yet.
        </div>
      )}

      {/* Pending */}
      {myPending.length > 0 && (
        <>
          <div className="section-title" style={{color:'#ffbb00'}}>Pending — action required</div>
          {myPending.map(g => {
            const vc = getVenueColor(g.venue);
            return (
              <div key={g.id} className="pending-card" style={{marginBottom:12,borderColor:vc.color+'40'}}>
                <div className="pending-head" style={{background:vc.bg,color:vc.color}}>⏳ Gig offer</div>
                <div className="pending-body">
                  <div className="pending-venue">{g.venue}</div>
                  <VenueBadge venue={g.venue} />
                  <div className="pending-meta" style={{marginTop:8}}>{formatDate(g.date)} · {g.time}</div>
                  {!hideFees && g.fee && <div style={{fontSize:15,color:'#00ffc2',fontWeight:700,marginBottom:10,marginTop:6}}>Fee: €{g.fee}</div>}
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

      {/* Upcoming gigs */}
      {upcomingGigs.length > 0 && (
        <>
          <div className="section-title">Upcoming gigs</div>
          <div className="panel">
            {upcomingGigs.map(g => (
              <GigRow key={g.id} g={g} hideFees={hideFees} onInvoice={setInvoiceGig} />
            ))}
          </div>
        </>
      )}

      {/* Past gigs — collapsible */}
      {pastGigs.length > 0 && (
        <div style={{marginTop:20}}>
          <button
            onClick={() => setShowPastGigs(p => !p)}
            style={{background:'transparent',border:'1px solid var(--border)',borderRadius:6,color:'var(--text-muted)',fontSize:12,padding:'6px 14px',cursor:'pointer',marginBottom:10,display:'flex',alignItems:'center',gap:6}}
          >
            {showPastGigs ? '▲' : '▼'} Past gigs ({pastGigs.length})
          </button>
          {showPastGigs && (
            <div className="panel">
              {pastGigs.map(g => (
                <GigRow key={g.id} g={g} hideFees={hideFees} onInvoice={setInvoiceGig} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="section-title" style={{marginTop:20}}>My availability</div>
      <CalendarView gigs={myGigs} unavailDates={myUnavail} onToggleUnavail={onToggleUnavail} />

      {invoiceGig && (
        <InvoiceModal
          gig={invoiceGig}
          userUid={userUid}
          allGigs={allGigs}
          onClose={() => setInvoiceGig(null)}
        />
      )}
    </div>
  );
}
