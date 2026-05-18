import React from 'react';
import { getVenueColor } from '../../lib/venueGroups';

export default function AccessTab({
  venues, newVenue, setNewVenue, venueSaved, onAddVenue, onRemoveVenue,
  editingVenue, editingVenueName, setEditingVenueName, onStartEditVenue, onRenameVenue, onCancelEditVenue,
  invites, newEmail, setNewEmail, inviteSaved, onAddInvite, onRemoveInvite,
}) {
  return (
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
                  <input
                    autoFocus
                    value={editingVenueName}
                    onChange={e => setEditingVenueName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') onRenameVenue(); if (e.key === 'Escape') onCancelEditVenue(); }}
                    style={{flex:1,background:'var(--bg-raised)',border:'1px solid var(--border-mid)',borderRadius:5,color:'var(--text-primary)',fontSize:13,padding:'5px 8px'}}
                  />
                  <button onClick={onRenameVenue} className="btn btn-primary btn-sm" style={{marginLeft:6}}>Save</button>
                  <button onClick={onCancelEditVenue} className="btn btn-ghost btn-sm" style={{marginLeft:4}}>Cancel</button>
                </>
              ) : (
                <>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:'#e8e8f0'}}>{venue}</div>
                    {vc.group && <div style={{fontSize:10,color:vc.color,marginTop:2}}>{vc.group}</div>}
                  </div>
                  <button onClick={() => onStartEditVenue(venue)} style={{background:'transparent',border:'1px solid #1e1e2e',color:'#6060a0',borderRadius:5,padding:'3px 10px',fontSize:11,cursor:'pointer',marginRight:6}}>Edit</button>
                  <button onClick={() => onRemoveVenue(venue)} style={{background:'transparent',border:'1px solid #ff407040',color:'#ff4070',borderRadius:5,padding:'3px 10px',fontSize:11,cursor:'pointer'}}>Remove</button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel" style={{marginBottom:32}}>
        <div className="panel-head">Add a venue</div>
        <div style={{padding:16,display:'flex',gap:10}}>
          <input
            type="text"
            placeholder="e.g. The Shelter"
            value={newVenue}
            onChange={e => setNewVenue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onAddVenue()}
            style={{flex:1,background:'var(--bg-raised)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text-primary)',fontSize:13,padding:'8px 10px'}}
          />
          <button className="btn btn-primary" onClick={onAddVenue} style={{whiteSpace:'nowrap'}}>
            {venueSaved ? '✓ Saved' : 'Add venue'}
          </button>
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
            <button onClick={() => onRemoveInvite(email)} style={{background:'transparent',border:'1px solid #ff407040',color:'#ff4070',borderRadius:5,padding:'3px 10px',fontSize:11,cursor:'pointer'}}>Remove</button>
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
            onKeyDown={e => e.key === 'Enter' && onAddInvite()}
            style={{flex:1,background:'var(--bg-raised)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text-primary)',fontSize:13,padding:'8px 10px'}}
          />
          <button className="btn btn-primary" onClick={onAddInvite} style={{whiteSpace:'nowrap'}}>
            {inviteSaved ? '✓ Saved' : 'Add invite'}
          </button>
        </div>
        <div style={{padding:'0 16px 14px',fontSize:11,color:'var(--text-muted)'}}>The DJ must log in using this exact Google account email address.</div>
      </div>
    </div>
  );
}
