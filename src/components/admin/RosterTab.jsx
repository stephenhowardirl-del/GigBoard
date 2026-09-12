import React, { useState } from 'react';
import { getVenueColor, VENUE_ADMIN_SCOPES } from '../../lib/venueGroups';

const DOT_COLORS = ['#00d4aa','#a080ff','#40a0ff','#ff60c0','#ffbb00','#80d040'];

export default function RosterTab({ users, venues, invites = [], onSaveRole, onSaveSelfAssign, onAddInvite, onRemoveInvite }) {
  const [newEmail, setNewEmail]   = useState('');
  const [adding, setAdding]       = useState(false);
  const [addError, setAddError]   = useState('');
  const [expanded, setExpanded]   = useState(null);

  const userEmails      = users.map(u => (u.email || '').toLowerCase());
  const pendingInvites  = invites.filter(e => !userEmails.includes(e.toLowerCase()));

  async function handleAdd() {
    const email = newEmail.trim().toLowerCase();
    setAddError('');
    if (!email || !email.includes('@')) { setAddError('Enter a valid email address'); return; }
    if (invites.map(e => e.toLowerCase()).includes(email)) { setAddError('That email is already invited'); return; }
    if (userEmails.includes(email)) { setAddError('That DJ already has an account'); return; }
    setAdding(true);
    await onAddInvite(email);
    setNewEmail('');
    setAdding(false);
  }

  return (
    <div className="page-body">

      {/* Add DJ */}
      <div style={{background:'#0d0d18',border:'1px solid #1e1e30',borderRadius:10,padding:18,marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:700,color:'#ffffff',marginBottom:4}}>Add a DJ</div>
        <div style={{fontSize:12,color:'#8080a0',marginBottom:12}}>
          Enter their Google email. They'll be able to sign in at gig-board.vercel.app straight away. Their profile is created automatically on first login.
        </div>
        <div style={{display:'flex',gap:8}}>
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="dj@gmail.com"
            style={{flex:1,background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:13,padding:'9px 12px'}}
          />
          <button className="btn btn-primary" onClick={handleAdd} disabled={adding || !newEmail.trim()}>
            {adding ? 'Adding…' : '+ Add DJ'}
          </button>
        </div>
        {addError && <div style={{fontSize:12,color:'#ff6090',marginTop:8}}>{addError}</div>}
      </div>

      {/* Active DJs */}
      <div className="section-title">Active DJs ({users.length})</div>
      <div style={{background:'#0d0d18',border:'1px solid #1e1e30',borderRadius:10,overflow:'hidden',marginBottom:20}}>
        {users.length === 0 && <div style={{padding:24,textAlign:'center',color:'#505070',fontSize:13}}>No DJs have signed in yet.</div>}
        {users.map((u, i) => (
          <RosterRow
            key={u.uid}
            user={u}
            dotColor={DOT_COLORS[i % DOT_COLORS.length]}
            venues={venues}
            isOpen={expanded === u.uid}
            onToggle={() => setExpanded(expanded === u.uid ? null : u.uid)}
            onSave={onSaveRole}
            onSaveSelfAssign={onSaveSelfAssign}
            onRemove={() => onRemoveInvite(u.email)}
            isLast={i === users.length - 1}
          />
        ))}
      </div>

      {/* Pending invites */}
      <div className="section-title">Pending invites ({pendingInvites.length})</div>
      <div style={{background:'#0d0d18',border:'1px solid #1e1e30',borderRadius:10,overflow:'hidden'}}>
        {pendingInvites.length === 0 && (
          <div style={{padding:20,textAlign:'center',color:'#505070',fontSize:13}}>No pending invites — everyone invited has signed in.</div>
        )}
        {pendingInvites.map((email, i) => (
          <div key={email} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom: i < pendingInvites.length-1 ? '1px solid #1a1a2e' : 'none'}}>
            <div style={{width:34,height:34,borderRadius:'50%',background:'#ffbb0015',border:'1.5px solid #ffbb0040',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>⏳</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:'#e8e8f0'}}>{email}</div>
              <div style={{fontSize:11,color:'#ffbb00',marginTop:2}}>Invited — waiting for first sign-in</div>
            </div>
            <button
              onClick={() => { if (window.confirm(`Remove invite for ${email}?`)) onRemoveInvite(email); }}
              style={{background:'transparent',border:'1px solid #2a2a40',color:'#8080a0',borderRadius:5,padding:'4px 10px',fontSize:11,cursor:'pointer'}}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RosterRow({ user, dotColor, venues, isOpen, onToggle, onSave, onSaveSelfAssign, onRemove, isLast }) {
  const [role, setRole]             = useState(user.role || 'dj');
  const [scope, setScope]           = useState(user.venueScope || VENUE_ADMIN_SCOPES[0]?.label || '');
  const [selfAssign, setSelfAssign] = useState(user.selfAssignVenues || []);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  const roleChanged = role !== (user.role || 'dj') || (role === 'venue_admin' && scope !== user.venueScope);

  async function handleSaveRole() {
    setSaving(true);
    try {
      await onSave(user.uid, role, scope);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function handleToggleVenue(venue) {
    const updated = selfAssign.includes(venue) ? selfAssign.filter(v => v !== venue) : [...selfAssign, venue];
    setSelfAssign(updated);
    await onSaveSelfAssign(user.uid, updated);
  }

  async function handleAllVenues(on) {
    const updated = on ? [...venues] : [];
    setSelfAssign(updated);
    await onSaveSelfAssign(user.uid, updated);
  }

  const initials  = user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel = user.role === 'venue_admin' ? `Venue admin · ${user.venueScope || ''}` : 'DJ';

  return (
    <div style={{borderBottom: isLast ? 'none' : '1px solid #1a1a2e'}}>
      {/* Header row */}
      <div
        onClick={onToggle}
        style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:'pointer',background: isOpen ? '#131320' : 'transparent'}}
      >
        <div style={{width:36,height:36,borderRadius:'50%',background:dotColor+'25',color:dotColor,border:`1.5px solid ${dotColor}60`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>
          {initials}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,color:'#ffffff'}}>{user.name}</div>
          <div style={{fontSize:11,color:'#8080a0',marginTop:2}}>
            {roleLabel} · {selfAssign.length} self-assign venue{selfAssign.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{fontSize:11,color:'#505070'}}>{isOpen ? '▲' : '▼'}</div>
      </div>

      {/* Expanded detail */}
      {isOpen && (
        <div style={{padding:'14px 16px 16px 64px',background:'#0a0a12',borderTop:'1px solid #1a1a2e'}}>

          <div style={{fontSize:11,color:'#8080a0',marginBottom:14}}>{user.email}</div>

          {/* Role */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,color:'#8080a0',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6,fontWeight:700}}>Role</div>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <select value={role} onChange={e => setRole(e.target.value)} style={{background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:12,padding:'6px 10px'}}>
                <option value="dj">DJ</option>
                <option value="venue_admin">Venue admin</option>
              </select>
              {role === 'venue_admin' && (
                <select value={scope} onChange={e => setScope(e.target.value)} style={{background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:12,padding:'6px 10px'}}>
                  {VENUE_ADMIN_SCOPES.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
                </select>
              )}
              {roleChanged && (
                <button onClick={handleSaveRole} className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? 'Saving…' : 'Save role'}
                </button>
              )}
              {saved && <span style={{fontSize:11,color:'#00ffc2'}}>✓ Saved</span>}
            </div>
          </div>

          {/* Self-assign venues */}
          <div style={{marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div style={{fontSize:10,color:'#8080a0',textTransform:'uppercase',letterSpacing:'0.07em',fontWeight:700}}>Self-assign venues</div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={() => handleAllVenues(true)}  style={{background:'transparent',border:'1px solid #2a2a40',color:'#8080a0',borderRadius:4,padding:'2px 8px',fontSize:10,cursor:'pointer'}}>All</button>
                <button onClick={() => handleAllVenues(false)} style={{background:'transparent',border:'1px solid #2a2a40',color:'#8080a0',borderRadius:4,padding:'2px 8px',fontSize:10,cursor:'pointer'}}>None</button>
              </div>
            </div>
            <div style={{fontSize:11,color:'#505070',marginBottom:8}}>Venues this DJ can book themselves — goes straight to confirmed. Saves instantly.</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {venues.map(venue => {
                const checked = selfAssign.includes(venue);
                const vc = getVenueColor(venue);
                return (
                  <button
                    key={venue}
                    onClick={() => handleToggleVenue(venue)}
                    style={{padding:'5px 11px',borderRadius:5,border:`1px solid ${checked ? vc.color+'60' : '#2a2a40'}`,background: checked ? vc.color+'18' : 'transparent',fontSize:12,color: checked ? vc.color : '#8080a0',cursor:'pointer',fontWeight: checked ? 600 : 400}}
                  >
                    {checked ? '✓ ' : ''}{venue}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remove */}
          <button
            onClick={() => { if (window.confirm(`Remove ${user.name} from the invite list?\n\nThey will no longer be able to log in. Their existing gigs are not deleted.`)) onRemove(); }}
            style={{background:'transparent',border:'1px solid #ff407040',color:'#ff4070',borderRadius:5,padding:'5px 12px',fontSize:11,cursor:'pointer'}}
          >
            Revoke access
          </button>
        </div>
      )}
    </div>
  );
}
