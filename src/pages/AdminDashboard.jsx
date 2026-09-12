import React, { useEffect, useState } from 'react';
import {
  getAllGigs, createGig, createGigConfirmed, updateGig, deleteGig, getAllUsers,
  updateUserRole, updateUserSelfAssignVenues, getAllUnavailability,
  updateGigStatus, getGigsForDJ, getUnavailableDates, setUnavailableDates,
  getInvitedEmails, saveInvitedEmails,
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
  const [myGigs, setMyGigs]         = useState([]);
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
        const [mg, mun] = await Promise.all([getGigsForDJ(profile.uid), getUnavailableDates(profile.uid)]);
        const myGigsByName = g.filter(gig => gig.djName && profile.name && gig.djName.toLowerCase() === profile.name.toLowerCase());
        const merged = [...mg];
        myGigsByName.forEach(gig => { if (!merged.find(m => m.id === gig.id)) merged.push(gig); });
        merged.sort((a, b) => a.date.localeCompare(b.date));
        setMyGigs(merged);
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

  // ---- Optimistic helpers ----

  function applyStatusLocally(gigId, status) {
    setGigs(gs => gs.map(g => g.id === gigId ? { ...g, status } : g));
    setMyGigs(gs => gs.map(g => g.id === gigId ? { ...g, status } : g));
  }

  async function setStatusOptimistic(gigId, status) {
    applyStatusLocally(gigId, status);
    try {
      await updateGigStatus(gigId, status);
    } catch (e) {
      console.error(e);
      load(); // revert to server truth
    }
  }

  async function handleAssign(gigData) {
    if (gigData._bulkCreated) { load(); return; }
    if (!gigData.djUid) {
      // No DJ picked — save as unassigned for filling later.
      await createGig({ ...gigData, assignedBy: 'Steve Howard', status: 'unassigned' });
    } else if (gigData.djUid === profile?.uid) {
      // Assigning a gig to yourself (the admin) skips acceptance — auto-confirmed.
      await createGigConfirmed({ ...gigData, assignedBy: 'Steve Howard' });
    } else {
      await createGig({ ...gigData, assignedBy: 'Steve Howard' });
    }
    load();
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

    // Optimistic: merge the edited fields into local state immediately.
    const optimistic = { ...fields, status: newStatus, fee: fields.fee ? Number(fields.fee) : null };
    setGigs(gs => gs.map(g => g.id === gigId ? { ...g, ...optimistic } : g));
    setMyGigs(gs => gs.map(g => g.id === gigId ? { ...g, ...optimistic } : g));
    setEditingGig(null);

    try {
      await updateGig(gigId, { ...fields, status: newStatus });
    } catch (e) {
      console.error(e);
      load();
    }
  }

  // Drag-and-drop: assign an unassigned gig to a DJ by dropping it on their column.
  async function handleDropAssign(gigId, dj) {
    const gig = gigs.find(g => g.id === gigId);
    if (!gig || gig.status !== 'unassigned') return;

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

    // Assigning to yourself auto-confirms; anyone else gets a pending offer.
    const newStatus = dj.uid === profile?.uid ? 'confirmed' : 'pending';
    const djEmail   = dj.email || (dj.uid === profile?.uid ? (profile?.email || '') : '');

    const updated = {
      djUid: dj.uid,
      djName: dj.name || '',
      djEmail,
      status: newStatus,
    };

    // Optimistic: move the card immediately.
    setGigs(gs => gs.map(g => g.id === gigId ? { ...g, ...updated } : g));
    if (dj.uid === profile?.uid) {
      setMyGigs(gs => {
        const next = gs.filter(g => g.id !== gigId);
        next.push({ ...gig, ...updated });
        next.sort((a, b) => a.date.localeCompare(b.date));
        return next;
      });
    }

    try {
      await updateGig(gigId, {
        venue: gig.venue, date: gig.date, time: gig.time,
        djUid: dj.uid, djName: dj.name || '', djEmail,
        notes: gig.notes, fee: gig.fee,
        status: newStatus,
      });
    } catch (e) {
      console.error(e);
      load();
    }
  }

  async function handleDelete(gig) {
    if (!window.confirm(`Delete this gig?\n\n${gig.venue} — ${gig.date}\n\nThis cannot be undone.`)) return;
    setGigs(gs => gs.filter(g => g.id !== gig.id));
    setMyGigs(gs => gs.filter(g => g.id !== gig.id));
    try {
      await deleteGig(gig.id);
    } catch (e) {
      console.error(e);
      load();
    }
  }

  async function handleConfirm(gigId)   { await setStatusOptimistic(gigId, 'confirmed'); }
  async function handleRejectGig(gigId) { await setStatusOptimistic(gigId, 'rejected'); }
  async function handleAcceptMyGig(gig) { await setStatusOptimistic(gig.id, 'confirmed'); }
  async function handleRejectMyGig(gig) { await setStatusOptimistic(gig.id, 'rejected'); }

  async function handleToggleUnavail(isoDate) {
    const next = myUnavail.includes(isoDate) ? myUnavail.filter(d => d !== isoDate) : [...myUnavail, isoDate];
    setMyUnavail(next);
    try {
      await setUnavailableDates(profile.uid, next);
    } catch (e) {
      console.error(e);
      load();
    }
  }

  async function addInviteEmail(email) {
    const clean = (email || '').trim().toLowerCase();
    if (!clean || invites.map(e => e.toLowerCase()).includes(clean)) return;
    const updated = [...invites, clean];
    setInvites(updated);
    try {
      await saveInvitedEmails(updated);
    } catch (e) {
      console.error(e);
      load();
    }
  }

  async function handleRemoveInvite(email) {
    const updated = invites.filter(e => e.toLowerCase() !== (email || '').toLowerCase());
    setInvites(updated);
    try {
      await saveInvitedEmails(updated);
    } catch (e) {
      console.error(e);
      load();
    }
  }

  async function saveUserRole(uid, role, scope) {
    setUsers(us => us.map(u => u.uid === uid ? { ...u, role, venueScope: role === 'venue_admin' ? scope : null } : u));
    try {
      await updateUserRole(uid, role, role === 'venue_admin' ? scope : null);
    } catch (e) {
      console.error(e);
      load();
    }
  }

  const myPending    = myGigs.filter(g => g.status === 'pending');
  const gigListUsers = profile ? [{ uid: profile.uid, name: profile.name, email: profile.email, role: 'full_admin' }, ...users] : users;

  if (loading) return <div className="loading">Loading…</div>;
  if (error)   return <div className="loading" style={{color:'#ff4070'}}>Error: {error} — try refreshing.</div>;

  if (previewDJ) {
    return (
      <>
        <div style={{background:'#1a0a00',border:'1px solid #ff990060',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
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
