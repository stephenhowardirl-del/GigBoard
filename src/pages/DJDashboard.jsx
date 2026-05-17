import React, { useEffect, useState } from 'react';
import { getGigsForDJ, updateGigStatus, getUnavailableDates, setUnavailableDates } from '../lib/db';
import { useAuth } from '../hooks/useAuth';
import CalendarView from '../components/CalendarView';

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

export default function DJDashboard() {
  const { profile } = useAuth();
  const [tab, setTab]         = useState('schedule');
  const [gigs, setGigs]       = useState([]);
  const [unavail, setUnavail] = useState([]);
  const [loading, setLoading] = useState(true);

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

  async function handleAccept(gig) {
    await updateGigStatus(gig.id, 'confirmed');
    load();
  }

  async function handleReject(gig) {
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

  const today   = new Date().toISOString().split('T')[0];
  const now     = new Date();
  const pending = gigs.filter(g => g.status === 'pending');
  const confirmed = gigs.filter(g => g.status === 'confirmed' && g.date >= today);
  const nextGig = confirmed[0];

  const monthEarnings = gigs
    .filter(g => {
      if (g.status !== 'confirmed' || !g.fee) return false;
      const d = new Date(g.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, g) => sum + Number(g.fee), 0);

  const upcomingEarnings = confirmed
    .filter(g => g.fee)
    .reduce((sum, g) => sum + Number(g.fee), 0);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="subnav">
        <button className={'subnav-btn' + (tab === 'schedule' ? ' active' : '')} onClick={() => setTab('schedule')}>My schedule</button>
        <button className={'subnav-btn' + (tab === 'calendar' ? ' active' : '')} onClick={() => setTab('calendar')}>Month view</button>
        <button className={'subnav-btn' + (tab === 'pending' ? ' active' : '')} onClick={() => setTab('pending')}>
          Pending{pending.length > 0 && <span className="notif-dot">{pending.length}</span>}
        </button>
      </div>

      {tab === 'schedule' && (
        <div className="page-body">
          <div className="stats-row" style={{marginBottom:20}}>
            <div className="stat-card">
              <div className="stat-label">This month</div>
              <div className="stat-val neon">€{monthEarnings}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Upcoming total</div>
              <div className="stat-val" style={{color:'#a080ff'}}>€{upcomingEarnings}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Confirmed gigs</div>
              <div className="stat-val">{confirmed.length}</div>
            </div>
          </div>

          {nextGig ? (
            <div className="next-gig-card">
              <div style={{flex:1}}>
                <div className="next-label">Next up</div>
                <div className="next-venue">{nextGig.venue}</div>
                <div className="next-sub">{formatDate(nextGig.date)} · {nextGig.time}</div>
                {nextGig.fee && <div style={{marginTop:6,fontSize:13,color:'#00ffc2',fontWeight:600}}>€{nextGig.fee}</div>}
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
              const d = new Date(g.date + 'T12:00:00');
              return (
                <div key={g.id} className="timeline-item">
                  <div className="timeline-date">
                    <div className="timeline-day">{d.getDate()}</div>
                    <div className="timeline-month">{d.toLocaleDateString('en-IE',{month:'short'})}</div>
                  </div>
                  <div className="timeline-line" />
                  <div style={{flex:1}}>
                    <div className="timeline-venue">{g.venue}</div>
                    <div className="timeline-sub">{g.time} · {d.toLocaleDateString('en-IE',{weekday:'long'})}</div>
                    {g.fee && <div style={{fontSize:12,color:'#00ffc2',fontWeight:600,marginTop:3}}>€{g.fee}</div>}
                    {g.notes && <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:2}}>📌 {g.notes}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <CalendarView
          gigs={gigs}
          unavailDates={unavail}
          onToggleUnavail={handleToggleUnavail}
        />
      )}

      {tab === 'pending' && (
        <div className="page-body">
          {pending.length === 0 && <div className="empty-state">No pending gigs right now.</div>}
          {pending.map(g => (
            <div key={g.id} className="pending-card">
              <div className="pending-head">⏳ Gig offer — action required</div>
              <div className="pending-body">
                <div className="pending-venue">{g.venue}</div>
                <div className="pending-meta">{formatDate(g.date)} · {g.time}</div>
                {g.fee && <div style={{fontSize:15,color:'#00ffc2',fontWeight:700,marginBottom:10}}>Fee: €{g.fee}</div>}
                {g.notes && <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:12}}>📌 {g.notes}</div>}
                <div className="pending-actions">
                  <button className="btn btn-primary" onClick={() => handleAccept(g)}>Accept</button>
                  <button className="btn btn-danger" onClick={() => handleReject(g)}>Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
