import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getVenueColor, getVenueLogo } from '../../lib/venueGroups';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-IE', { weekday:'short', day:'numeric', month:'short' });
}

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDateRange(filter) {
  const today = new Date(); today.setHours(0,0,0,0);
  const dow     = (today.getDay() + 6) % 7;
  const thisMon = new Date(today); thisMon.setDate(today.getDate() - dow);
  const thisSun = new Date(thisMon); thisSun.setDate(thisMon.getDate() + 6);
  const nextMon = new Date(thisMon); nextMon.setDate(thisMon.getDate() + 7);
  const nextSun = new Date(nextMon); nextSun.setDate(nextMon.getDate() + 6);

  if (filter === 'week')     return { from: toIso(thisMon), to: toIso(thisSun) };
  if (filter === 'nextweek') return { from: toIso(nextMon), to: toIso(nextSun) };
  if (filter === 'month') {
    return { from: toIso(new Date(today.getFullYear(), today.getMonth(), 1)), to: toIso(new Date(today.getFullYear(), today.getMonth() + 1, 0)) };
  }
  if (filter === 'nextmonth') {
    return { from: toIso(new Date(today.getFullYear(), today.getMonth() + 1, 1)), to: toIso(new Date(today.getFullYear(), today.getMonth() + 2, 0)) };
  }
  if (filter === 'restofyear') {
    const start = new Date(today.getFullYear(), today.getMonth() + 2, 1);
    return { from: toIso(start), to: `${today.getFullYear()}-12-31` };
  }
  if (filter === 'completed') {
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    return { from: `${today.getFullYear()}-01-01`, to: toIso(yesterday) };
  }
  if (filter === 'all') {
    return { from: toIso(today), to: null };
  }
  return null;
}

function GigMenu({ g, onConfirm, onReject, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0, up: false });
  const btnRef  = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function handleScroll() { setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  function toggle(e) {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    const r  = btnRef.current.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < 200;
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left: r.right, up });
    setOpen(true);
  }

  const isPending    = g.status === 'pending';
  const isUnassigned = g.status === 'unassigned';
  const item = (color, weight) => ({
    width:'100%', padding:'10px 14px', background:'transparent', border:'none',
    borderBottom:'1px solid #1e1e2e', color, fontSize:12, fontWeight:weight, textAlign:'left', cursor:'pointer',
  });

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        style={{
          background: open ? '#2a2a40' : 'transparent',
          border:'1px solid #2a2a40', color:'#8080a0', borderRadius:6,
          width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', fontSize:14, fontWeight:700, lineHeight:1, flexShrink:0,
        }}
      >
        ⋯
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          onClick={e => e.stopPropagation()}
          style={{
            position:'fixed', zIndex:1000,
            top: pos.up ? undefined : pos.top,
            bottom: pos.up ? window.innerHeight - pos.top : undefined,
            left: pos.left, transform:'translateX(-100%)',
            background:'#131320', border:'1px solid #2a2a40', borderRadius:8, minWidth:150,
            boxShadow:'0 8px 24px #00000090', overflow:'hidden',
          }}
        >
          <button onClick={() => { onEdit(g); setOpen(false); }} style={item('#e8e8f0', 600)}>
            {isUnassigned ? '👤 Assign DJ' : '✏️ Edit gig'}
          </button>
          {!isUnassigned && (isPending ? (
            <>
              <button onClick={() => { onConfirm(g.id); setOpen(false); }} style={item('#00ffc2', 600)}>✓ Confirm</button>
              <button onClick={() => { onReject(g.id); setOpen(false); }}  style={item('#ff9900', 500)}>✕ Reject</button>
            </>
          ) : (
            <button onClick={() => { onConfirm(g.id); setOpen(false); }} style={item('#00ffc2', 500)}>✓ Re-confirm</button>
          ))}
          <button onClick={() => { onDelete(g); setOpen(false); }} style={{...item('#ff4070', 500), borderBottom:'none'}}>🗑 Delete</button>
        </div>,
        document.body
      )}
    </>
  );
}

