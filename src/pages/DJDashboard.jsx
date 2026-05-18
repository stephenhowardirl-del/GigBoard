import React, { useEffect, useState } from 'react';
import { getGigsForDJ, updateGigStatus, getUnavailableDates, setUnavailableDates, createGigConfirmed } from '../lib/db';
import { getVenueColor } from '../lib/venueGroups';
import { useAuth } from '../hooks/useAuth';
import CalendarView from '../components/CalendarView';
import InvoiceModal from '../components/InvoiceModal';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-IE', { weekday:'short', day:'numeric', month:'short' });
}

function daysUntil(iso) {
  const today = new Date(); today.setHours(0,0,0,0);
  const gig   = new Date(iso + 'T12:00:00');
  return Math.ceil((gig - today) / 86400000);
}

function VenueBadge({ venue }) {
  const { color, bg, group } = getVenueColor(venue);
  return (
    <div style={{display:'flex', alignItems:'center', gap:6, marginTop:4}}>
      <div style={{width:8, height:8, borderRadius:'50%', background:color, flexShrink:0}} />
      {group && <span style={{fontSize:10, color, background:bg, padding:'1px 6px', borderRadius:4, fontWeight:500}}>{group}</span>}
    </div>
  );
}

function NotesBanner({ notes }) {
  if (!notes) return null;
  return (
    <div style={{
      background: '#1a1400',
      border: '1px solid #ffbb0040',
      borderRadius: 6,
      padding: '7px 10px',
      marginTop: 8,
      fontSize: 12,
      color: '#ffdd80',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 7,
    }}>
      <span style={{fontSize:14, flexShrink:0}}>📌</span>
      <span>{notes}</span>
    </div>
  );
}

function SuccessToast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: 30,
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#002a1a',
      border: '1px solid #00ffcc60',
      borderRadius: 10,
      padding: '14px 24px',
      color: '#00ffcc',
      fontSize: 14,
      fontWeight: 600,
      zIndex: 400,
      boxShadow: '0 8px 24px #00000080',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <span style={{fontSize:18}}>✓</span>
      {message}
    </div>
  );
}

