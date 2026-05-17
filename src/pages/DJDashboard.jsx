import React, { useEffect, useState } from 'react';
import { getGigsForDJ, updateGigStatus, getUnavailableDates, setUnavailableDates } from '../lib/db';
import { addGigToCalendar } from '../lib/calendar';
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
    try {
      const calId = await addGigToCalendar(gig);
      await updateGigStatus(gig.id, 'confirmed', calId);
      load();
    } catch (e) {
      console.error('Calendar error:', e);
      await updateGigStatus(gig.id, 'confirmed');
      load();
    }
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

  const today     = new Date().toISOString().split('T')[0];
  const now       = new Date();
  const pending   = gigs.filter(g => g.status === 'pending');
  const confirmed = gigs.filter(g => g.status === 'confirmed' && g.date >= today);
  const nextGig   = confirmed[0];

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

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <>
      <div className="subnav">
        <button className={`subnav-btn${tab==='schedule'?' active':''}`} onClick={() => setTab('schedule')}>My schedule</button>
        <button className={`subnav-btn${tab==='calendar'?' active':''}`} onClick={() => setTab('calendar')}>Month view</button>
        <button className={`subnav-btn${tab==='pending'?' active':''}`} onClick={() => setTab('pending')}>
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
                {nextGig.fee && <div style={{marginTop:6,fontSize:13,color:'#00ffc2',fontWeight:600}}>€{next
