import React, { useState, useRef, useEffect } from 'react';
import { getVenueColor, getVenueLogo } from '../../lib/venueGroups';

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

function GigMenu({ g, onConfirm, onReject, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isPending = g.status === 'pending';

  return (
    <div ref={ref} style={{position:'relative', flexShrink:0}}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? '#2a2a40' : 'transparent',
          border: '1px solid #2a2a40',
          color: '#d0d0e8',
          borderRadius: 6,
          width: 30, height: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 16, fontWeight: 700,
          transition: 'background 0.15s',
        }}
      >
        ⋯
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 36, right: 0, zIndex: 100,
          background: '#131320', border: '1px solid #2a2a40',
          borderRadius: 8, minWidth: 150,
          boxShadow: '0 8px 24px #00000080',
          overflow: 'hidden',
        }}>
          {isPending && (
            <>
              <button
                onClick={() => { onConfirm(g.id); setOpen(false); }}
                style={{width:'100%', padding:'10px 14px', background:'transparent', border:'none', borderBottom:'1px solid #1e1e2e', color:'#00ffc2', fontSize:13, fontWeight:600, textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:8}}
              >
                ✓ Confirm
              </button>
              <button
                onClick={() => { onReject(g.id); setOpen(false); }}
                style={{width:'100%', padding:'10px 14px', background:'transparent', border:'none', borderBottom:'1px solid #1e1e2e', color:'#ff9900', fontSize:13, fontWeight:500, textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:8}}
              >
                ✕ Reject
              </button>
            </>
          )}
          {!isPending && (
            <button
              onClick={() => { onConfirm(g.id); setOpen(false); }}
              style={{width:'100%', padding:'10px 14px', background:'transparent', border:'none', borderBottom:'1px solid #1e1e2e', color:'#00ffc2', fontSize:13, fontWeight:500, textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:8}}
            >
              ✓ Re-confirm
            </button>
          )}
          <button
            onClick={() => { onEdit(g); setOpen(false); }}
            style={{width:'100%', padding:'10px 14px', background:'transparent', border:'none', borderBottom:'1px solid #1e1e2e', color:'#e8e8f0', fontSize:13, fontWeight:500, textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:8}}
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => { onDelete(g); setOpen(false); }}
            style={{width:'100%', padding:'10px 14px', background:'transparent', border:'none', color:'#ff4070', fontSize:13, fontWeight:500, textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:8}}
          >
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const config = {
    confirmed: { color:'#00ffc2', bg:'#00ffc215', border:'#00ffc230', label:'Confirmed' },
    pending:   { color:'#ffbb00', bg:'#ffbb0015', border:'#ffbb0030', label:'Pending' },
    rejected:  { color:'#ff4070', bg:'#ff407015', border:'#ff407030', label:'Rejected' },
  };
  const c = config[status] || config.pending;
  return (
    <span style={{fontSize:11, fontWeight:600, color:c.color, background:c.bg, border:`1px solid ${c.border}`, borderRadius:4, padding:'2px 8px'}}>
      {c.label}
    </span>
  );
}

