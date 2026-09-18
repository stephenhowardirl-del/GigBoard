import React, { useEffect, useState } from 'react';
import {
  createGig, createGigConfirmed, updateGig, deleteGig, getAllUsers,
  updateUserRole, updateUserSelfAssignVenues, getAllUnavailability,
  updateGigStatus, getUnavailableDates, setUnavailableDates,
  getInvitedEmails, saveInvitedEmails, subscribeGigs, createNotification,
} from '../lib/db';
import { getVenueNames, subscribeVenueConfig } from '../lib/venueGroups';
import { useAuth } from '../hooks/useAuth';
import CalendarView from '../components/CalendarView';
import AssignGigModal from '../components/AssignGigModal';
import GigList from '../components/admin/GigList';
import RosterTab from '../components/admin/RosterTab';
import MyGigsTab from '../components/admin/MyGigsTab';
import VenueManager from '../components/admin/VenueManager';
import FinancialsTab from '../components/FinancialsTab';
import DJDashboard from './DJDashboard';

export default function AdminDashboard({ hideFees }) {
  const { user, profile } = useAuth();
  const [tab, setTab]               = useState('list');
  const [gigs, setGigs]             = useState([]);
  const [myUnavail, setMyUnavail]   = useState([]);
  const [users, setUsers]           = useState([]);
  const [unavail, setUnavail]       = useState([]);
  const [venues, setVenues]         = useState(getVenueNames());
  const [showModal, setShowModal]   = useState(false);
  const [editingGig, setEditingGig] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [invites, setInvites]       = useState([]);
  const [invoiceGig, setInvoiceGig] = useState(null);
  const [previewDJ, setPreviewDJ]   = useState(null);

  // Keep venue list in sync with the Venues tab
  useEffect(() => subscribeVenueConfig(() => setVenues(getVenueNames())), []);

  // Real-time gigs: the subscription keeps `gigs` current at all times —
  // including your own writes (instantly) and other users' changes (live).
  useEffect(() => {
    if (!profile?.uid) return;
    const unsubscribe = subscribeGigs(
      g => { setGigs(g); setLoading(false); },
      e => { setError(e.message); setLoading(false); }
    );
    return unsubscribe;
  }, [profile?.uid]);

  // One-off loads for the slower-changing data.
  useEffect(() => {
    if (!profile?.uid) return;
    (async () => {
      try {
        const [u, un, inv, mun] = await Promise.all([
          getAllUsers(), getAllUnavailability(), getInvitedEmails(), getUnavailableDates(profile.uid),
        ]);
        setUsers(u.filter(x => x.role !== 'full_admin'));
        setUnavail(un);
        setInvites(inv);
        setMyUnavail(mun);
      } catch (e) {
        console.error(e);
        setError(e.message);
        setLoading(false);
      }
    })();
  }, [profile?.uid]);

  // My gigs derived live from the real-time gig list.
  const myGigs = profile
    ? gigs
        .filter(g =>
          g.djUid === profile.uid ||
          (g.djName && profile.name && g.djName.toLowerCase() === profile.name.toLowerCase())
        )
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  async function handleAssign(gigData) {
    if (gigData._bulkCreated) return; // subscription picks the new gigs up automatically
    try {
      if (!gigData.djUid) {
        // No DJ picked — save as unassigned for filling later.
        await createGig({ ...gigData, assignedBy: 'Steve Howard', status: 'unassigned' });
      } else if (gigData.djUid === profile?.uid) {
        // Assigning a gig to yourself (the admin) skips acceptance — auto-confirmed.
        await createGigConfirmed({ ...gigData, assignedBy: 'Steve Howard' });
      } else {
        await createGig({ ...gigData, assignedBy: 'Steve Howard' });
        createNotification(gigData.djUid, 'New gig offer', `${gigData.venue} — ${gigData.date} · ${gigData.time}`);
      }
    } catch (e) { console.error(e); }
  }

  async function handleEdit(gigData) {
    const { id, status, ...fields } = gigData;
    const gigId = editingGig.id;

    // Status rules:
    // - Editing never changes acceptance state (keep current status)...
    // - ...except assigning a DJ to an unassigned gig: becomes a pending offer
    //   (or auto-confirmed if assigned to yourself).
    // - Removing the DJ from a gig makes it unassigned again.
    let newStatus = editingGig.status;
    if (editingGig.status === 'unassigned' && fields.djUid) {
      newStatus = fields.djUid === profile?.uid ? 'confirmed' : 'pending';
    }
    if (!fields.djUid) {
      newStatus = 'unassigned';
    }

    const prev = editingGig;
    setEditingGig(null);
    try {
      await updateGig(gigId, { ...fields, status: newStatus });
      // Notify the DJ when relevant (never notify yourself).
      if (prev.status === 'unassigned' && fields.djUid && fields.djUid !== profile?.uid) {
        createNotification(fields.djUid, 'New gig offer', `${fields.venue} — ${fields.date} · ${fields.time}`);
      } else if (
        fields.djUid && fields.djUid === prev.djUid && fields.djUid !== profile?.uid &&
        (fields.date !== prev.date || fields.time !== prev.time)
      ) {
        createNotification(fields.djUid, 'Gig updated', `${fields.venue} is now ${fields.date} · ${fields.time}`);
      }
    } catch (e) { console.error(e); }
  }

  // Drag-and-drop: drop a gig on a DJ column to assign it, or to move it from another DJ.
  async function handleDropAssign(gigId, dj) {
    const gig = gigs.find(g => g.id === gigId);
    if (!gig || gig.status === 'rejected') return;

    // Dropped on the DJ who already has it — nothing to do.
    const alreadyTheirs = gig.djUid === dj.uid ||
      (gig.djName && dj.name && gig.djName.toLowerCase() === dj.name.toLowerCase());
    if (alreadyTheirs) return;

    // Conflict checks before assigning.
    const djUnavailDates = unavail.find(u => u.uid === dj.uid)?.dates || [];
    const isUnavail      = djUnavailDates.includes(gig.date);
    const existingSameDay = gigs.filter(g =>
      g.djUid === dj.uid && g.date === gig.date &&
      g.status !== 'rejected' && g.status !== 'unassigned' && g.id !== gigId
    );

    if (isUnavail || existingSameDay.length > 0) {
      const lines = [];
      if (isUnavail) lines.push(`${dj.name} is marked UNAVAILABLE on ${gig.date}.`);
      existingSameDay.forEach(g => lines.push(`${dj.name} already has a gig: ${g.venue} at ${g.time} (${g.status}).`));
      lines.push('', 'Assign anyway?');
      if (!window.confirm(lines.join('\n'))) return;
    }

    // Moving a gig off another DJ — confirm the swap first.
    if (gig.status !== 'unassigned') {
      const fromName = gig.djName || 'its current DJ';
      const toNote   = dj.uid === profile?.uid
        ? 'It will be auto-confirmed.'
        : `${dj.name} will get a pending offer to accept.`;
      if (!window.confirm(`Move ${gig.venue} (${gig.date} · ${gig.time}) from ${fromName} to ${dj.name}?\n\n${toNote}`)) return;
    }

    // Assigning to yourself auto-confirms; anyone else gets a pending offer.
    const newStatus = dj.uid === profile?.uid ? 'confirmed' : 'pending';
    const djEmail   = dj.email || (dj.uid === profile?.uid ? (profile?.email || '') : '');

    try {
      await updateGig(gigId, {
        venue: gig.venue, date: gig.date, time: gig.time,
        djUid: dj.uid, djName: dj.name || '', djEmail,
        notes: gig.notes, fee: gig.fee,
        status: newStatus,
      });
      // Tell the DJ who lost the gig (unless that was you)...
      if (gig.djUid && gig.djUid !== dj.uid && gig.djUid !== profile?.uid) {
        createNotification(gig.djUid, 'Gig reassigned', `${gig.venue} (${gig.date} · ${gig.time}) was moved to ${dj.name}`);
      }
      // ...and the DJ who got it (unless that's you).
      if (dj.uid !== profile?.uid) {
        createNotification(dj.uid, 'New gig offer', `${gig.venue} — ${gig.date} · ${gig.time}`);
      }
    } catch (e) { console.error(e); }
  }

  // Drag-and-drop: drop a gig on the Unassigned column to take it off its DJ.
  async function handleDropUnassign(gigId) {
    const gig = gigs.find(g => g.id === gigId);
    if (!gig || gig.status === 'unassigned') return;
    if (!window.confirm(`Unassign ${gig.venue} (${gig.date} · ${gig.time}) from ${gig.djName || 'its DJ'}?`)) return;
    try {
      await updateGig(gigId, {
        venue: gig.venue, date: gig.date, time: gig.time,
        djUid: '', djName: '', djEmail: '',
        notes: gig.notes, fee: gig.fee,
        status: 'unassigned',
      });
      if (gig.djUid && gig.djUid !== profile?.uid) {
        createNotification(gig.djUid, 'Gig unassigned', `${gig.venue} (${gig.date} · ${gig.time}) was taken off your schedule`);
      }
    } catch (e) { console.error(e); }
  }

  async function handleDelete(gig) {
    if (!window.confirm(`Delete this gig?\n\n${gig.venue} — ${gig.date}\n\nThis cannot be undone.`)) return;
    try {
      await deleteGig(gig.id);
    } catch (e) { console.error(e); }
  }

  async function handleConfirm(gigId)   { try { await updateGigStatus(gigId, 'confirmed'); } catch (e) { console.error(e); } }

  // Rejected gigs don't disappear — they go straight back to the Unassigned pool.
  async function rejectToUnassigned(gig) {
    if (!gig) return;
    try {
      await updateGig(gig.id, {
        venue: gig.venue, date: gig.date, time: gig.time,
        djUid: '', djName: '', djEmail: '',
        notes: gig.notes, fee: gig.fee,
        status: 'unassigned',
      });
      if (gig.djUid && gig.djUid !== profile?.uid) {
        createNotification(gig.djUid, 'Offer withdrawn', `${gig.venue} (${gig.date} · ${gig.time}) is no longer assigned to you`);
      }
    } catch (e) { console.error(e); }
  }
  async function handleRejectGig(gigId) { await rejectToUnassigned(gigs.find(g => g.id === gigId)); }
  async function handleAcceptMyGig(gig) { try { await updateGigStatus(gig.id, 'confirmed'); } catch (e) { console.error(e); } }
  async function handleRejectMyGig(gig) { await rejectToUnassigned(gig); }

  async function handleToggleUnavail(isoDate) {
    const next = myUnavail.includes(isoDate) ? myUnavail.filter(d => d !== isoDate) : [...myUnavail, isoDate];
    setMyUnavail(next);
    try {
      await setUnavailableDates(profile.uid, next);
    } catch (e) { console.error(e); }
  }

  async function addInviteEmail(email) {
    const clean = (email || '').trim().toLowerCase();
    if (!clean || invites.map(e => e.toLowerCase()).includes(clean)) return;
    const updated = [...invites, clean];
    setInvites(updated);
    try {
      await saveInvitedEmails(updated);
    } catch (e) { console.error(e); }
  }

  async function handleRemoveInvite(email) {
    const updated = invites.filter(e => e.toLowerCase() !== (email || '').toLowerCase());
    setInvites(updated);
    try {
      await saveInvitedEmails(updated);
    } catch (e) { console.error(e); }
  }

  async function saveUserRole(uid, role, scope) {
    setUsers(us => us.map(u => u.uid === uid ? { ...u, role, venueScope: role === 'venue_admin' ? scope : null } : u));
    try {
      await updateUserRole(uid, role, role === 'venue_admin' ? scope : null);
    } catch (e) { console.error(e); }
  }

  const myPending    = myGigs.filter(g => g.status === 'pending');
  const gigListUsers = profile ? [{ uid: profile.uid, name: profile.name, email: profile.email, role: 'full_admin' }, ...users] : users;

  if (loading) return <div className="loading">Loading…</div>;
  if (error)   return <div className="loading" style={{color:'var(--danger)'}}>Error: {error} — try refreshing.</div>;

  if (previewDJ) {
    return (
      <>
        <div style={{background:'var(--pending-bg)',border:'1px solid #ff990060',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div style={{fontSize:13,color:'#ff9900',fontWeight:600}}>👁 Previewing as {previewDJ.name}</div>
          <button onClick={() => setPreviewDJ(null)} style={{background:'#ff990020',border:'1px solid #ff990060',color:'#ff9900',borderRadius:6,padding:'4px 14px',fontSize:12,cursor:'pointer',fontWeight:600}}>Exit preview</button>
        </div>
        <DJDashboard previewProfile={previewDJ} hideFees={hideFees} />
      </>
    );
  }

  return (
    <>
      <div className="subnav">
        <button className={`subnav-btn${tab==='list'?' active':''}`}       onClick={() => setTab('list')}>Gig list</button>
        <button className={`subnav-btn${tab==='calendar'?' active':''}`}   onClick={() => setTab('calendar')}>Month view</button>
        <button className={`subnav-btn${tab==='roster'?' active':''}`}     onClick={() => setTab('roster')}>DJ roster</button>
        <button className={`subnav-btn${tab==='venues'?' active':''}`}     onClick={() => setTab('venues')}>Venues</button>
        <button className={`subnav-btn${tab==='mygigs'?' active':''}`}     onClick={() => setTab('mygigs')}>
          My gigs{myPending.length > 0 && <span className="notif-dot">{myPending.length}</span>}
        </button>
        <button className={`subnav-btn${tab==='financials'?' active':''}`} onClick={() => setTab('financials')}>Financials</button>

        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,padding:'0 16px'}}>
          <span style={{fontSize:11,color:'var(--text-muted)'}}>Preview as:</span>
          <select
            value=''
            onChange={e => { const dj = users.find(u => u.uid === e.target.value); if (dj) setPreviewDJ(dj); }}
            style={{background:'var(--bg-raised)',border:'1px solid var(--border)',color:'var(--text-secondary)',borderRadius:5,padding:'3px 8px',fontSize:11,cursor:'pointer'}}
          >
            <option value=''>Select DJ…</option>
            {users.map(u => <option key={u.uid} value={u.uid}>{u.name}</option>)}
          </select>
        </div>
      </div>

      {tab === 'list' && (
        <GigList
          gigs={gigs} users={gigListUsers} hideFees={hideFees}
          onConfirm={handleConfirm} onReject={handleRejectGig}
          onEdit={g => { setEditingGig(g); setShowModal(true); }}
          onDelete={handleDelete}
          onDropAssign={handleDropAssign}
          onDropUnassign={handleDropUnassign}
        />
      )}

      {tab === 'calendar' && <CalendarView gigs={gigs} allUnavail={unavail} readOnly showDJPicker />}

      {tab === 'roster' && (
        <RosterTab
          users={users} venues={venues} invites={invites}
          onSaveRole={saveUserRole}
          onSaveSelfAssign={updateUserSelfAssignVenues}
          onAddInvite={addInviteEmail}
          onRemoveInvite={handleRemoveInvite}
        />
      )}

      {tab === 'venues' && <VenueManager />}

      {tab === 'mygigs' && (
        <MyGigsTab
          myGigs={myGigs} myUnavail={myUnavail} userUid={user.uid} allGigs={gigs} hideFees={hideFees}
          onAccept={handleAcceptMyGig} onReject={handleRejectMyGig} onToggleUnavail={handleToggleUnavail}
          invoiceGig={invoiceGig} setInvoiceGig={setInvoiceGig}
        />
      )}

      {tab === 'financials' && <FinancialsTab gigs={myGigs} profile={profile} userUid={user.uid} hideFees={hideFees} />}

      {showModal && (
        <AssignGigModal
          onClose={() => { setShowModal(false); setEditingGig(null); }}
          onAssign={editingGig ? handleEdit : handleAssign}
          existingGig={editingGig}
          venues={venues}
        />
      )}
    </>
  );
}
