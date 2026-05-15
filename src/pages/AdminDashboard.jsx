import React, { useEffect, useState } from 'react';
import { getAllGigs, createGig, updateGig, deleteGig, getAllUsers, updateUserRole, getAllUnavailability, updateGigStatus, getGigsForDJ, getUnavailableDates, setUnavailableDates, getInvitedEmails, saveInvitedEmails } from '../lib/db';
import { addGigToCalendar, removeGigFromCalendar } from '../lib/calendar';
import { DJ_COLORS } from '../lib/config';
import { useAuth } from '../hooks/useAuth';
import CalendarView from '../components/CalendarView';
import AssignGigModal from '../components/AssignGigModal';

const DOT_COLORS = ['#00d4aa','#a080ff','#40a0ff','#ff60c0','#ffbb00','#80d040'];

const VENUES = [
  'Clancys Cork','JJ Walsh','Dwyers','Seventy Seven',
  'Seventy Seven (brunch)','Seventy Seven (first floor)',
  'Seventy Seven (stamp room)','The Wash','The Pav',
  'The Dean','The Woodford','Mardyke','Wedding','Private Event',
];

function statusBadge(status) {
  return <span className={`badge badge-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

function djTag(name) {
  const c = DJ_COLORS[name] || { color: '#9090b0', bg: '#1a1a2e' };
  return <span className="dj-tag" style={{background: c.bg, color: c.color}}>{name?.split(' ')[0]}</span>;
}

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

export default function AdminDashboard() {
  const { profile, accessToken } = useAuth();
  const [tab, setTab]               = useState('list');
  const [gigs, setGigs]             = useState([]);
  const [myGigs, setMyGigs]         = useState([]);
  const [myUnavail, setMyUnavail]   = useState([]);
  const [users, setUsers]           = useState([]);
  const [unavail, setUnavail]       = useState([]);
  const [showModal, setShowModal]   = useState(false);
  const [editingGig, setEditingGig] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [invites, setInvites]       = useState([]);
  const [newEmail, setNewEmail]     = useState('');
  const [inviteSaved, setInviteSaved] = useState(false);

  async function load() {
    try {
      const [g, u, un, inv] = await Promise.all([
        getAllGigs(), getAllUsers(), getAllUnavailability(), getInvitedEmails(),
      ]);
      setGigs(g);
      setUsers(u.filter(x => x.role !== 'full_admin'));
      setUnavail(un);
      setInvites(inv);

      if (profile?.uid) {
        const [mg, mun] = await Promise.all([
          getGigsForDJ(profile.uid),
          getUnavailableDates(profile.uid),
        ]);
        setMyGigs(mg);
        setMyUnavail(mun);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setError(e.message);
      setLoading(false);
    }
  }

  useEffect(() => { if (profile?.uid) load(); }, [profile]);

  async function handleAssign(gigData) {
    await createGig({ ...gigData, assignedBy: 'Steve Howard' });
    load();
  }

  async function handleEdit(gigData) {
    await updateGig(editingGig.id, gigData);
    setEditingGig(null);
    load();
  }

  async function handleDelete(gig) {
    if (!window.confirm(`Delete this gig?\n\n${gig.venue} — ${formatDate(gig.date)}\n\nThis cannot be undone.`)) return;
    await deleteGig(gig.id);
    load();
  }

  async function handleConfirm(gigId) { await updateGigStatus(gigId, 'confirmed'); load(); }
  async function handleReject(gigId)  { await updateGigStatus(gigId, 'rejected');  load(); }

  async function handleAcceptMyGig(gig) {
    try {
      let calId = null;
      if (accessToken) calId = await addGigToCalendar(accessToken, gig);
      await updateGigStatus(gig.id, 'confirmed', calId);
      load();
    } catch (e) {
      await updateGigStatus(gig.id, 'confirmed');
      load();
    }
  }

  async function handleRejectMyGig(gig) {
    if (gig.calendarEventId && accessToken) await removeGigFromCalendar(accessToken, gig.calendarEventId);
    await updateGigStatus(gig.id, 'rejected');
    load();
  }

  async function handleToggleUnavail(isoDate) {
    const next = myUnavail.includes(isoDate) ? myUnavail.filter(d => d !== isoDate) : [...myUnavail, isoDate];
    setMyUnavail(next);
    await setUnavailableDates(profile.uid, next);
  }

  async function handleAddInvite() {
    const email = newEmail.trim().toLowerCase();
    if (!email || invites.includes(email)) return;
    const updated = [...invites, email];
    setInvites(updated);
    setNewEmail('');
    await saveInvitedEmails(updated);
    setInviteSaved(true);
    setTimeout(() => setInviteSaved(false), 2000);
  }

  async function handleRemoveInvite(email) {
    const updated = invites.filter(e => e !== email);
    setInvites(updated);
    await saveInvitedEmails(updated);
  }

  const today              = new Date().toISOString().split('T')[0];
  const now                = new Date();
  const upcoming           = gigs.filter(g => g.status !== 'rejected' && g.date >= today);
  const pending            = gigs.filter(g => g.status === 'pending');
  const thisMonth          = gigs.filter(g => { const d = new Date(g.date); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); });
  const myConfirmed        = myGigs.filter(g => g.status === 'confirmed' && g.date >= today);
  const myPending          = myGigs.filter(g => g.status === 'pending');
  const nextGig            = myConfirmed[0];
  const myMonthEarnings    = myGigs.filter(g => { if (g.status !== 'confirmed' || !g.fee) return false; const d = new Date(g.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((sum, g) => sum + Number(g.fee), 0);
  const myUpcomingEarnings = myConfirmed.filter(g => g.fee).reduce((sum, g) => sum + Number(g.fee), 0);

  if (loading) return <div className="loading">Loading…</div>;
  if (error)   return <div className="loading" style={{color:'#ff4070'}}>Error: {error} — try refreshing.</div>;

  return (
    <>
      <div className="subnav">
        <button className={`subnav-btn${tab==='list'?' active':''}`}     onClick={() => setTab('list')}>Gig list</button>
        <button className={`subnav-btn${tab==='calendar'?' active':''}`} onClick={() => setTab('calendar')}>Month view</button>
        <button className={`subnav-btn${tab==='roster'?' active':''}`}   onClick={() => setTab('roster')}>DJ roster</button>
        <button className={`subnav-btn${tab==='mygigs'?' active':''}`}   onClick={() => setTab('mygigs')}>
          My gigs{myPending.length > 0 && <span className="notif-dot">{myPending.length}</span>}
        </button>
        <button className={`subnav-btn${tab==='access'?' active':''}`}   onClick={() => setTab('access')}>Access</button>
      </div>

      {tab === 'list' && (
        <div className="page-body">
          <div className="stats-row">
            <div className="stat-card"><div className="stat-label">Upcoming</div><div className="stat-val neon">{upcoming.length}</div></div>
            <div className="stat-card"><div className="stat-label">Pending</div><div className="stat-val pending">{pending.length}</div></div>
            <div className="stat-card"><div className="stat-label">This month</div><div className="stat-val">{thisMonth.length}</div></div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingGig(null); setShowModal(true); }}>+ Assign gig</button>
          </div>
          <div className="panel">
            <div className="panel-head">All venues — all DJs</div>
            {gigs.length === 0 && <div className="empty-state">No gigs yet. Assign one above.</div>}
            {gigs.map((g, i) => (
              <div key={g.id} className="gig-row" style={{flexWrap:'wrap',gap:8}}>
                <div className="gig-dot" style={{background: DOT_COLORS[i % DOT_COLORS.length]}} />
                <div className="gig-info">
                  <div className="gig-venue">{g.venue}</div>
                  <div className="gig-meta">{formatDate(g.date)} · {g.time}</div>
                  <div className="gig-meta">{g.djName}{g.fee ? <span style={{color:'#00ffc2',marginLeft:8}}>€{g.fee}</span> : null}</div>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                  {g.status === 'pending' && <>
                    <button className="btn btn-primary btn-sm" onClick={() => handleConfirm(g.id)}>Confirm</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReject(g.id)}>Reject</button>
                  </>}
                  {g.status !== 'pending' && statusBadge(g.status)}
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditingGig(g); setShowModal(true); }} style={{fontSize:11,padding:'3px 8px'}}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(g)} style={{fontSize:11,padding:'3px 8px'}}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <CalendarView gigs={gigs} allUnavail={unavail} readOnly showDJPicker />
      )}

      {tab === 'roster' && (
        <div className="page-body">
          <div className="section-title">Manage DJ roster &amp; permissions</div>
          <div className="panel">
            <div className="panel-head">
              Active DJs
              <span style={{fontSize:10,color:'var(--text-muted)',fontWeight:400,textTransform:'none',letterSpacing:0}}>Change permissions anytime</span>
            </div>
            {users.length === 0 && <div className="empty-state">No DJs yet — share the link so they can log in.</div>}
            {users.map((u, i) => (
              <RosterRow key={u.uid} user={u} dotColor={DOT_COLORS[i % DOT_COLORS.length]} onRoleChange={async (uid, role, venueScope) => { await updateUserRole(uid, role, venueScope || null); load(); }} />
            ))}
          </div>
        </div>
      )}

      {tab === 'mygigs' && (
        <div className="page-body">
          <div className="stats-row" style={{marginBottom:20}}>
            <div className="stat-card"><div className="stat-label">This month</div><div className="stat-val neon">€{myMonthEarnings}</div></div>
            <div className="stat-card"><div className="stat-label">Upcoming total</div><div className="stat-val" style={{color:'#a080ff'}}>€{myUpcomingEarnings}</div></div>
            <div className="stat-card"><div className="stat-label">Confirmed</div><div className="stat-val">{myConfirmed.length}</div></div>
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
              No upcoming confirmed gigs assigned to you yet.
            </div>
          )}

          {myPending.length > 0 && (
            <>
              <div className="section-title" style={{color:'#ffbb00'}}>Pending — action required</div>
              {myPending.map(g => (
                <div key={g.id} className="pending-card" style={{marginBottom:12}}>
                  <div className="pending-head">⏳ Gig offer</div>
                  <div className="pending-body">
                    <div className="pending-venue">{g.venue}</div>
                    <div className="pending-meta">{formatDate(g.date)} · {g.time}</div>
                    {g.fee && <div style={{fontSize:15,color:'#00ffc2',fontWeight:700,marginBottom:10}}>Fee: €{g.fee}</div>}
                    {g.notes && <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:12}}>📌 {g.notes}</div>}
                    <div className="pending-actions">
                      <button className="btn btn-primary" onClick={() => handleAcceptMyGig(g)}>Accept — add to calendar</button>
                      <button className="btn btn-danger" onClick={() => handleRejectMyGig(g)}>Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          <div className="section-title">Confirmed gigs</div>
          <div className="panel">
            {myConfirmed.length === 0 && <div className="empty-state">No confirmed gigs yet.</div>}
            {myConfirmed.map(g => {
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
                    {g.calendarEventId && <div className="cal-badge">📅 In Google Calendar</div>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="section-title" style={{marginTop:20}}>My availability</div>
          <CalendarView gigs={myGigs} unavailDates={myUnavail} onToggleUnavail={handleToggleUnavail} />
        </div>
      )}

      {tab === 'access' && (
        <div className="page-body">
          <div className="section-title">Invite management</div>
          <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:16}}>
            Only email addresses on this list can log in to GigBoard. Add a DJ's email before sending them the link.
          </div>

          <div className="panel" style={{marginBottom:20}}>
            <div className="panel-head">Invited emails — {invites.length} people</div>
            {invites.length === 0 && <div className="empty-state">No invites yet. Add emails below.</div>}
            {invites.map(email => (
              <div key={email} className="gig-row">
                <div style={{flex:1,fontSize:13,fontFamily:'var(--font-mono)',color:'#e8e8f0'}}>{email}</div>
                <button
                  onClick={() => handleRemoveInvite(email)}
                  style={{background:'transparent',border:'1px solid #ff407040',color:'#ff4070',borderRadius:5,padding:'3px 10px',fontSize:11,cursor:'pointer'}}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel-head">Add a new invite</div>
            <div style={{padding:16,display:'flex',gap:10}}>
              <input
                type="email"
                placeholder="dj@gmail.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddInvite()}
                style={{flex:1,background:'var(--bg-raised)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text-primary)',fontSize:13,padding:'8px 10px'}}
              />
              <button className="btn btn-primary" onClick={handleAddInvite} style={{whiteSpace:'nowrap'}}>
                {inviteSaved ? '✓ Saved' : 'Add invite'}
              </button>
            </div>
            <div style={{padding:'0 16px 14px',fontSize:11,color:'var(--text-muted)'}}>
              The DJ must log in using this exact Google account email address.
            </div>
          </div>
        </div>
      )}

      {showModal && !editingGig && (
        <AssignGigModal onClose={() => setShowModal(false)} onAssign={handleAssign} />
      )}
      {showModal && editingGig && (
        <AssignGigModal onClose={() => { setShowModal(false); setEditingGig(null); }} onAssign={handleEdit} existingGig={editingGig} />
      )}
    </>
  );
}

function RosterRow({ user, dotColor, onRoleChange }) {
  const [role, setRole]   = useState(user.role || 'dj');
  const [venue, setVenue] = useState(user.venueScope || VENUES[0]);

  function handleRole(e) { const r = e.target.value; setRole(r); onRoleChange(user.uid, r, r === 'venue_admin' ? venue : null); }
  function handleVenue(e) { setVenue(e.target.value); onRoleChange(user.uid, role, e.target.value); }

  const initials = user.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();

  return (
    <div>
      <div className="roster-row">
        <div className="avatar" style={{background: dotColor+'20', color: dotColor, borderColor: dotColor+'40'}}>{initials}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:500}}>{user.name}</div>
          <div style={{fontSize:11,color:'var(--text-muted)'}}>{user.email}</div>
        </div>
        <select className="perm-select" value={role} onChange={handleRole}>
          <option value="dj">DJ</option>
          <option value="venue_admin">Venue admin</option>
        </select>
      </div>
      {role === 'venue_admin' && (
        <div style={{padding:'6px 16px 10px 58px',borderBottom:'1px solid var(--bg-raised)'}}>
          <label style={{fontSize:10,color:'var(--text-muted)',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.07em'}}>Assigned venue</label>
          <select className="perm-select" style={{width:180}} value={venue} onChange={handleVenue}>
            {VENUES.map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