function StatusPill({ status }) {
  const config = {
    confirmed:  { color:'#00ffc2', bg:'#00ffc215', border:'#00ffc230', label:'Confirmed' },
    pending:    { color:'#ffbb00', bg:'#ffbb0015', border:'#ffbb0030', label:'Pending' },
    rejected:   { color:'#ff4070', bg:'#ff407015', border:'#ff407030', label:'Rejected' },
    unassigned: { color:'#ff9900', bg:'#ff990015', border:'#ff990030', label:'Unassigned' },
  };
  const c = config[status] || config.pending;
  return (
    <span style={{fontSize:11,fontWeight:600,color:c.color,background:c.bg,border:`1px solid ${c.border}`,borderRadius:4,padding:'2px 7px',whiteSpace:'nowrap'}}>
      {c.label}
    </span>
  );
}

function GigCard({ g, hideFees, onConfirm, onReject, onEdit, onDelete, draggable = false }) {
  const vc   = getVenueColor(g.venue);
  const logo = getVenueLogo(g.venue);
  const [showNotes, setShowNotes] = useState(false);
  const [hover, setHover]         = useState(false);
  const [dragging, setDragging]   = useState(false);

  return (
    <div
      onClick={() => onEdit(g)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      draggable={draggable}
      onDragStart={e => {
        e.dataTransfer.setData('text/gig-id', g.id);
        e.dataTransfer.effectAllowed = 'move';
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      title={draggable ? 'Drag onto a DJ to assign, or click to edit' : 'Click to edit'}
      style={{
        borderBottom:'1px solid #1a1a2e', padding:'14px 16px',
        cursor: draggable ? 'grab' : 'pointer',
        background: hover ? '#12121e' : 'transparent', transition:'background 0.12s', position:'relative',
        opacity: dragging ? 0.4 : 1,
      }}
    >
      <div style={{display:'flex', alignItems:'flex-start', gap:12, marginBottom:8}}>
        {logo ? (
          <img src={logo} alt={g.venue} style={{width:40,height:40,borderRadius:7,objectFit:'cover',flexShrink:0}} onError={e=>{e.target.style.display='none';}} />
        ) : (
          <div style={{width:40,height:40,borderRadius:7,background:'#1a1a2e',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:vc.color}} />
          </div>
        )}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,color:'#ffffff',lineHeight:1.3}}>{g.venue}</div>
          <div style={{fontSize:12,color:'#d0d0e8',marginTop:3,whiteSpace:'nowrap'}}>{formatDate(g.date)} · {g.time}</div>
        </div>
        <GigMenu g={g} onConfirm={onConfirm} onReject={onReject} onEdit={onEdit} onDelete={onDelete} />
      </div>

      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <StatusPill status={g.status} />
        {!hideFees && g.fee && <span style={{fontSize:13,color:'#00ffc2',fontWeight:700}}>€{g.fee}</span>}
        {g.notes && (
          <button
            onClick={e => { e.stopPropagation(); setShowNotes(n => !n); }}
            style={{background:'transparent',border:'none',color:'#ffbb00',fontSize:11,cursor:'pointer',padding:0,marginLeft:'auto'}}
          >
            📌 {showNotes ? 'Hide' : 'Note'}
          </button>
        )}
        {hover && !g.notes && (
          <span style={{marginLeft:'auto',fontSize:10,color:'#505070'}}>{draggable ? 'Drag to a DJ' : 'Click to edit'}</span>
        )}
      </div>

      {g.notes && showNotes && (
        <div onClick={e => e.stopPropagation()} style={{fontSize:11,color:'#ffdd80',marginTop:8,background:'#1a1400',border:'1px solid #ffbb0030',borderRadius:5,padding:'7px 9px'}}>
          {g.notes}
        </div>
      )}
    </div>
  );
}

function UnassignedColumn({ gigs, hideFees, onConfirm, onReject, onEdit, onDelete }) {
  // Permanent fixture: shows ALL unassigned gigs regardless of the date filter.
  const matched = gigs
    .filter(g => g.status === 'unassigned')
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

  const empty = matched.length === 0;

  return (
    <div style={{
      background: empty ? '#0d0d18' : '#140d02',
      border: empty ? '1px solid #1e1e30' : '1px solid #ff990040',
      borderRadius:10, overflow:'hidden', flex:'1 1 280px', minWidth:260,
    }}>
      <div style={{padding:'14px 16px', borderBottom: empty ? '1px solid #1e1e30' : '1px solid #ff990030', display:'flex', alignItems:'center', gap:10, background: empty ? '#131320' : '#1a1000'}}>
        <div style={{
          width:34,height:34,borderRadius:'50%',
          background: empty ? '#00ffc215' : '#ff990025',
          color: empty ? '#00ffc2' : '#ff9900',
          border: `1.5px solid ${empty ? '#00ffc240' : '#ff990060'}`,
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,flexShrink:0,
        }}>
          {empty ? '✓' : '!'}
        </div>
        <div style={{fontSize:14,fontWeight:700,color: empty ? '#8080a0' : '#ff9900'}}>Unassigned</div>
      </div>

      {empty ? (
        <div style={{padding:'22px 16px',textAlign:'center',color:'#505070',fontSize:12}}>
          All gigs assigned ✓
        </div>
      ) : (
        matched.map(g => (
          <GigCard key={g.id} g={g} hideFees={hideFees} draggable onConfirm={onConfirm} onReject={onReject} onEdit={onEdit} onDelete={onDelete} />
        ))
      )}
    </div>
  );
}

function DJColumn({ dj, gigs, dotColor, hideFees, filter, onConfirm, onReject, onEdit, onDelete, onDropAssign }) {
  const range = getDateRange(filter);
  const [dragOver, setDragOver] = useState(false);

  const matched = gigs
    .filter(g => {
      const matchUid  = g.djUid === dj.uid;
      const matchName = g.djName && dj.name && g.djName.toLowerCase() === dj.name.toLowerCase();
      if (!(matchUid || matchName)) return false;
      if (g.status === 'rejected') return false;
      if (g.status === 'unassigned') return false;
      if (range) {
        if (range.from && g.date < range.from) return false;
        if (range.to && g.date > range.to) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (filter === 'completed') {
        return b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || '');
      }
      return a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '');
    });

  const initials = dj.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      onDragOver={e => {
        if (e.dataTransfer.types.includes('text/gig-id')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDragOver(true);
        }
      }}
      onDragLeave={e => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false);
      }}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        const gigId = e.dataTransfer.getData('text/gig-id');
        if (gigId && onDropAssign) onDropAssign(gigId, dj);
      }}
      style={{
        background: dragOver ? '#0d1a14' : '#0d0d18',
        border: dragOver ? `2px dashed ${dotColor}` : '1px solid #1e1e30',
        borderRadius:10, overflow:'hidden', flex:'1 1 280px', minWidth:260,
        transition:'background 0.12s, border 0.12s',
      }}
    >
      <div style={{padding:'14px 16px', borderBottom:'1px solid #1e1e30', display:'flex', alignItems:'center', gap:10, background: dragOver ? dotColor+'15' : '#131320'}}>
        <div style={{width:34,height:34,borderRadius:'50%',background:dotColor+'25',color:dotColor,border:`1.5px solid ${dotColor}60`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>
          {initials}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,color:'#ffffff',whiteSpace:'nowrap'}}>{dj.name}</div>
          <div style={{fontSize:11,color:'#8080a0',marginTop:1}}>
            {dragOver ? 'Drop to assign' : `${matched.length} gig${matched.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {matched.length === 0 ? (
        <div style={{padding:'22px 16px',textAlign:'center',color:'#505070',fontSize:12}}>No gigs in this period</div>
      ) : (
        matched.map(g => (
          <GigCard key={g.id} g={g} hideFees={hideFees} onConfirm={onConfirm} onReject={onReject} onEdit={onEdit} onDelete={onDelete} />
        ))
      )}
    </div>
  );
}

const DOT_COLORS = ['#00d4aa','#a080ff','#40a0ff','#ff60c0','#ffbb00','#80d040'];
const FILTERS = [
  { key:'week',       label:'This week' },
  { key:'nextweek',   label:'Next week' },
  { key:'month',      label:'This month' },
  { key:'nextmonth',  label:'Next month' },
  { key:'restofyear', label:'Rest of year' },
  { key:'completed',  label:'Completed' },
  { key:'all',        label:'All' },
];

export default function GigList({ gigs, users = [], hideFees, onConfirm, onReject, onEdit, onDelete, onDropAssign }) {
  const [filter, setFilter]       = useState('week');
  const [hiddenDJs, setHiddenDJs] = useState({});

  const pending = gigs.filter(g => g.status === 'pending');

  function toggleDJ(uid) {
    setHiddenDJs(h => ({ ...h, [uid]: !h[uid] }));
  }

  const visibleUsers = users.filter(dj => !hiddenDJs[dj.uid]);
  const range        = getDateRange(filter);

  const rangeLabel = range
    ? range.to
      ? `${formatDate(range.from)} – ${formatDate(range.to)}`
      : `${formatDate(range.from)} onwards`
    : null;

  return (
    <div className="page-body">
      {pending.length > 0 && (
        <div style={{background:'#2a1800',border:'1px solid #ffbb0040',borderRadius:8,padding:'10px 16px',marginBottom:16,display:'flex',alignItems:'center'}}>
          <span style={{fontSize:13,color:'#ffbb00',fontWeight:700}}>
            ⏳ {pending.length} pending gig{pending.length !== 1 ? 's' : ''} need{pending.length === 1 ? 's' : ''} action
          </span>
        </div>
      )}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',gap:4,flexWrap:'wrap',alignItems:'center'}}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                background: filter === f.key ? '#00ffc220' : 'transparent',
                border: `1px solid ${filter === f.key ? '#00ffc250' : '#2a2a40'}`,
                color: filter === f.key ? '#00ffc2' : '#8080a0',
                borderRadius:5, padding:'4px 10px', fontSize:11, cursor:'pointer', whiteSpace:'nowrap',
              }}
            >
              {f.label}
            </button>
          ))}
          {rangeLabel && <span style={{fontSize:11,color:'#505070',marginLeft:6}}>{rangeLabel}</span>}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => onEdit(null)}>+ Assign gig</button>
      </div>

      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
        {users.map((dj, i) => {
          const hidden   = hiddenDJs[dj.uid];
          const dotColor = DOT_COLORS[i % DOT_COLORS.length];
          return (
            <button
              key={dj.uid}
              onClick={() => toggleDJ(dj.uid)}
              style={{
                display:'flex', alignItems:'center', gap:6,
                background: hidden ? 'transparent' : dotColor+'15',
                border: `1px solid ${hidden ? '#2a2a40' : dotColor+'50'}`,
                borderRadius:20, padding:'4px 12px', cursor:'pointer',
                color: hidden ? '#505070' : dotColor,
                fontSize:11, fontWeight:600, opacity: hidden ? 0.5 : 1, transition:'all 0.15s',
              }}
            >
              <div style={{width:6,height:6,borderRadius:'50%',background:hidden?'#505070':dotColor}} />
              {dj.name.split(' ')[0]}
            </button>
          );
        })}
      </div>

      <div style={{display:'flex', gap:12, alignItems:'flex-start', width:'100%', flexWrap:'wrap'}}>
        <UnassignedColumn
          gigs={gigs} hideFees={hideFees}
          onConfirm={onConfirm} onReject={onReject} onEdit={onEdit} onDelete={onDelete}
        />
        {visibleUsers.map(dj => (
          <DJColumn
            key={dj.uid} dj={dj} gigs={gigs}
            dotColor={DOT_COLORS[users.indexOf(dj) % DOT_COLORS.length]}
            hideFees={hideFees} filter={filter}
            onConfirm={onConfirm} onReject={onReject} onEdit={onEdit} onDelete={onDelete}
            onDropAssign={onDropAssign}
          />
        ))}
      </div>
    </div>
  );
}
