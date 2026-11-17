import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getVenueColor, getVenueLogo } from '../../lib/venueGroups';
import PeriodNav, { getPeriodRange } from '../PeriodNav';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-IE', { weekday:'short', day:'numeric', month:'short' });
}

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function addDaysIso(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toIso(d);
}

function mondayOf(iso) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toIso(d);
}

function formatDayMonth(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-IE', { day:'numeric', month:'short' });
}

function belongsTo(g, dj) {
  return g.djUid === dj.uid || (g.djName && dj.name && g.djName.toLowerCase() === dj.name.toLowerCase());
}

// A DJ's gigs inside the viewed period, in date and time order.
function gigsForDJ(dj, gigs, range) {
  return gigs
    .filter(g => {
      if (!belongsTo(g, dj)) return false;
      if (g.status === 'rejected' || g.status === 'unassigned') return false;
      if (range.from && g.date < range.from) return false;
      if (range.to && g.date > range.to) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
}

// Stack / cap the DJ columns on phones instead of crushing them side by side.
function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mobile;
}

function isNightTime(time) {
  if (!time) return false;
  const hour = parseInt(time.split(':')[0], 10);
  return hour >= 18 || hour < 6;
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
    borderBottom:'1px solid var(--border)', color, fontSize:12, fontWeight:weight, textAlign:'left', cursor:'pointer',
  });

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        style={{
          background: open ? 'var(--border-mid)' : 'transparent',
          border:'1px solid var(--border-mid)', color:'var(--text-secondary)', borderRadius:6,
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
            background:'var(--bg-raised)', border:'1px solid var(--border-mid)', borderRadius:8, minWidth:150,
            boxShadow:'0 8px 24px #00000090', overflow:'hidden',
          }}
        >
          <button onClick={() => { onEdit(g); setOpen(false); }} style={item('var(--text-primary)', 600)}>
            {isUnassigned ? '👤 Assign DJ' : '✏️ Edit gig'}
          </button>
          {!isUnassigned && (isPending ? (
            <>
              <button onClick={() => { onConfirm(g.id); setOpen(false); }} style={item('var(--ok)', 600)}>✓ Confirm</button>
              <button onClick={() => { onReject(g.id); setOpen(false); }}  style={item('#ff9900', 500)}>✕ Reject</button>
            </>
          ) : (
            <button onClick={() => { onConfirm(g.id); setOpen(false); }} style={item('var(--ok)', 500)}>✓ Re-confirm</button>
          ))}
          <button onClick={() => { onDelete(g); setOpen(false); }} style={{...item('var(--danger)', 500), borderBottom:'none'}}>🗑 Delete</button>
        </div>,
        document.body
      )}
    </>
  );
}

function StatusPill({ status }) {
  // Confirmed is the silent default — no pill. Unassigned needs no pill either:
  // the orange Unassigned column already says it. Only real exceptions get a badge.
  if (status === 'confirmed' || status === 'unassigned') return null;
  const config = {
    pending:    { color:'var(--pending)', bg:'var(--pending-bg)', border:'var(--pending-border)', label:'Pending' },
    rejected:   { color:'var(--danger)', bg:'var(--danger-bg)', border:'var(--danger-border)', label:'Rejected' },
  };
  const c = config[status];
  if (!c) return null;
  return (
    <span style={{fontSize:11,fontWeight:600,color:c.color,background:c.bg,border:`1px solid ${c.border}`,borderRadius:4,padding:'2px 7px',whiteSpace:'nowrap'}}>
      {c.label}
    </span>
  );
}

