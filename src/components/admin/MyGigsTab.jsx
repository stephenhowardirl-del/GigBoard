import React from 'react';
import { getVenueColor } from '../../lib/venueGroups';
import CalendarView from '../CalendarView';
import InvoiceModal from '../InvoiceModal';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-IE', { weekday:'short', day:'numeric', month:'short' });
}

function daysUntil(iso) {
  const today = new Date(); today.setHours(0,0,0,0);
  const gig = new Date(iso + 'T12:00:00');
  return Math.ceil((gig - today) / 86400000);
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

export default function MyGigsTab({ myGigs, myUnavail, userUid, allGigs, hideFees, onAccept, onReject, onToggleUnavail, invoiceGig, setInvoiceGig }) {
  const today   = new Date().toISOString().split('T')[0];
  const now     = new Date();

  const myConfirmed         = myGigs.filter(g => g.status === 'confirmed');
  const myPending           = myGigs.filter(g => g.status === 'pending');
  const myConfirmedUpcoming = myConfirmed.filter(g => g.date >= today);
  const nextGig             = myConfirmedUpcoming[0];

  const myMonthEarnings = myGigs
    .filter(g => {
      if (g.status !== 'confirmed' || !g.fee) return false;
      const d = new Date(g.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, g) => sum + Number(g.fee), 0);

  const myUpcomingEarnings = myConfirmedUpcoming.filter(g => g.fee).reduce((sum, g) => sum + Number(g.fee), 0);

  return (
    <div className="page-body">
      <div className="stats-row" style={{marginBottom:20}}>
        <div className="stat-card"><div className="stat-label">This month</div><div className="stat-val neon">{hideFees ? '—' : `€${myMonthEarnings}`}</div></div>
        <div className="stat-card"><div className="stat-label">Upcoming total</div><div className="stat-val" style={{color:'#a080ff'}}>{hideFees ? '—' : `€${myUpcomingEarnings}`}</div></div>
        <div className="stat-card"><div className="stat-label">Confirmed</div><div className="stat-val">{myConfirmedUpcoming.length}</div></div>
      </div>

      {nextGig ? (
        <div className="next-gig-card" style={{borderColor: getVenueColor(nextGig.venue).color+'40'}}>
          <div style={{flex:1}}>
            <div className="next-label">Next up</div>
            <div className="next-venue">{nextGig.venue}</div>
            <VenueBadge venue={nextGig.venue} />
            <div className="next-sub" style={{marginTop:6}}>{formatDate(nextGig.date)} · {nextGig.time}</div>
            {!hideFees && nextGig.fee && <div style={{marginTop:6,fontSize:13,color:'#00ffc2',fontWeight:600}}>€{nextGig.fee}</div>}
            {nextGig.notes && <NotesBanner notes={nextGig.notes} />}
          </div>
          <div>
            <div className="countdown-num">{daysUntil(nextGig.date)}</div>
            <div className="countdown-unit">days away</div>
          </div>
        </div>
      ) : (
        <div style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:10,padding:20,marginBottom:20,textAlign:'center',color:'var(--text-muted)',fontSize:13}}>
          No upcoming confirmed gigs assigned to you yet.
        </div>
      )}

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

      <div className="section-title">Confirmed gigs</div>
      <div className="panel">
        {myConfirmed.length === 0 && <div className="empty-state">No confirmed gigs yet.</div>}
        {myConfirmed.map(g => {
          const d  = new Date(g.date + 'T12:00:00');
          const vc = getVenueColor(g.venue);
          return (
            <div key={g.id} className="timeline-item" style={{borderLeft:`3px solid ${vc.color}`}}>
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
                  onClick={() => setInvoiceGig(g)}
                  style={{background:'transparent',border:'1px solid #2a2a40',color:'#9090b0',borderRadius:5,padding:'4px 10px',fontSize:11,cursor:'pointer',whiteSpace:'nowrap',alignSelf:'center'}}
                >
                  🧾 Invoice
                </button>
              )}
            </div>
          );
        })}
      </div>

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
