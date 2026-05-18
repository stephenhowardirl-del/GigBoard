import React, { useState } from 'react';
import { getVenueColor, VENUE_ADMIN_SCOPES } from '../../lib/venueGroups';

const DOT_COLORS = ['#00d4aa','#a080ff','#40a0ff','#ff60c0','#ffbb00','#80d040'];

export default function RosterTab({ users, venues, onSaveRole, onSaveSelfAssign }) {
  return (
    <div className="page-body">
      <div className="section-title">Manage DJ roster &amp; permissions</div>
      <div className="panel">
        <div className="panel-head">
          Active DJs
          <span style={{fontSize:10,color:'var(--text-muted)',fontWeight:400,textTransform:'none',letterSpacing:0}}>Change permissions anytime</span>
        </div>
        {users.length === 0 && <div className="empty-state">No DJs yet — share the link so they can log in.</div>}
        {users.map((u, i) => (
          <RosterRow
            key={u.uid}
            user={u}
            dotColor={DOT_COLORS[i % DOT_COLORS.length]}
            onSave={onSaveRole}
            venues={venues}
            onSaveSelfAssign={onSaveSelfAssign}
          />
        ))}
      </div>
    </div>
  );
}

function RosterRow({ user, dotColor, onSave, venues, onSaveSelfAssign }) {
  const [role, setRole]               = useState(user.role || 'dj');
  const [scope, setScope]             = useState(user.venueScope || VENUE_ADMIN_SCOPES[0]?.label || '');
  const [selfAssign, setSelfAssign]   = useState(user.selfAssignVenues || []);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [selfAssignSaved, setSelfAssignSaved] = useState(false);
  const [showVenues, setShowVenues]   = useState(false);

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
