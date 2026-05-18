import React, { useState } from 'react';
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

function DJColumn({ dj, gigs, dotColor, onConfirm, onReject, onEdit, onDelete }) {
  const today    = new Date().toISOString().split('T')[0];
  const upcoming = gigs
    .filter(g => g.djUid === dj.uid && g.status !== 'rejected' && g.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const initials = dj.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      minWidth: 0,
      flex: '1 1 200px',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--bg-raised)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: dotColor + '20', color: dotColor,
          border: `1px solid ${dotColor}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:12, fontWeight:600, color:'#e8e8f0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{dj.name}</div>
          <div style={{fontSize:10, color:'var(--text-muted)', marginTop:1}}>{upcoming.length} upcoming</div>
        </div>
      </div>

      {upcoming.length === 0 ? (
        <div style={{padding:'20px 14px', textAlign:'center', color:'var(--text-muted)', fontSize:12}}>
          No upcoming gigs
        </div>
      ) : (
        upcoming.map(g => {
          const vc = getVenueColor(g.venue);
          return (
            <div key={g.id} style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--bg-raised)',
              borderLeft: `3px solid ${vc.color}`,
            }}>
              <div style={{fontSize:12, fontWeight:500, color:'#e8e8f0'}}>{g.venue}</div>
              <VenueBadge venue={g.venue} />
              <div style={{fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:4}}>{formatDate(g.date)}</div>
              <div style={{fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)'}}>{g.time}</div>
              {g.fee && <div style={{fontSize:11, color:'#00ffc2', fontWeight:600, marginTop:3}}>€{g.fee}</div>}
              {g.notes && <div style={{fontSize:10, color:'#ffdd80', marginTop:4, background:'#1a1400', border:'1px solid #ffbb0030', borderRadius:4, padding:'4px 6px'}}>📌 {g.notes}</div>}
              <div style={{display:'flex', gap:4, marginTop:8, flexWrap:'wrap'}}>
                {g.status === 'pending' && <>
                  <button className="btn btn-primary btn-sm" onClick={() => onConfirm(g.id)} style={{fontSize:10,padding:'2px 8px'}}>Confirm</button>
                  <button className="btn btn-danger btn-sm" onClick={() => onReject(g.id)} style={{fontSize:10,padding:'2px 8px'}}>Reject</button>
                </>}
                {g.status !== 'pending' && statusBadge(g.status)}
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit(g)} style={{fontSize:10,padding:'2px 8px'}}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => onDelete(g)} style={{fontSize:10,padding:'2px 8px'}}>Del</button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

const DOT_COLORS = ['#00d4aa','#a080ff','#40a0ff','#ff60c0','#ffbb00','#80d040'];

export default function GigList({ gigs, users = [], onConfirm, onReject, onEdit, onDelete }) {
  const [view, setView] = useState('columns');
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

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <div style={{display:'flex', gap:4}}>
          <button
            onClick={() => setView('columns')}
            style={{
              background: view === 'columns' ? '#00ffc220' : 'transparent',
              border: `1px solid ${view === 'columns' ? '#00ffc250' : 'var(--border)'}`,
              color: view === 'columns' ? '#00ffc2' : 'var(--text-muted)',
              borderRadius: 5, padding: '4px 12px', fontSize: 11, cursor: 'pointer',
            }}
          >
            By DJ
          </button>
          <button
            onClick={() => setView('list')}
            style={{
              background: view === 'list' ? '#00ffc220' : 'transparent',
              border: `1px solid ${view === 'list' ? '#00ffc250' : 'var(--border)'}`,
              color: view === 'list' ? '#00ffc2' : 'var(--text-muted)',
              borderRadius: 5, padding: '4px 12px', fontSize: 11, cursor: 'pointer',
            }}
          >
            List
          </button>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => onEdit(null)}>+ Assign gig</button>
      </div>

      {view === 'columns' && (
        <div style={{display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-start'}}>
          {users.map((dj, i) => (
            <DJColumn
              key={dj.uid}
              dj={dj}
              gigs={gigs}
              dotColor={DOT_COLORS[i % DOT_COLORS.length]}
              onConfirm={onConfirm}
              onReject={onReject}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {view === 'list' && (
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
      )}
    </div>
  );
}
