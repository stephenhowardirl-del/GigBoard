import React, { useState } from 'react';
import { getVenueColor, getVenueLogo } from '../../lib/venueGroups';

function statusBadge(status) {
  return <span className={`badge badge-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-IE', { weekday:'short', day:'numeric', month:'short' });
}

function getDateRange(filter) {
  const today = new Date(); today.setHours(0,0,0,0);
  if (filter === 'week') {
    const end = new Date(today); end.setDate(end.getDate() + 7);
    return { from: today.toISOString().split('T')[0], to: end.toISOString().split('T')[0] };
  }
  if (filter === 'month') {
    const end = new Date(today); end.setMonth(end.getMonth() + 1);
    return { from: today.toISOString().split('T')[0], to: end.toISOString().split('T')[0] };
  }
  return null;
}

function GigCard({ g, hideFees, onConfirm, onReject, onEdit, onDelete }) {
  const vc   = getVenueColor(g.venue);
  const logo = getVenueLogo(g.venue);

  return (
    <div style={{
      borderBottom: '1px solid var(--bg-raised)',
      padding: '12px 14px',
    }}>
      <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:8}}>
        {logo ? (
          <img
            src={logo}
            alt={g.venue}
            style={{width:40, height:40, borderRadius:8, objectFit:'cover', flexShrink:0}}
            onError={e => { e.target.style.display='none'; }}
          />
        ) : (
          <div style={{
            width:40, height:40, borderRadius:8,
            background:'var(--bg-raised)', flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <div style={{width:10, height:10, borderRadius:'50%', background:'#4040608'}} />
          </div>
        )}
        <div style={{fontSize:13, fontWeight:600, color:'#e8e8f0', lineHeight:1.3}}>{g.venue}</div>
      </div>
      <div style={{fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:2}}>{formatDate(g.date)}</div>
      <div style={{fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:4}}>{g.time}</div>
      {!hideFees && g.fee && <div style={{fontSize:13, color:'#00ffc2', fontWeight:700, marginBottom:6}}>€{g.fee}</div>}
      {g.notes && <div style={{fontSize:11, color:'#ffdd80', marginBottom:8, background:'#1a1400', border:'1px solid #ffbb0030', borderRadius:4, padding:'5px 8px'}}>📌 {g.notes}</div>}
      <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
        {g.status === 'pending' && <>
          <button className="btn btn-primary btn-sm" onClick={() => onConfirm(g.id)} style={{fontSize:10,padding:'3px 10px'}}>Confirm</button>
          <button className="btn btn-danger btn-sm" onClick={() => onReject(g.id)} style={{fontSize:10,padding:'3px 10px'}}>Reject</button>
        </>}
        {g.status !== 'pending' && statusBadge(g.status)}
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(g)} style={{fontSize:10,padding:'3px 10px'}}>Edit</button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(g)} style={{fontSize:10,padding:'3px 10px'}}>Del</button>
      </div>
    </div>
  );
}

function DJColumn({ dj, gigs, dotColor, hideFees, filter, onConfirm, onReject, onEdit, onDelete }) {
  const today = new Date().toISOString().split('T')[0];
  const range = getDateRange(filter);

  const upcoming = gigs
    .filter(g => {
      const matchUid  = g.djUid === dj.uid;
      const matchName = g.djName && dj.name && g.djName.toLowerCase() === dj.name.toLowerCase();
      if (!(matchUid || matchName)) return false;
      if (g.status === 'rejected') return false;
      if (g.date < today) return false;
      if (range) return g.date >= range.from && g.date <= range.to;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const initials = dj.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      width: 260,
      minWidth: 260,
      flexShrink: 0,
    }}>
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--bg-raised)',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: dotColor + '20', color: dotColor,
          border: `1px solid ${dotColor}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:13, fontWeight:600, color:'#e8e8f0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{dj.name}</div>
          <div style={{fontSize:11, color:'var(--text-muted)', marginTop:2}}>{upcoming.length} gig{upcoming.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {upcoming.length === 0 ? (
        <div style={{padding:'24px 14px', textAlign:'center', color:'var(--text-muted)', fontSize:12}}>
          No gigs in this period
        </div>
      ) : (
        upcoming.map(g => (
          <GigCard
            key={g.id}
            g={g}
            hideFees={hideFees}
            onConfirm={onConfirm}
            onReject={onReject}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );
}

const DOT_COLORS = ['#00d4aa','#a080ff','#40a0ff','#ff60c0','#ffbb00','#80d040'];
const FILTERS = [
  { key: 'week',  label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'all',   label: 'All' },
];

export default function GigList({ gigs, users = [], hideFees, onConfirm, onReject, onEdit, onDelete }) {
  const [filter, setFilter]       = useState('month');
  const [hiddenDJs, setHiddenDJs] = useState({});

  const today     = new Date().toISOString().split('T')[0];
  const now       = new Date();
  const upcoming  = gigs.filter(g => g.status !== 'rejected' && g.date >= today);
  const pending   = gigs.filter(g => g.status === 'pending');
  const thisMonth = gigs.filter(g => {
    const d = new Date(g.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  function toggleDJ(uid) {
    setHiddenDJs(h => ({ ...h, [uid]: !h[uid] }));
  }

  const visibleUsers = users.filter(dj => !hiddenDJs[dj.uid]);

  return (
    <div className="page-body">
      <div className="stats-row">
        <div className="stat-card"><div className="stat-label">Upcoming</div><div className="stat-val neon">{upcoming.length}</div></div>
        <div className="stat-card"><div className="stat-label">Pending</div><div className="stat-val pending">{pending.length}</div></div>
        <div className="stat-card"><div className="stat-label">This month</div><div className="stat-val">{thisMonth.length}</div></div>
      </div>

      {/* Controls row */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, flexWrap:'wrap', gap:8}}>
        <div style={{display:'flex', gap:4}}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                background: filter === f.key ? '#00ffc220' : 'transparent',
                border: `1px solid ${filter === f.key ? '#00ffc250' : 'var(--border)'}`,
                color: filter === f.key ? '#00ffc2' : 'var(--text-muted)',
                borderRadius: 5, padding: '4px 12px', fontSize: 11, cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => onEdit(null)}>+ Assign gig</button>
      </div>

      {/* DJ toggle pills */}
      <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:12}}>
        {users.map((dj, i) => {
          const hidden   = hiddenDJs[dj.uid];
          const dotColor = DOT_COLORS[i % DOT_COLORS.length];
          return (
            <button
              key={dj.uid}
              onClick={() => toggleDJ(dj.uid)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: hidden ? 'transparent' : dotColor + '15',
                border: `1px solid ${hidden ? 'var(--border)' : dotColor + '50'}`,
                borderRadius: 20, padding: '4px 10px', cursor: 'pointer',
                color: hidden ? 'var(--text-muted)' : dotColor,
                fontSize: 11, fontWeight: 500,
                opacity: hidden ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              <div style={{width:6, height:6, borderRadius:'50%', background: hidden ? 'var(--text-muted)' : dotColor}} />
              {dj.name.split(' ')[0]}
            </button>
          );
        })}
      </div>

      <div style={{
        display: 'flex',
        gap: 14,
        overflowX: 'auto',
        alignItems: 'flex-start',
        paddingBottom: 16,
      }}>
        {visibleUsers.map((dj, i) => (
          <DJColumn
            key={dj.uid}
            dj={dj}
            gigs={gigs}
            dotColor={DOT_COLORS[users.indexOf(dj) % DOT_COLORS.length]}
            hideFees={hideFees}
            filter={filter}
            onConfirm={onConfirm}
            onReject={onReject}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
