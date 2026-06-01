import React, { useEffect, useState } from 'react';
import {
  getAllGigs, createGig, updateGig, deleteGig, getAllUsers,
  updateUserRole, updateUserSelfAssignVenues, getAllUnavailability,
  updateGigStatus, getGigsForDJ, getUnavailableDates, setUnavailableDates,
  getInvitedEmails, saveInvitedEmails, getVenues, saveVenues,
} from '../lib/db';
import { useAuth } from '../hooks/useAuth';
import CalendarView from '../components/CalendarView';
import AssignGigModal from '../components/AssignGigModal';
import GigList from '../components/admin/GigList';
import RosterTab from '../components/admin/RosterTab';
import AccessTab from '../components/admin/AccessTab';
import MyGigsTab from '../components/admin/MyGigsTab';
import FinancialsTab from '../components/FinancialsTab';
import DJDashboard from './DJDashboard';

export default function AdminDashboard({ hideFees }) {
  const { user, profile } = useAuth();
  const [tab, setTab]               = useState('list');
  const [gigs, setGigs]             = useState([]);
  const [myGigs, setMyGigs]         = useState([]);
  const [myUnavail, setMyUnavail]   = useState([]);
  const [users, setUsers]           = useState([]);
  const [allUsers, setAllUsers]     = useState([]);
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
  const [previewDJ, setPreviewDJ]   = useState(null);

  async function load() {
    try {
      const [g, u, un, inv, v] = await Promise.all([
        getAllGigs(), getAllUsers(), getAllUnavailability(), getInvitedEmails(), getVenues(),
      ]);
      setGigs(g);
      const djUsers = u.filter(x => x.role !== 'full_admin');
      setUsers(djUsers);
      setAllUsers(u);
      setUnavail(un);
      setInvites(inv);
      setVenues(v);
      if (profile?.uid) {
        const [mg, mun] = await Promise.all([
          getGigsForDJ(profile.uid),
          getUnavailableDates(profile.uid),
        ]);
        const myGigsByName = g.filter(gig =>
          gig.djName && profile.name &&
          gig.djName.toLowerCase() === profile.name.toLowerCase()
        );
        const merged = [...mg];
        myGigsByName.forEach(gig => {
          if (!merged.find(m => m.id === gig.id)) merged.push(gig);
        });
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

  async function handleAssign(gigData) {
    if (gigData._bulkCreated) {
      load();
      return;
    }
    await createGig({ ...gigData, assignedBy: 'Steve Howard' });
    load();
  }
  async function handleEdit(gigData) {
    await updateGig(editingGig.id, gigData);
    setEditingGig(null);
    load();
  }
  async function handleDelete(gig) {
    if (!window.confirm(`Delete this gig?\n\n${gig.venue} — ${gig.date}\n\nThis cannot be undone.`)) return;
    await deleteGig(gig.id);
    load();
  }
  async function handleConfirm(gigId)   { await updateGigStatus(gigId, 'confirmed'); load(); }
  async function handleRejectGig(gigId) { await updateGigStatus(gigId, 'rejected');  load(); }
  async function handleAcceptMyGig(gig) { await updateGigStatus(gig.id, 'confirmed'); load(); }
  async function handleRejectMyGig(gig) { await updateGigStatus(gig.id, 'rejected');  load(); }

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

  const myPending    = myGigs.filter(g => g.status === 'pending');
  const gigListUsers = profile ? [
    { uid: profile.uid, name: profile.name, role: 'full_admin' },
    ...users,
  ] : users;

  if (loading) return <div className="loading">Loading…</div>;
  if (error)   return <div className="loading" style={{color:'#ff4070'}}>Error: {error} — try refreshing.</div>;

  if (previewDJ) {
    return (
      <>
        <div style={{
          background: '#1a0a00', border: '1px solid #ff990060',
          padding: '10px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{fontSize:13, color:'#ff9900', fontWeight:600}}>
            👁 Previewing as {previewDJ.name}
          </div>
          <button
            onClick={() => setPreviewDJ(null)}
            style={{background:'#ff990020', border:'1px solid #ff990060', color:'#ff9900', borderRadius:6, padding:'4px 14px', fontSize:12, cursor:'pointer', fontWeight:600}}
          >
            Exit preview
          </button>
        </div>
        <DJDashboard previewProfile={previewDJ} />
      </>
    );
  }

  return (
    <>
      <div className="subnav">
        <button className={`subnav-btn${tab==='list'?' active':''}`}       onClick={() => setTab('list')}>Gig list</button>
        <button className={`subnav-btn${tab==='calendar'?' active':''}`}   onClick={() => setTab('calendar')}>Month view</button>
        <button className={`subnav-btn${tab==='roster'?' active':''}`}     onClick={() => setTab('roster')}>DJ roster</button>
        <button className={`subnav-btn${tab==='mygigs'?' active':''}`}     onClick={() => setTab('mygigs')}>
          My gigs{myPending.length > 0 && <span className="notif-dot">{myPending.length}</span>}
        </button>
        <button className={`subnav-btn${tab==='financials'?' active':''}`} onClick={() => setTab('financials')}>Financials</button>
        <button className={`subnav-btn${tab==='access'?' active':''}`}     onClick={() => setTab('access')}>Access</button>

        <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:8, padding:'0 16px'}}>
          <span style={{fontSize:11, color:'var(--text-muted)'}}>Preview as:</span>
          <select
            value=''
            onChange={e => {
              const dj = users.find(u => u.uid === e.target.value);
              if (dj) setPreviewDJ(dj);
            }}
            style={{background:'var(--bg-raised)', border:'1px solid var(--border)', color:'var(--text-secondary)', borderRadius:5, padding:'3px 8px', fontSize:11, cursor:'pointer'}}
          >
            <option value=''>Select DJ…</option>
            {users.map(u => <option key={u.uid} value={u.uid}>{u.name}</option>)}
          </select>
        </div>
      </div>

      {tab === 'list' && (
        <GigList
          gigs={gigs}
          users={gigListUsers}
          hideFees={hideFees}
          onConfirm={handleConfirm}
          onReject={handleRejectGig}
          onEdit={g => { setEditingGig(g); setShowModal(true); }}
          onDelete={handleDelete}
        />
      )}

      {tab === 'calendar' && (
        <CalendarView gigs={gigs} allUnavail={unavail} readOnly showDJPicker />
      )}

      {tab === 'roster' && (
        <RosterTab
          users={users}
          venues={venues}
          onSaveRole={saveUserRole}
          onSaveSelfAssign={updateUserSelfAssignVenues}
        />
      )}

      {tab === 'mygigs' && (
        <MyGigsTab
          myGigs={myGigs}
          myUnavail={myUnavail}
          userUid={user.uid}
          allGigs={gigs}
          hideFees={hideFees}
          onAccept={handleAcceptMyGig}
          onReject={handleRejectMyGig}
          onToggleUnavail={handleToggleUnavail}
          invoiceGig={invoiceGig}
          setInvoiceGig={setInvoiceGig}
        />
      )}

      {tab === 'financials' && (
        <FinancialsTab
          gigs={myGigs}
          profile={profile}
          userUid={user.uid}
        />
      )}

      {tab === 'access' && (
        <AccessTab
          venues={venues}
          newVenue={newVenue}
          setNewVenue={setNewVenue}
          venueSaved={venueSaved}
          onAddVenue={handleAddVenue}
          onRemoveVenue={handleRemoveVenue}
          editingVenue={editingVenue}
          editingVenueName={editingVenueName}
          setEditingVenueName={setEditingVenueName}
          onStartEditVenue={v => { setEditingVenue(v); setEditingVenueName(v); }}
          onRenameVenue={handleRenameVenue}
          onCancelEditVenue={() => setEditingVenue(null)}
          invites={invites}
          newEmail={newEmail}
          setNewEmail={setNewEmail}
          inviteSaved={inviteSaved}
          onAddInvite={handleAddInvite}
          onRemoveInvite={handleRemoveInvite}
        />
      )}

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
