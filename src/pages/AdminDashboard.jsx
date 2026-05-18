import React, { useEffect, useState } from 'react';
import { getAllGigs, createGig, updateGig, deleteGig, getAllUsers, updateUserRole, updateUserSelfAssignVenues, getAllUnavailability, updateGigStatus, getGigsForDJ, getUnavailableDates, setUnavailableDates, getInvitedEmails, saveInvitedEmails, getVenues, saveVenues } from '../lib/db';
import { getVenueColor, VENUE_ADMIN_SCOPES } from '../lib/venueGroups';
import { useAuth } from '../hooks/useAuth';
import CalendarView from '../components/CalendarView';
import AssignGigModal from '../components/AssignGigModal';
import InvoiceModal from '../components/InvoiceModal';

const DOT_COLORS = ['#00d4aa','#a080ff','#40a0ff','#ff60c0','#ffbb00','#80d040'];

function statusBadge(status) {
  return <span className={`badge badge-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
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
function VenueBadge({ venue }) {
  const { color, bg, group } = getVenueColor(venue);
  return (
    <div style={{display:'flex', alignItems:'center', gap:6, marginTop:3}}>
      <div style={{width:7, height:7, borderRadius:'50%', background:color, flexShrink:0}} />
      {group && <span style={{fontSize:10, color, background:bg, padding:'1px 6px', borderRadius:4, fontWeight:500}}>{group}</span>}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const [tab, setTab]               = useState('list');
  const [gigs, setGigs]             = useState([]);
  const [myGigs, setMyGigs]         = useState([]);
  const [myUnavail, setMyUnavail]   = useState([]);
  const [users, setUsers]           = useState([]);
  const [unavail, setUnavail]       = useState([]);
  const [venues, setVenues]         = useState([]);
  const [newVenue, setNewVenue]     = useState('');
  const [venueSaved, setVenueSaved] = useState(false);
  const [editingVenue, setEditingVenue]         = useState(null);
  const [editingVenueName, setEditingVenueName] = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [editingGig, setEditingGig] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [invites, setInvites]       = useState([]);
  const [newEmail, setNewEmail]     = useState('');
  const [inviteSaved, setInviteSaved] = useState(false);
  const [invoiceGig, setInvoiceGig] = useState(null);

  async function load() {
    try {
      const [g, u, un, inv, v] = await Promise.all([
        getAllGigs(), getAllUsers(), getAllUnavailability(), getInvitedEmails(), getVenues(),
      ]);
      setGigs(g);
      setUsers(u.filter(x => x.role !== 'full_admin'));
      setUnavail(un);
      setInvites(inv);
      setVenues(v);
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
  async function handleRejectGig(gigId) { await updateGigStatus(gigId, 'rejected'); load(); }
  async function handleAcceptMyGig(gig) { await updateGigStatus(gig.id, 'confirmed'); load(); }
  async function handleRejectMyGig(gig) { await updateGigStatus(gig.id, 'rejected'); load(); }
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
  async function handleAddVenue() {
    const v = newVenue.trim();
    if (!v || venues.includes(v)) return;
    const updated = [...venues, v];
    setVenues(updated);
    setNewVenue('');
    await saveVenues(updated);
    setVenueSaved(true);
    setTimeout(() => setVenueSaved(false), 2000);
  }
  async function handleRemoveVenue(venue) {
    if (!window.confirm(`Remove "${venue}" from the venue list?`)) return;
    const updated = venues.filter(v => v !== venue);
    setVenues(updated);
    await saveVenues(updated);
  }
  async function handleRenameVenue() {
    const newName = editingVenueName.trim();
    if (!newName || newName === editingVenue) { setEditingVenue(null); return; }
    const updated = venues.map(v => v === editingVenue ? newName : v);
    setVenues(updated);
    await saveVenues(updated);
    setEditingVenue(null);
    setEditingVenueName('');
  }
  async function saveUserRole(uid, role, scope) {
    await updateUserRole(uid, role, role === 'venue_admin' ? scope : null);
    load();
  }

  const today              = new Date().toISOString().split('T')[0];
  const now                = new Date();
  const upcoming           = gigs.filter(g => g.status !== 'rejected' && g.date >= today);
  const pending            = gigs.filter(g => g.status === 'pending');
  const thisMonth          = gigs.filter(g => { const d = new Date(g.date); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); });
  const myConfirmed        = myGigs.filter(g => g.status === 'confirmed');
  const myPending          = myGigs.filter(g => g.status === 'pending');
  const myConfirmedUpcoming = myConfirmed.filter(g => g.date >= today);
  const nextGig            = myConfirmedUpcoming[0];
  const myMonthEarnings    = myGigs.filter(g => { if (g.status !== 'confirmed' || !g.fee) return false; const d = new Date(g.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((sum, g) => sum + Number(g.fee), 0);
  const myUpcomingEarnings = myConfirmedUpcoming.filter(g => g.fee).reduce((sum, g) => sum + Number(g.fee), 0);

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
            {gigs.map(g => {
              const vc = getVenueColor(g.venue);
              return (
                <div key={g.id} className="gig-row" style={{flexWrap:'wrap',gap:8,borderLeft:`3px solid ${vc.color}`}}>
                  <div className="gig-info">
                    <div className="gig-venue">{g.venue}</div>
                    <VenueBadge venue={g.venue} />
                    <div className="gig-meta" style={{marginTop:4}}>{formatDate(g.date)} · {g.time}</div>
                    <div className="gig-meta">{g.djName}{g.fee ? <span style={{color:'#00ffc2',marginLeft:8}}>€{g.fee}</span> : null}</div>
                  </div>
                  <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                    {g.status === 'pending' && <>
                      <button className="btn btn-primary btn-sm" onClick={() => handleConfirm(g.id)}>Confirm</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleRejectGig(g.id)}>Reject</button>
                    </>}
                    {g.status !== 'pending' && statusBadge(g.status)}
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingGig(g); setShowModal(true); }} style={{fontSize:11,padding:'3px 8px'}}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(g)} style={{fontSize:11,padding:'3px 8px'}}>Delete</button>
                  </div>
                </div>
              );
            })}
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
              <RosterRow key={u.uid} user={u} dotColor={DOT_COLORS[i % DOT_COLORS.length]} onSave={saveUserRole} venues={venues} onSaveSelfAssign={updateUserSelfAssignVenues} />
            ))}
          </div>
        </div>
      )}

      {tab === 'mygigs' && (
        <div className="page-body">
          <div className="stats-row" style={{marginBottom:20}}>
            <div className="stat-card"><div className="stat-label">This month</div><div className="stat-val neon">€{myMonthEarnings}</div></div>
            <div className="stat-card"><div className="stat-label">Upcoming total</div><div className="stat-val" style={{color:'#a080ff'}}>€{myUpcomingEarnings}</div></div>
            <div className="stat-card"><div className="stat-label">Confirmed</div><div className="stat-val">{myConfirmedUpcoming.length}</div></div>
          </div>
          {nextGig ? (
            <div className="next-gig-card" style={{borderColor: getVenueColor(nextGig.venue).color+'40'}}>
              <div style={{flex:1}}>
                <div className="next-label">Next up</div>
                <div className="next-venue">{nextGig.venue}</div>
                <VenueBadge venue={nextGig.venue} />
                <div className="next-sub" style={{marginTop:6}}>{formatDate(nextGig.date)} · {nextGig.time}</div>
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
              {myPending.map(g => {
                const vc = getVenueColor(g.venue);
                return (
                  <div key={g.id} className="pending-card" style={{marginBottom:12,borderColor:vc.color+'40'}}>
                    <div className="pending-head" style={{background:vc.bg,color:vc.color}}>⏳ Gig offer</div>
                    <div className="pending-body">
                      <div className="pending-venue">{g.venue}</div>
                      <VenueBadge venue={g.venue} />
                      <div className="pending-meta" style={{marginTop:8}}>{formatDate(g.date)} · {g.time}</div>
                      {g.fee && <div style={{fontSize:15,color:'#00ffc2',fontWeight:700,marginBottom:10,marginTop:6}}>Fee: €{g.fee}</div>}
                      {g.notes && <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:12}}>📌 {g.notes}</div>}
                      <div className="pending-actions">
                        <button className="btn btn-primary" onClick={() => handleAcceptMyGig(g)}>Accept</button>
                        <button className="btn btn-danger" onClick={() => handleRejectMyGig(g)}>Reject</button>
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
              const d = new Date(g.date + 'T12:00:00');
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
                    {g.fee && <div style={{fontSize:12,color:'#00ffc2',fontWeight:600,marginTop:3}}>€{g.fee}</div>}
                    {g.notes && <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:2}}>📌 {g.notes}</div>}
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
          <div className="section-title" style={{marginTop:20}}>My availability</div>
          <CalendarView gigs={myGigs} unavailDates={myUnavail} onToggleUnavail={handleToggleUnavail} />
        </div>
      )}

      {tab === 'access' && (
        <div className="page-body">
          <div className="section-title">Venues</div>
          <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:16}}>Add, rename or remove venues.</div>
          <div className="panel" style={{marginBottom:20}}>
            <div className="panel-head">Current venues — {venues.length}</div>
            {venues.length === 0 && <div className="empty-state">No venues yet.</div>}
            {venues.map(venue => {
              const vc = getVenueColor(venue);
              return (
                <div key={venue} className="gig-row" style={{borderLeft:`3px solid ${vc.color}`}}>
                  {editingVenue === venue ? (
                    <>
                      <input autoFocus value={editingVenueName} onChange={e => setEditingVenueName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleRenameVenue(); if (e.key === 'Escape') setEditingVenue(null); }} style={{flex:1,background:'var(--bg-raised)',border:'1px solid var(--border-mid)',borderRadius:5,color:'var(--text-primary)',fontSize:13,padding:'5px 8px'}} />
                      <button onClick={handleRenameVenue} className="btn btn-primary btn-sm" style={{marginLeft:6}}>Save</button>
                      <button onClick={() => setEditingVenue(null)} className="btn btn-ghost btn-sm" style={{marginLeft:4}}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,color:'#e8e8f0'}}>{venue}</div>
                        {vc.group && <div style={{fontSize:10,color:vc.color,marginTop:2}}>{vc.group}</div>}
                      </div>
                      <button onClick={() => { setEditingVenue(venue); setEditingVenueName(venue); }} style={{background:'transparent',border:'1px solid #1e1e2e',color:'#6060a0',borderRadius:5,padding:'3px 10px',fontSize:11,cursor:'pointer',marginRight:6}}>Edit</button>
                      <button onClick={() => handleRemoveVenue(venue)} style={{background:'transparent',border:'1px solid #ff407040',color:'#ff4070',borderRadius:5,padding:'3px 10px',fontSize:11,cursor:'pointer'}}>Remove</button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="panel" style={{marginBottom:32}}>
            <div className="panel-head">Add a venue</div>
            <div style={{padding:16,display:'flex',gap:10}}>
              <input type="text" placeholder="e.g. The Shelter" value={newVenue} onChange={e => setNewVenue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddVenue()} style={{flex:1,background:'var(--bg-raised)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text-primary)',fontSize:13,padding:'8px 10px'}} />
              <button className="btn btn-primary" onClick={handleAddVenue} style={{whiteSpace:'nowrap'}}>{venueSaved ? '✓ Saved' : 'Add venue'}</button>
            </div>
          </div>
          <div className="section-title">Invite management</div>
          <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:16}}>Only email addresses on this list can log in to GigBoard.</div>
          <div className="panel" style={{marginBottom:20}}>
            <div className="panel-head">Invited emails — {invites.length} people</div>
            {invites.length === 0 && <div className="empty-state">No invites yet.</div>}
            {invites.map(email => (
              <div key={email} className="gig-row">
                <div style={{flex:1,fontSize:13,fontFamily:'var(--font-mono)',color:'#e8e8f0'}}>{email}</div>
                <button onClick={() => handleRemoveInvite(email)} style={{background:'transparent',border:'1px solid #ff407040',color:'#ff4070',borderRadius:5,padding:'3px 10px',fontSize:11,cursor:'pointer'}}>Remove</button>
              </div>
            ))}
          </div>
          <div className="panel">
            <div className="panel-head">Add a new invite</div>
            <div style={{padding:16,display:'flex',gap:10}}>
              <input type="email" placeholder="dj@gmail.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddInvite()} style={{flex:1,background:'var(--bg-raised)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text-primary)',fontSize:13,padding:'8px 10px'}} />
              <button className="btn btn-primary" onClick={handleAddInvite} style={{whiteSpace:'nowrap'}}>{inviteSaved ? '✓ Saved' : 'Add invite'}</button>
            </div>
            <div style={{padding:'0 16px 14px',fontSize:11,color:'var(--text-muted)'}}>The DJ must log in using this exact Google account email address.</div>
          </div>
        </div>
      )}

      {showModal && !editingGig && <AssignGigModal onClose={() => setShowModal(false)} onAssign={handleAssign} venues={venues} />}
      {showModal && editingGig && <AssignGigModal onClose={() => { setShowModal(false); setEditingGig(null); }} onAssign={handleEdit} existingGig={editingGig} venues={venues} />}

      {invoiceGig && (
        <InvoiceModal
          gig={invoiceGig}
          userUid={user.uid}
          onClose={() => setInvoiceGig(null)}
        />
      )}
    </>
  );
}

function RosterRow({ user, dotColor, onSave, venues, onSaveSelfAssign }) {
  const [role, setRole]                 = useState(user.role || 'dj');
  const [scope, setScope]               = useState(user.venueScope || VENUE_ADMIN_SCOPES[0]?.label || '');
  const [selfAssign, setSelfAssign]     = useState(user.selfAssignVenues || []);
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [selfAssignSaved, setSelfAssignSaved] = useState(false);
  const [showVenues, setShowVenues]     = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(user.uid, role, scope);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch(e) { console.error(e); }
    setSaving(false);
  }

  async function handleToggleVenue(venue) {
    const updated = selfAssign.includes(venue)
      ? selfAssign.filter(v => v !== venue)
      : [...selfAssign, venue];
    setSelfAssign(updated);
    await onSaveSelfAssign(user.uid, updated);
    setSelfAssignSaved(true);
    setTimeout(() => setSelfAssignSaved(false), 2000);
  }

  const initials = user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{borderBottom:'1px solid var(--bg-raised)'}}>
      <div className="roster-row" style={{borderBottom:'none'}}>
        <div className="avatar" style={{background:dotColor+'20',color:dotColor,borderColor:dotColor+'40'}}>{initials}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:500}}>{user.name}</div>
          <div style={{fontSize:11,color:'var(--text-muted)'}}>{user.email}</div>
        </div>
        <select className="perm-select" value={role} onChange={e => setRole(e.target.value)}>
          <option value="dj">DJ</option>
          <option value="venue_admin">Venue admin</option>
        </select>
      </div>

      {role === 'venue_admin' && (
        <div style={{padding:'8px 16px 12px 58px'}}>
          <label style={{fontSize:10,color:'var(--text-muted)',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.07em'}}>Assigned scope</label>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <select className="perm-select" style={{flex:1}} value={scope} onChange={e => setScope(e.target.value)}>
              {VENUE_ADMIN_SCOPES.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
            </select>
            <button onClick={handleSave} className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
            </button>
          </div>
          {user.venueScope && <div style={{fontSize:11,color:'var(--text-muted)',marginTop:6}}>Currently: {user.venueScope}</div>}
        </div>
      )}

      {role === 'dj' && user.role !== 'dj' && (
        <div style={{padding:'8px 16px 12px 58px'}}>
          <button onClick={handleSave} className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save as DJ'}
          </button>
        </div>
      )}

      <div style={{padding:'0 16px 12px 58px'}}>
        <button
          onClick={() => setShowVenues(v => !v)}
          style={{background:'transparent',border:'1px solid #1e1e2e',color:'#6060a0',borderRadius:5,padding:'3px 10px',fontSize:11,cursor:'pointer',marginBottom: showVenues ? 10 : 0}}
        >
          {showVenues ? 'Hide' : 'Self-assign venues'} {selfAssign.length > 0 ? `(${selfAssign.length})` : ''}
        </button>

        {showVenues && (
          <div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:8}}>
              Tick venues this DJ can book themselves — goes straight to confirmed.
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {venues.map(venue => {
                const checked = selfAssign.includes(venue);
                const vc = getVenueColor(venue);
                return (
                  <label key={venue} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',padding:'4px 10px',borderRadius:5,border:`1px solid ${checked ? vc.color+'60' : '#1e1e2e'}`,background: checked ? vc.color+'15' : 'transparent',fontSize:12,color: checked ? vc.color : '#6060a0',transition:'all 0.1s'}}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleVenue(venue)}
                      style={{accentColor: vc.color, width:12, height:12}}
                    />
                    {venue}
                  </label>
                );
              })}
            </div>
            {selfAssignSaved && <div style={{fontSize:11,color:'#00ffcc',marginTop:8}}>✓ Saved</div>}
          </div>
        )}
      </div>
    </div>
  );
}