function GigCard({ g, hideFees, onConfirm, onReject, onEdit, onDelete, draggable = false }) {
  const vc      = getVenueColor(g.venue);
  const logo    = getVenueLogo(g.venue);
  const today   = todayStr();
  const isToday = g.date === today;
  const isPast  = g.date < today;
  const isException = g.status !== 'confirmed' && g.status !== 'unassigned';
  const [showNotes, setShowNotes] = useState(false);
  const [hover, setHover]         = useState(false);
  const [dragging, setDragging]   = useState(false);
  const canDrag = draggable && !isPast;

  // Bottom row only renders when it has content: a today tag, a status badge, or a note.
  const hasBottomRow = isToday || isException || g.notes;

  return (
    <div
      onClick={() => onEdit(g)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      draggable={canDrag}
      onDragStart={e => {
        e.dataTransfer.setData('text/gig-id', g.id);
        e.dataTransfer.effectAllowed = 'move';
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      title={canDrag ? 'Drag onto a DJ column to assign or move, or click to edit' : 'Click to edit'}
      style={{
        borderBottom:'1px solid var(--bg-hover)', padding:'12px 14px',
        paddingLeft: isToday ? 11 : 14,
        borderLeft: isToday ? `3px solid ${vc.color}` : 'none',
        background: hover ? 'var(--bg-hover)' : isToday ? 'var(--bg-raised)' : 'transparent',
        cursor: canDrag ? 'grab' : 'pointer',
        transition:'background 0.12s', position:'relative',
        opacity: dragging ? 0.4 : isPast ? 0.55 : 1,
      }}
    >
      <div style={{display:'flex', alignItems:'flex-start', gap:10}}>
        {logo ? (
          <img src={logo} alt={g.venue} style={{width:38,height:38,borderRadius:7,objectFit:'cover',flexShrink:0}} onError={e=>{e.target.style.display='none';}} />
        ) : (
          <div style={{width:38,height:38,borderRadius:7,background:'var(--bg-hover)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:vc.color}} />
          </div>
        )}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color: isPast ? 'var(--text-secondary)' : 'var(--text-primary)',lineHeight:1.3}}>{g.venue}</div>
          <div style={{fontSize:11,color: isPast ? 'var(--text-muted)' : 'var(--text-primary)',marginTop:3}}>{formatDate(g.date)} · {g.time}</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5,flexShrink:0}}>
          <GigMenu g={g} onConfirm={onConfirm} onReject={onReject} onEdit={onEdit} onDelete={onDelete} />
          {!hideFees && g.fee && (
            <span style={{fontSize:13,color: isPast ? 'var(--money-dim)' : 'var(--money)',fontWeight:700,whiteSpace:'nowrap'}}>€{g.fee}</span>
          )}
        </div>
      </div>

      {hasBottomRow && (
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginTop:8}}>
          {isToday && (
            <span style={{fontSize:10,fontWeight:700,color:'var(--neon)',background:'var(--neon-bg)',border:'1px solid var(--neon-border)',borderRadius:4,padding:'2px 7px',textTransform:'uppercase',letterSpacing:'0.06em',whiteSpace:'nowrap'}}>
              {isNightTime(g.time) ? '🎧 Tonight' : '📅 Today'}
            </span>
          )}
          <StatusPill status={g.status} />
          {g.notes && (
            <button
              onClick={e => { e.stopPropagation(); setShowNotes(n => !n); }}
              style={{background:'transparent',border:'none',color:'var(--pending)',fontSize:11,cursor:'pointer',padding:0,marginLeft:'auto'}}
            >
              📌 {showNotes ? 'Hide' : 'Note'}
            </button>
          )}
        </div>
      )}

      {g.notes && showNotes && (
        <div onClick={e => e.stopPropagation()} style={{fontSize:11,color:'var(--pending)',marginTop:8,background:'var(--pending-bg)',border:'1px solid var(--pending-border)',borderRadius:5,padding:'7px 9px'}}>
          {g.notes}
        </div>
      )}
    </div>
  );
}