function GigCard({ g, hideFees, onConfirm, onReject, onEdit, onDelete }) {
  const vc   = getVenueColor(g.venue);
  const logo = getVenueLogo(g.venue);

  return (
    <div style={{borderBottom:'1px solid #1a1a2e', padding:'14px 16px'}}>
      <div style={{display:'flex', alignItems:'flex-start', gap:12}}>
        {/* Logo */}
        <div style={{flexShrink:0}}>
          {logo ? (
            <img src={logo} alt={g.venue} style={{width:44, height:44, borderRadius:8, objectFit:'cover'}} onError={e=>{e.target.style.display='none';}} />
          ) : (
            <div style={{width:44, height:44, borderRadius:8, background:'#1a1a2e', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <div style={{width:10, height:10, borderRadius:'50%', background:vc.color}} />
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:14, fontWeight:700, color:'#ffffff', marginBottom:3}}>{g.venue}</div>
          <div style={{fontSize:12, color:'#d0d0e8', fontWeight:500, marginBottom:2}}>{formatDate(g.date)}</div>
          <div style={{fontSize:12, color:'#d0d0e8', fontWeight:500, marginBottom:6}}>{g.time}</div>
          <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
            <StatusPill status={g.status} />
            {!hideFees && g.fee && <span style={{fontSize:13, color:'#00ffc2', fontWeight:700}}>€{g.fee}</span>}
          </div>
          {g.notes && (
            <div style={{fontSize:11, color:'#ffdd80', marginTop:8, background:'#1a1400', border:'1px solid #ffbb0030', borderRadius:4, padding:'5px 8px'}}>
              📌 {g.notes}
            </div>
          )}
        </div>

        {/* Menu */}
        <GigMenu g={g} onConfirm={onConfirm} onReject={onReject} onEdit={onEdit} onDelete={onDelete} />
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
      background: '#0d0d18', border: '1px solid #1e1e30',
      borderRadius: 10, overflow: 'hidden',
      flex: 1, minWidth: 0,
    }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #1e1e30',
        display: 'flex', alignItems: 'center', gap: 10, background: '#131320',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: dotColor + '25', color: dotColor,
          border: `1.5px solid ${dotColor}60`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:14, fontWeight:700, color:'#ffffff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{dj.name.split(' ')[0]}</div>
          <div style={{fontSize:11, color:'#8080a0', marginTop:2}}>{upcoming.length} gig{upcoming.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {upcoming.length === 0 ? (
        <div style={{padding:'24px 16px', textAlign:'center', color:'#505070', fontSize:12}}>
          No gigs in this period
        </div>
      ) : (
        upcoming.map(g => (
          <GigCard
            key={g.id} g={g} hideFees={hideFees}
            onConfirm={onConfirm} onReject={onReject}
            onEdit={onEdit} onDelete={onDelete}
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
  const [filter, setFilter]         = useState('month');
  const [hiddenDJs, setHiddenDJs]   = useState({});

  const pending = gigs.filter(g => g.status === 'pending');

  function toggleDJ(uid) {
    setHiddenDJs(h => ({ ...h, [uid]: !h[uid] }));
  }

  const visibleUsers = users.filter(dj => !hiddenDJs[dj.uid]);

  return (
    <div className="page-body">
      {pending.length > 0 && (
        <div style={{
          background:'#2a1800', border:'1px solid #ffbb0040', borderRadius:8,
          padding:'10px 16px', marginBottom:16,
          display:'flex', alignItems:'center', gap:10,
        }}>
          <span style={{fontSize:13, color:'#ffbb00', fontWeight:700}}>
            ⏳ {pending.length} pending gig{pending.length !== 1 ? 's' : ''} need{pending.length === 1 ? 's' : ''} action
          </span>
        </div>
      )}

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:8}}>
        <div style={{display:'flex', gap:4}}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                background: filter === f.key ? '#00ffc220' : 'transparent',
                border: `1px solid ${filter === f.key ? '#00ffc250' : '#2a2a40'}`,
                color: filter === f.key ? '#00ffc2' : '#8080a0',
                borderRadius: 5, padding: '4px 12px', fontSize: 11, cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => onEdit(null)}>+ Assign gig</button>
      </div>

      <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:14}}>
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
                border: `1px solid ${hidden ? '#2a2a40' : dotColor + '50'}`,
                borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
                color: hidden ? '#505070' : dotColor,
                fontSize: 11, fontWeight: 600,
                opacity: hidden ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              <div style={{width:6, height:6, borderRadius:'50%', background: hidden ? '#505070' : dotColor}} />
              {dj.name.split(' ')[0]}
            </button>
          );
        })}
      </div>

      <div style={{display:'flex', gap:12, alignItems:'flex-start', width:'100%'}}>
        {visibleUsers.map((dj, i) => (
          <DJColumn
            key={dj.uid} dj={dj} gigs={gigs}
            dotColor={DOT_COLORS[users.indexOf(dj) % DOT_COLORS.length]}
            hideFees={hideFees} filter={filter}
            onConfirm={onConfirm} onReject={onReject}
            onEdit={onEdit} onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
