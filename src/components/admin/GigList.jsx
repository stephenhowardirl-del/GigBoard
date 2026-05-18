import React from 'react';
import { getVenueColor } from '../../lib/venueGroups';

function statusBadge(status) {
  return <span className={`badge badge-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-IE', { weekday:'short', day:'numeric', month:'short' });
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

export default function GigList({ gigs, onConfirm, onReject, onEdit, onDelete }) {
  const today     = new Date().toISOString().split('T')[0];
  const now       = new Date();
  const upcoming  = gigs.filter(g => g.status !== 'rejected' && g.date >= today);
  const pending   = gigs.filter(g => g.status === 'pending');
  const thisMonth = gigs.filter(g => {
    const d = new Date(g.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  return (
    <div className="page-body">
      <div className="stats-row">
        <div className="stat-card"><div className="stat-label">Upcoming</div><div className="stat-val neon">{upcoming.length}</div></div>
        <div className="stat-card"><div className="stat-label">Pending</div><div className="stat-val pending">{pending.length}</div></div>
        <div className="stat-card"><div className="stat-label">This month</div><div className="stat-val">{thisMonth.length}</div></div>
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
        <button className="btn btn-primary btn-sm" onClick={() => onEdit(null)}>+ Assign gig</button>
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
                  <button className="btn btn-primary btn-sm" onClick={() => onConfirm(g.id)}>Confirm</button>
                  <button className="btn btn-danger btn-sm" onClick={() => onReject(g.id)}>Reject</button>
                </>}
                {g.status !== 'pending' && statusBadge(g.status)}
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit(g)} style={{fontSize:11,padding:'3px 8px'}}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => onDelete(g)} style={{fontSize:11,padding:'3px 8px'}}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
