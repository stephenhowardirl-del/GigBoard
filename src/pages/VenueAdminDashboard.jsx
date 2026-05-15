import React, { useEffect, useState } from 'react';
import { getGigsForVenue, getGigsForDJ, createGig, updateGigStatus, getUnavailableDates, setUnavailableDates } from '../lib/db';
import { addGigToCalendar, removeGigFromCalendar } from '../lib/calendar';
import { useAuth } from '../hooks/useAuth';
import CalendarView from '../components/CalendarView';
import AssignGigModal from '../components/AssignGigModal';

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

export default function VenueAdminDashboard() {
  const { profile, accessToken } = useAuth();
  const venue = profile?.venueScope;

  const [tab, setTab]           = useState('list');
  const [venueGigs, setVenueGigs] = useState([]);
  const [myGigs, setMyGigs]     = useState([]);
  const [unavail, setUnavail]   = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading]   = useState(true);

  async function load() {
    const [vg, mg, un] = await Promise.all([
      getGigsForVenue(venue),
      getGigsForDJ(profile.uid),
      getUnavailableDates(profile.uid),
    ]);
    setVenueGigs(vg);
    setMyGigs(mg);
    setUnavail(un);
    setLoading(false);
  }

  useEffect(() => { if (venue) load(); }, [venue]);

  async function handleAssign(gigData) {
    await createGig({ ...gigData, assignedBy: profile.name });
    load();
  }

  async function handleAccept(gig) {
    try {
      let calId = null;
      if (accessToken) {
        calId = await addGigToCalendar(accessToken, gig);
      }
      await updateGigStatus(gig.id, 'confirmed', calId);
      load();
    } catch (e) {
      console.error('Calendar error:', e);
      await updateGigStatus(gig.id, 'confirmed');
      load();
    }
  }

  async function handleReject(gig) {
    if (gig.calendarEventId && accessToken) {
      await removeGigFromCalendar(accessToken, gig.calendarEventId);
    }
    await updateGigStatus(gig.id, 'rejected');
    load();
  }

  async function handleToggleUnavail(isoDate) {
    const next = unavail.includes(isoDate)
      ? unavail.filter(d => d !== isoDate)
      : [...unavail, isoDate];
    setUnavail(next);
    await setUnavailableDates(profile.uid, next);
  }

  const pendingMyGigs   = myGigs.filter(g => g.status === 'pending');
  const confirmedMyGigs = myGigs.filter(g => g.status === 'confirmed' && g.date >= new Date().toISOString().split('T')[0]);
  const nextGig = confirmedMyGigs[0];

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <>
      <div className="subnav">
        <button className={`subnav-btn${tab==='list'?' active':''}`} onClick={() => setTab('list')}>Venue gigs</button>
        <button className={`subnav-btn${tab==='calendar'?' active':''}`} onClick={() => setTab('calendar')}>Month view</button>
        <button className={`subnav-btn${tab==='schedule'?' active':''}`} onClick={() => setTab('schedule')}>My schedule</button>
        <button className={`subnav-btn${tab==='pending'?' active':''}`} onClick={() => setTab('pending')}>
          Pending{pendingMyGigs.length > 0 && <span className="notif-dot">{pendingMyGigs.length}</span>}
        </button>
      </div>

      {tab === 'list' && (
        <div className="page-body">
          <div className="venue-banner">📍 You can only assign gigs at <strong style={{marginLeft:4}}>{venue}</strong></div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Assign gig at {venue}</button>
          </div>
          <div className="panel">
            <div className="panel-head">{venue} — upcoming gigs</div>
            {venueGigs.length === 0 && <div className="empty-state">No gigs at {venue} yet.</div>}
            {venueGigs.map(g => (
              <div key={g.id} className="gig-row">
                <div className="gig-dot" style={{background:'#40a0ff'}} />
                <div className="gig-info">
                  <div className="gig-venue">{g.venue}</div>
                  <div className="gig-meta">{formatDate(g.date)} · {g.time}</div>
                </div>
                <span className="dj-tag" style={{background:'#001020',color:'#40a0ff',marginRight:6}}>{g.djName?.split(' ')[0]}</span>
                <span className={`badge badge-${g.status}`}>{g.status.charAt(0).toUpperCase()+g.status.slice(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <CalendarView gigs={venueGigs} unavailDates={unavail} onToggleUnavail={handleToggleUnavail} venueFilter={venue} />
      )}

      {tab === 'schedule' && (
        <div className="page-body">
          {nextGig && (
            <div className="next-gig-card">
              <div style={{flex:1}}>
                <div className="next-label">Next gig</div>
                <div className="next-venue">{nextGig.venue}</div>
                <div className="next-sub">{formatDate(nextGig.date)} · {nextGig.time}</div>
              </div>
              <div>
                <div className="countdown-num">{daysUntil(nextGig.date)}</div>
                <div className="countdown-unit">days away</div>
              </div>
            </div>
          )}
          <div className="section-title">Confirmed gigs</div>
          <div className="panel">
            {confirmedMyGigs.length === 0 && <div className="empty-state">No confirmed gigs yet.</div>}
            {confirmedMyGigs.map(g => {
              const d = new Date(g.date + 'T12:00:00');
              return (
                <div key={g.id} className="timeline-item">
                  <div className="timeline-date">
                    <div className="timeline-day">{d.getDate()}</div>
                    <div className="timeline-month">{d.toLocaleDateString('en-IE',{month:'short'})}</div>
                  </div>
                  <div className="timeline-line" />
                  <div>
                    <div className="timeline-venue">{g.venue}</div>
                    <div className="timeline-sub">{g.time} · {d.toLocaleDateString('en-IE',{weekday:'long'})}</div>
                    {g.calendarEventId && <div className="cal-badge">📅 In Google Calendar</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'pending' && (
        <div className="page-body">
          {pendingMyGigs.length === 0 && <div className="empty-state">No pending gigs right now.</div>}
          {pendingMyGigs.map(g => (
            <div key={g.id} className="pending-card">
              <div className="pending-head">⏳ Gig offer — action required</div>
              <div className="pending-body">
                <div className="pending-venue">{g.venue}</div>
                <div className="pending-meta">{formatDate(g.date)} · {g.time}</div>
                {g.notes && <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:12}}>Note: {g.notes}</div>}
                <div className="pending-actions">
                  <button className="btn btn-primary" onClick={() => handleAccept(g)}>Accept — add to calendar</button>
                  <button className="btn btn-danger" onClick={() => handleReject(g)}>Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <AssignGigModal onClose={() => setShowModal(false)} onAssign={handleAssign} lockedVenue={venue} />}
    </>
  );
}