function UnassignedColumn({ gigs, hideFees, onConfirm, onReject, onEdit, onDelete, onDropUnassign }) {
  // Permanent fixture: shows ALL unassigned gigs regardless of the date filter.
  const [dragOver, setDragOver] = useState(false);
  const matched = gigs
    .filter(g => g.status === 'unassigned')
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

  const empty = matched.length === 0;

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
        if (gigId && onDropUnassign) onDropUnassign(gigId);
      }}
      style={{
      background: dragOver ? 'var(--pending-bg)' : empty ? 'var(--bg-surface)' : 'var(--pending-bg)',
      border: dragOver ? '2px dashed #ff9900' : empty ? '1px solid var(--border)' : '1px solid #ff990040',
      borderRadius:10, overflow:'hidden', flex:'1 1 0', minWidth:0,
      transition:'background 0.12s, border 0.12s',
    }}>
      <div style={{padding:'12px 14px', borderBottom: empty ? '1px solid var(--border)' : '1px solid #ff990030', display:'flex', alignItems:'center', gap:10, background: empty ? 'var(--bg-raised)' : 'var(--pending-bg)'}}>
        <div style={{
          width:34,height:34,borderRadius:'50%',
          background: empty ? 'var(--ok-bg)' : '#ff990025',
          color: empty ? 'var(--ok)' : '#ff9900',
          border: `1.5px solid ${empty ? 'var(--ok-border)' : '#ff990060'}`,
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,flexShrink:0,
        }}>
          {empty ? '✓' : '!'}
        </div>
        <div style={{fontSize:13,fontWeight:700,color: dragOver ? '#ff9900' : empty ? 'var(--text-secondary)' : '#ff9900'}}>
          {dragOver ? 'Drop to unassign' : 'Unassigned'}
        </div>
      </div>

      {empty ? (
        <div style={{padding:'20px 14px',textAlign:'center',color:'var(--text-muted)',fontSize:12}}>
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

function DJColumn({ dj, gigs, dotColor, hideFees, range, collapseBefore, onConfirm, onReject, onEdit, onDelete, onDropAssign, onShowPending }) {
  const [dragOver, setDragOver]       = useState(false);
  const [showEarlier, setShowEarlier] = useState(false);

  // Collapse state resets whenever the viewed period changes.
  useEffect(() => { setShowEarlier(false); }, [range.from, range.to]);

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
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

  // When viewing the current period, gigs that already happened collapse
  // behind an expander so the column opens at today.
  const earlier = collapseBefore ? matched.filter(g => g.date < collapseBefore) : [];
  const current = collapseBefore ? matched.filter(g => g.date >= collapseBefore) : matched;

  // Pending offers for this DJ across ALL dates (not just the current filter),
  // so unanswered offers are visible no matter which range you're viewing.
  const pendingCount = gigs.filter(g => {
    const matchUid  = g.djUid === dj.uid;
    const matchName = g.djName && dj.name && g.djName.toLowerCase() === dj.name.toLowerCase();
    return (matchUid || matchName) && g.status === 'pending';
  }).length;

  // Fee total for the gigs currently shown in this column.
  const feeTotal = matched.reduce((sum, g) => sum + (g.fee ? Number(g.fee) : 0), 0);

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
        background: dragOver ? 'var(--neon-bg)' : 'var(--bg-surface)',
        border: dragOver ? `2px dashed ${dotColor}` : '1px solid var(--border)',
        borderRadius:10, overflow:'hidden', flex:'1 1 0', minWidth:0,
        transition:'background 0.12s, border 0.12s',
      }}
    >
      <div style={{padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10, background: dragOver ? dotColor+'15' : 'var(--bg-raised)'}}>
        <div style={{width:34,height:34,borderRadius:'50%',background:dotColor+'25',color:dotColor,border:`1.5px solid ${dotColor}60`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>
          {initials}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>{dj.name}</div>
          <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:1,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
            <span>
              {dragOver
                ? 'Drop to assign'
                : `${matched.length} gig${matched.length !== 1 ? 's' : ''}${!hideFees && feeTotal > 0 ? ` · €${feeTotal}` : ''}`}
            </span>
            {!dragOver && pendingCount > 0 && (
              <span
                onClick={e => { e.stopPropagation(); onShowPending && onShowPending(); }}
                title="Show all gigs including pending"
                style={{color:'var(--pending)',fontWeight:700,background:'var(--pending-bg)',border:'1px solid var(--pending-border)',borderRadius:4,padding:'0 6px',fontSize:10,cursor:'pointer'}}
              >
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>
      </div>

      {matched.length === 0 ? (
        <div style={{padding:'20px 14px',textAlign:'center',color:'var(--text-muted)',fontSize:12}}>No gigs in this period</div>
      ) : (
        <>
          {earlier.length > 0 && (
            <button
              onClick={() => setShowEarlier(s => !s)}
              style={{width:'100%',background:'transparent',border:'none',borderBottom:'1px solid var(--border)',color:'var(--text-muted)',fontSize:11,padding:'8px 14px',cursor:'pointer',textAlign:'left'}}
            >
              {showEarlier ? '▾ Hide' : '▸ Show'} {earlier.length} earlier gig{earlier.length !== 1 ? 's' : ''}
            </button>
          )}
          {showEarlier && earlier.map(g => (
            <GigCard key={g.id} g={g} hideFees={hideFees} draggable onConfirm={onConfirm} onReject={onReject} onEdit={onEdit} onDelete={onDelete} />
          ))}
          {current.map(g => (
            <GigCard key={g.id} g={g} hideFees={hideFees} draggable onConfirm={onConfirm} onReject={onReject} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </>
      )}
    </div>
  );
}

const DOT_COLORS = ['#00d4aa','#a080ff','#40a0ff','#ff60c0','#ffbb00','#80d040'];

// A drop target for one DJ: dropping a gig here assigns it to that DJ.
// The gig keeps its own date — the week it is dropped in does not change it.
function DropCell({ dj, dotColor, onDropAssign, style, children }) {
  const [dragOver, setDragOver] = useState(false);
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
        ...style,
        background: dragOver ? 'var(--neon-bg)' : style.background,
        outline: dragOver ? `2px dashed ${dotColor}` : 'none',
        outlineOffset: -2,
      }}
    >
      {children}
    </div>
  );
}

// Month and All views: one outlined band per Monday-to-Sunday week, running
// across every visible DJ so the same week lines up for everyone.
function WeekBands({ djs, allUsers, gigs, range, mode, collapseBefore, isMobile, hideFees, onConfirm, onReject, onEdit, onDelete, onDropAssign, onShowPending }) {
  const [showEarlier, setShowEarlier] = useState(false);
  useEffect(() => { setShowEarlier(false); }, [range.from, range.to]);

  if (djs.length === 0) {
    return <div style={{padding:'24px 14px',textAlign:'center',color:'var(--text-muted)',fontSize:13}}>Pick a DJ above to see their gigs.</div>;
  }

  const today = todayStr();

  // Bands always cover whole Monday-to-Sunday weeks, so a week that straddles
  // two months shows in full in both. `shownRange` is what gets drawn; `range`
  // (the calendar month) is still what the header gig counts and fees add up.
  const shownRange = {
    from: mondayOf(range.from),
    to: range.to ? addDaysIso(mondayOf(range.to), 6) : null,
  };

  const perDJ = djs.map(dj => ({
    dj,
    color: DOT_COLORS[allUsers.indexOf(dj) % DOT_COLORS.length],
    list: gigsForDJ(dj, gigs, shownRange),
    inPeriod: gigsForDJ(dj, gigs, range),
    pendingCount: gigs.filter(g => belongsTo(g, dj) && g.status === 'pending').length,
  }));

  // Last day to draw: the end of the last week, or in All view the last gig on the books.
  const lastDate = shownRange.to || perDJ.reduce((max, p) => p.list.reduce((m, g) => (g.date > m ? g.date : m), max), shownRange.from);

  const weeks = [];
  for (let start = shownRange.from; start <= lastDate; start = addDaysIso(start, 7)) {
    const end   = addDaysIso(start, 6);
    const cells = perDJ.map(p => p.list.filter(g => g.date >= start && g.date <= end));
    const count = cells.reduce((sum, c) => sum + c.length, 0);
    // All view skips weeks where nobody has anything on.
    if (mode === 'all' && count === 0) continue;
    weeks.push({
      start, cells, count,
      label: `${formatDayMonth(start)} – ${formatDayMonth(end)}`,
      isCurrent: today >= start && today <= end,
      isPast: end < today,
    });
  }

  // Viewing the current month: weeks that are fully over collapse behind one toggle.
  const earlier = collapseBefore ? weeks.filter(w => w.isPast) : [];
  const shown   = collapseBefore && !showEarlier ? weeks.filter(w => !w.isPast) : weeks;

  const djCols = `repeat(${djs.length}, minmax(0, 1fr))`;
  const grid   = isMobile ? djCols : `92px ${djCols}`;
  const weekBorder = 'color-mix(in srgb, var(--text-muted) 60%, transparent)';

  return (
    <div style={{display:'flex', flexDirection:'column', gap:10}}>

      {/* DJ header row — stays in view while you scroll the weeks */}
      <div style={{position:'sticky', top:56, zIndex:20, display:'grid', gridTemplateColumns:grid, background:'var(--bg-raised)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden'}}>
        {!isMobile && (
          <div style={{padding:'12px 10px', fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)', display:'flex', alignItems:'center'}}>Week</div>
        )}
        {perDJ.map((p, i) => {
          // Totals count only the gigs dated inside the viewed period (the calendar month).
          const feeTotal = p.inPeriod.reduce((sum, g) => sum + (g.fee ? Number(g.fee) : 0), 0);
          const initials = p.dj.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
          return (
            <DropCell key={p.dj.uid} dj={p.dj} dotColor={p.color} onDropAssign={onDropAssign}
              style={{display:'flex', alignItems:'center', gap:10, padding:'10px 12px', minWidth:0, background:'var(--bg-raised)', borderLeft: !isMobile || i > 0 ? '1px solid var(--border)' : 'none'}}>
              <div style={{width:34,height:34,borderRadius:'50%',background:p.color+'25',color:p.color,border:`1.5px solid ${p.color}60`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>
                {initials}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>{p.dj.name}</div>
                <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:1,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                  <span>{`${p.inPeriod.length} gig${p.inPeriod.length !== 1 ? 's' : ''}${!hideFees && feeTotal > 0 ? ` · €${feeTotal}` : ''}`}</span>
                  {p.pendingCount > 0 && (
                    <span
                      onClick={e => { e.stopPropagation(); onShowPending && onShowPending(); }}
                      title="Show all gigs including pending"
                      style={{color:'var(--pending)',fontWeight:700,background:'var(--pending-bg)',border:'1px solid var(--pending-border)',borderRadius:4,padding:'0 6px',fontSize:10,cursor:'pointer'}}
                    >
                      {p.pendingCount} pending
                    </span>
                  )}
                </div>
              </div>
            </DropCell>
          );
        })}
      </div>

      {earlier.length > 0 && (
        <button
          onClick={() => setShowEarlier(v => !v)}
          style={{background:'transparent',border:'1px solid var(--border-mid)',borderRadius:8,color:'var(--text-secondary)',fontSize:12,padding:'8px 14px',cursor:'pointer',textAlign:'left'}}
        >
          {showEarlier ? '▾ Hide' : '▸ Show'} {earlier.length} earlier week{earlier.length !== 1 ? 's' : ''}
        </button>
      )}

      {shown.length === 0 && (
        <div style={{padding:'24px 14px',textAlign:'center',color:'var(--text-muted)',fontSize:13}}>No gigs in this period</div>
      )}

      {shown.map(w => {
        const weekMeta = (
          <>
            <div style={{fontSize:12,fontWeight:700,color:'var(--text-primary)',lineHeight:1.35}}>{w.label}</div>
            <div style={{fontSize:11,color:'var(--text-secondary)',marginTop: isMobile ? 0 : 3}}>{w.count} gig{w.count !== 1 ? 's' : ''}</div>
            {w.isCurrent && (
              <div style={{fontSize:10,fontWeight:700,color:'var(--neon)',textTransform:'uppercase',letterSpacing:'0.06em',marginTop: isMobile ? 0 : 5}}>This week</div>
            )}
          </>
        );
        return (
          <div key={w.start} style={{border:`1px solid ${w.isCurrent ? 'var(--neon)' : weekBorder}`, borderRadius:10, overflow:'hidden', background:'var(--bg-surface)'}}>
            {isMobile && (
              <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',padding:'8px 12px',background:'var(--bg-hover)'}}>{weekMeta}</div>
            )}
            <div style={{display:'grid', gridTemplateColumns:grid}}>
              {!isMobile && (
                <div style={{padding:'12px 10px',background:'var(--bg-hover)'}}>{weekMeta}</div>
              )}
              {w.cells.map((list, i) => (
                <DropCell key={perDJ[i].dj.uid} dj={perDJ[i].dj} dotColor={perDJ[i].color} onDropAssign={onDropAssign}
                  style={{minWidth:0, background:'transparent', borderLeft: !isMobile || i > 0 ? '1px solid var(--border)' : 'none'}}>
                  {list.length === 0 ? (
                    <div style={{padding:'14px',fontSize:12,color:'var(--text-muted)'}}>No gigs</div>
                  ) : (
                    list.map(g => (
                      <GigCard key={g.id} g={g} hideFees={hideFees} draggable onConfirm={onConfirm} onReject={onReject} onEdit={onEdit} onDelete={onDelete} />
                    ))
                  )}
                </DropCell>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function GigList({ gigs, users = [], hideFees, onConfirm, onReject, onEdit, onDelete, onDropAssign, onDropUnassign }) {
  const [mode, setMode]           = useState('week');
  const [offset, setOffset]       = useState(0);
  const [hiddenDJs, setHiddenDJs] = useState({});
  const isMobile                  = useIsMobile();

  // On mobile only two DJ columns fit side by side, so the pills become a
  // picker capped at two: tapping a third swaps out the oldest selection.
  const [mobileDJs, setMobileDJs] = useState(null);
  useEffect(() => {
    if (mobileDJs === null && users.length > 0) {
      setMobileDJs(users.slice(0, 2).map(u => u.uid));
    }
  }, [users, mobileDJs]);

  const pending = gigs.filter(g => g.status === 'pending');

  function toggleDJ(uid) {
    if (isMobile) {
      setMobileDJs(sel => {
        const cur = sel || [];
        if (cur.includes(uid)) return cur.filter(u => u !== uid);
        return [...cur, uid].slice(-2);
      });
    } else {
      setHiddenDJs(h => ({ ...h, [uid]: !h[uid] }));
    }
  }

  const visibleUsers = isMobile
    ? users.filter(dj => (mobileDJs || []).includes(dj.uid))
    : users.filter(dj => !hiddenDJs[dj.uid]);
  const range        = getPeriodRange(mode, offset);
  // Viewing the current week/month: collapse gigs before today in each column.
  const collapseBefore = mode !== 'all' && offset === 0 ? todayStr() : null;

  return (
    <div className="page-body" style={{maxWidth:'100%', paddingLeft: isMobile ? 14 : 28, paddingRight: isMobile ? 14 : 28}}>
      {pending.length > 0 && (
        <div
          onClick={() => { setMode('all'); setOffset(0); }}
          title="Show all upcoming gigs"
          style={{background:'var(--pending-bg)',border:'1px solid var(--pending-border)',borderRadius:8,padding:'10px 16px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}
        >
          <span style={{fontSize:13,color:'var(--pending)',fontWeight:700}}>
            ⏳ {pending.length} pending gig{pending.length !== 1 ? 's' : ''} need{pending.length === 1 ? 's' : ''} action
          </span>
          <span style={{fontSize:11,color:'var(--pending)'}}>View all →</span>
        </div>
      )}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:8}}>
        <PeriodNav mode={mode} offset={offset} onChange={(m, o) => { setMode(m); setOffset(o); }} />
        <button className="btn btn-primary btn-sm" onClick={() => onEdit(null)}>+ Assign gig</button>
      </div>

      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14,alignItems:'center'}}>
        {isMobile && <span style={{fontSize:10,color:'var(--text-muted)',marginRight:2}}>Pick 2:</span>}
        {users.map((dj, i) => {
          const hidden   = isMobile ? !(mobileDJs || []).includes(dj.uid) : hiddenDJs[dj.uid];
          const dotColor = DOT_COLORS[i % DOT_COLORS.length];
          return (
            <button
              key={dj.uid}
              onClick={() => toggleDJ(dj.uid)}
              style={{
                display:'flex', alignItems:'center', gap:6,
                background: hidden ? 'transparent' : dotColor+'15',
                border: `1px solid ${hidden ? 'var(--border-mid)' : dotColor+'50'}`,
                borderRadius:20, padding:'4px 12px', cursor:'pointer',
                color: hidden ? 'var(--text-muted)' : dotColor,
                fontSize:11, fontWeight:600, opacity: hidden ? 0.5 : 1, transition:'all 0.15s',
              }}
            >
              <div style={{width:6,height:6,borderRadius:'50%',background:hidden?'var(--text-muted)':dotColor}} />
              {dj.name.split(' ')[0]}
            </button>
          );
        })}
      </div>

      {mode !== 'week' ? (
        <div style={{display:'flex', flexDirection: isMobile ? 'column' : 'row', gap:10, alignItems: isMobile ? 'stretch' : 'flex-start', width:'100%'}}>
          <div style={{display:'flex', flex: isMobile ? '0 0 auto' : '0 0 210px', minWidth:0}}>
            <UnassignedColumn
              gigs={gigs} hideFees={hideFees}
              onConfirm={onConfirm} onReject={onReject} onEdit={onEdit} onDelete={onDelete}
              onDropUnassign={onDropUnassign}
            />
          </div>
          <div style={{flex:1, minWidth:0}}>
            <WeekBands
              djs={visibleUsers} allUsers={users} gigs={gigs}
              range={range} mode={mode} collapseBefore={collapseBefore}
              isMobile={isMobile} hideFees={hideFees}
              onConfirm={onConfirm} onReject={onReject} onEdit={onEdit} onDelete={onDelete}
              onDropAssign={onDropAssign}
              onShowPending={() => { setMode('all'); setOffset(0); }}
            />
          </div>
        </div>
      ) : isMobile ? (
        <div style={{display:'flex', flexDirection:'column', gap:10, width:'100%'}}>
          <UnassignedColumn
            gigs={gigs} hideFees={hideFees}
            onConfirm={onConfirm} onReject={onReject} onEdit={onEdit} onDelete={onDelete}
            onDropUnassign={onDropUnassign}
          />
          <div style={{display:'flex', gap:8, alignItems:'flex-start', width:'100%'}}>
            {visibleUsers.map(dj => (
              <DJColumn
                key={dj.uid} dj={dj} gigs={gigs}
                dotColor={DOT_COLORS[users.indexOf(dj) % DOT_COLORS.length]}
                hideFees={hideFees} range={range} collapseBefore={collapseBefore}
                onConfirm={onConfirm} onReject={onReject} onEdit={onEdit} onDelete={onDelete}
                onDropAssign={onDropAssign}
                onShowPending={() => { setMode('all'); setOffset(0); }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div style={{display:'flex', gap:10, alignItems:'flex-start', width:'100%'}}>
          <UnassignedColumn
            gigs={gigs} hideFees={hideFees}
            onConfirm={onConfirm} onReject={onReject} onEdit={onEdit} onDelete={onDelete}
            onDropUnassign={onDropUnassign}
          />
          {visibleUsers.map(dj => (
            <DJColumn
              key={dj.uid} dj={dj} gigs={gigs}
              dotColor={DOT_COLORS[users.indexOf(dj) % DOT_COLORS.length]}
              hideFees={hideFees} range={range} collapseBefore={collapseBefore}
              onConfirm={onConfirm} onReject={onReject} onEdit={onEdit} onDelete={onDelete}
              onDropAssign={onDropAssign}
              onShowPending={() => { setMode('all'); setOffset(0); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