function SelfAssignModal({ venues, profile, onClose, onBooked }) {
  const [venue, setVenue]   = useState(venues[0] || '');
  const [date, setDate]     = useState('');
  const [time, setTime]     = useState('');
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);

  async function handleBook() {
    if (!venue || !date || !time) return;
    setSaving(true);
    await createGigConfirmed({
      venue, date, time,
      djUid:   profile.uid,
      djName:  profile.name,
      djEmail: profile.email || '',
      notes,
      fee:        null,
      assignedBy: profile.name,
    });
    setSaving(false);
    onBooked();
    onClose();
  }

  return (
    <div style={{position:'fixed',inset:0,background:'#00000080',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#0d0d14',border:'1px solid #2a2a40',borderRadius:12,padding:28,width:'100%',maxWidth:400}} onClick={e => e.stopPropagation()}>
        <div style={{fontSize:17,fontWeight:600,color:'#e8e8f0',marginBottom:4}}>Book a gig</div>
        <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:20}}>Goes straight to confirmed.</div>

        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.07em'}}>Venue</label>
          <select value={venue} onChange={e => setVenue(e.target.value)} style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:13,padding:'8px 10px'}}>
            {venues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.07em'}}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:13,padding:'8px 10px'}} />
        </div>

        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.07em'}}>Time</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:13,padding:'8px 10px'}} />
        </div>

        <div style={{marginBottom:20}}>
          <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.07em'}}>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:13,padding:'8px 10px',resize:'vertical',fontFamily:'inherit'}} />
        </div>

        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} className="btn btn-ghost" style={{flex:1}}>Cancel</button>
          <button onClick={handleBook} disabled={!venue || !date || !time || saving} className="btn btn-primary" style={{flex:1}}>
            {saving ? 'Booking…' : 'Confirm booking'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DJDashboard() {
  const { user, profile } = useAuth();
  const [tab, setTab]                 = useState('schedule');
  const [gigs, setGigs]               = useState([]);
  const [unavail, setUnavail]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [invoiceGig, setInvoiceGig]   = useState(null);
  const [toast, setToast]             = useState(null);

  const selfAssignVenues = profile?.selfAssignVenues || [];

  async function load() {
    const [g, un] = await Promise.all([
      getGigsForDJ(profile.uid),
      getUnavailableDates(profile.uid),
    ]);
    setGigs(g);
    setUnavail(un);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAccept(gig) { await updateGigStatus(gig.id, 'confirmed'); load(); }
  async function handleReject(gig) { await updateGigStatus(gig.id, 'rejected');  load(); }
  async function handleToggleUnavail(isoDate) {
    const next = unavail.includes(isoDate) ? unavail.filter(d => d !== isoDate) : [...unavail, isoDate];
    setUnavail(next);
    await setUnavailableDates(profile.uid, next);
  }

  function handleBooked() {
    load();
    setToast('Gig booked and confirmed!');
  }

  const today             = new Date().toISOString().split('T')[0];
  const now               = new Date();
  const pending           = gigs.filter(g => g.status === 'pending');
  const confirmed         = gigs.filter(g => g.status === 'confirmed');
  const confirmedUpcoming = confirmed.filter(g => g.date >= today);
  const nextGig           = confirmedUpcoming[0];

  const monthEarnings = gigs
    .filter(g => { if (g.status !== 'confirmed' || !g.fee) return false; const d = new Date(g.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((sum, g) => sum + Number(g.fee), 0);

  const upcomingEarnings = confirmedUpcoming.filter(g => g.fee).reduce((sum, g) => sum + Number(g.fee), 0);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="subnav">
        <button className={'subnav-btn' + (tab === 'schedule' ? ' active' : '')} onClick={() => setTab('schedule')}>My schedule</button>
        <button className={'subnav-btn' + (tab === 'calendar' ? ' active' : '')} onClick={() => setTab('calendar')}>Month view</button>
        <button className={'subnav-btn' + (tab === 'pending'  ? ' active' : '')} onClick={() => setTab('pending')}>
          Pending{pending.length > 0 && <span className="notif-dot">{pending.length}</span>}
        </button>
        {selfAssignVenues.length > 0 && (
          <button className="subnav-btn" onClick={() => setShowBooking(true)} style={{color:'#00ffc2',borderBottom:'2px solid transparent'}}>
            + Book a gig
          </button>
        )}
      </div>

      {tab === 'schedule' && (
        <div className="page-body">
          <div className="stats-row" style={{marginBottom:20}}>
            <div className="stat-card"><div className="stat-label">This month</div><div className="stat-val neon">€{monthEarnings}</div></div>
            <div className="stat-card"><div className="stat-label">Upcoming total</div><div className="stat-val" style={{color:'#a080ff'}}>€{upcomingEarnings}</div></div>
            <div className="stat-card"><div className="stat-label">Confirmed gigs</div><div className="stat-val">{confirmedUpcoming.length}</div></div>
          </div>

          {nextGig ? (
            <div className="next-gig-card" style={{borderColor: getVenueColor(nextGig.venue).color + '40'}}>
              <div style={{flex:1}}>
                <div className="next-label">Next up</div>
                <div className="next-venue">{nextGig.venue}</div>
                <VenueBadge venue={nextGig.venue} />
                <div className="next-sub" style={{marginTop:6}}>{formatDate(nextGig.date)} · {nextGig.time}</div>
                {nextGig.fee && <div style={{marginTop:6,fontSize:13,color:'#00ffc2',fontWeight:600}}>€{nextGig.fee}</div>}
                {nextGig.notes && <NotesBanner notes={nextGig.notes} />}
              </div>
              <div>
                <div className="countdown-num">{daysUntil(nextGig.date)}</div>
                <div className="countdown-unit">days away</div>
              </div>
            </div>
          ) : (
            <div style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:10,padding:20,marginBottom:20,textAlign:'center',color:'var(--text-muted)',fontSize:13}}>
              No upcoming confirmed gigs. Check the Pending tab for any offers.
            </div>
          )}

          <div className="section-title">Confirmed gigs</div>
          <div className="panel">
            {confirmed.length === 0 && <div className="empty-state">No confirmed gigs yet.</div>}
            {confirmed.map(g => {
              const d  = new Date(g.date + 'T12:00:00');
              const vc = getVenueColor(g.venue);
              return (
                <div key={g.id} className="timeline-item" style={{borderLeft:`3px solid ${vc.color}`, flexWrap:'wrap'}}>
                  <div className="timeline-date">
                    <div className="timeline-day" style={{color:vc.color}}>{d.getDate()}</div>
                    <div className="timeline-month">{d.toLocaleDateString('en-IE',{month:'short'})}</div>
                  </div>
                  <div className="timeline-line" style={{background:vc.color+'40'}} />
                  <div style={{flex:1, minWidth:0}}>
                    <div className="timeline-venue">{g.venue}</div>
                    <VenueBadge venue={g.venue} />
                    <div className="timeline-sub" style={{marginTop:4}}>{g.time} · {d.toLocaleDateString('en-IE',{weekday:'long'})}</div>
                    {g.fee && <div style={{fontSize:12,color:'#00ffc2',fontWeight:600,marginTop:3}}>€{g.fee}</div>}
                    {g.notes && <NotesBanner notes={g.notes} />}
                  </div>
                  {g.fee && (
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
        </div>
      )}

      {tab === 'calendar' && (
        <CalendarView gigs={gigs} unavailDates={unavail} onToggleUnavail={handleToggleUnavail} />
      )}

      {tab === 'pending' && (
        <div className="page-body">
          {pending.length === 0 && <div className="empty-state">No pending gigs right now.</div>}
          {pending.map(g => {
            const vc = getVenueColor(g.venue);
            return (
              <div key={g.id} className="pending-card" style={{borderColor:vc.color+'40'}}>
                <div className="pending-head" style={{background:vc.bg, color:vc.color}}>⏳ Gig offer — action required</div>
                <div className="pending-body">
                  <div className="pending-venue">{g.venue}</div>
                  <VenueBadge venue={g.venue} />
                  <div className="pending-meta" style={{marginTop:8}}>{formatDate(g.date)} · {g.time}</div>
                  {g.fee && <div style={{fontSize:15,color:'#00ffc2',fontWeight:700,marginBottom:10,marginTop:6}}>Fee: €{g.fee}</div>}
                  {g.notes && <NotesBanner notes={g.notes} />}
                  <div className="pending-actions" style={{marginTop:12}}>
                    <button className="btn btn-primary" onClick={() => handleAccept(g)}>Accept</button>
                    <button className="btn btn-danger"  onClick={() => handleReject(g)}>Reject</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showBooking && (
        <SelfAssignModal
          venues={selfAssignVenues}
          profile={profile}
          onClose={() => setShowBooking(false)}
          onBooked={handleBooked}
        />
      )}

      {invoiceGig && (
        <InvoiceModal
          gig={invoiceGig}
          userUid={user.uid}
          allGigs={gigs}
          onClose={() => setInvoiceGig(null)}
        />
      )}

      {toast && (
        <SuccessToast
          message={toast}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
