import React, { useState, useEffect } from 'react';
import { createGig, updateGig, deleteGig, getClosedDays, saveClosedDays } from '../../lib/db';

// Venue view: one row per day, one column per venue or gig area. Click an
// empty cell to add a gig that needs a DJ, then fill it later. It reads and
// writes the same gigs as the rest of the app, so nothing is kept twice.

const DOT_COLORS = ['#00d4aa','#a080ff','#40a0ff','#ff60c0','#ffbb00','#80d040'];
const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW        = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_NAMES  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const TIMES = Array.from({length: 48}, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

// Columns shown the first time the view is opened (only those that exist).
const DEFAULT_COLUMNS = ['Seventy Seven', 'Seventy Seven (1st Floor)', 'Seventy Seven (Stamp Room)', 'Dwyers'];
const COLUMNS_KEY     = 'gigboard-venue-view-columns';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isoFor(year, month, day) {
  return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function formatLong(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-IE', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
}

// Turn whatever was typed in the DJ box into one of three things:
// nobody (needs a DJ), someone on the roster, or a written-in name.
function resolveDJ(text, users) {
  const typed = (text || '').trim();
  if (!typed) return { kind: 'none' };
  const lower = typed.toLowerCase();
  let match = users.find(u => (u.name || '').toLowerCase() === lower);
  if (!match) {
    const byFirst = users.filter(u => (u.name || '').split(' ')[0].toLowerCase() === lower);
    if (byFirst.length === 1) match = byFirst[0];
  }
  return match ? { kind: 'roster', user: match } : { kind: 'typed', name: typed };
}

const fieldLabel = { fontSize:11, color:'var(--text-secondary)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:600 };
const fieldInput = { width:'100%', background:'var(--bg-base)', border:'1px solid var(--border-mid)', borderRadius:6, color:'var(--text-primary)', fontSize:13, padding:'9px 10px' };

function SlotModal({ venue, date, gig, users, laterDates, onClose, onSave, onDelete }) {
  const editing = !!gig;
  const [time, setTime]         = useState(gig?.time || '');
  const [fee, setFee]           = useState(gig?.fee || '');
  const [djText, setDjText]     = useState(gig?.djName || '');
  const [musician, setMusician] = useState(gig?.musician || '');
  const [notes, setNotes]       = useState(gig?.notes || '');
  const [repeat, setRepeat]     = useState(false);
  const [saving, setSaving]     = useState(false);

  const resolved = resolveDJ(djText, users);
  const dayName  = DAY_NAMES[new Date(date + 'T12:00:00').getDay()];

  async function handleSave() {
    if (!time || saving) return;
    setSaving(true);
    await onSave({ time, fee, djText, musician: musician.trim(), notes: notes.trim(), repeat });
    setSaving(false);
  }

  return (
    <div style={{position:'fixed',inset:0,background:'#00000080',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'var(--bg-surface)',border:'1px solid var(--border-mid)',borderRadius:12,padding:24,width:'100%',maxWidth:420,maxHeight:'90vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>
        <div style={{fontSize:17,fontWeight:700,color:'var(--text-primary)'}}>{editing ? 'Edit gig' : 'Add a gig that needs a DJ'}</div>
        <div style={{fontSize:13,color:'var(--text-secondary)',marginTop:4,marginBottom:18}}>{venue} · {formatLong(date)}</div>

        <div style={{display:'flex',gap:10,marginBottom:14}}>
          <div style={{flex:1,minWidth:0}}>
            <label style={fieldLabel}>Start time</label>
            <select value={time} onChange={e => setTime(e.target.value)} style={fieldInput}>
              <option value=''>Select time</option>
              {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <label style={fieldLabel}>Fee (€)</label>
            <input type="number" min="0" value={fee} onChange={e => setFee(e.target.value)} placeholder="e.g. 250" style={fieldInput} />
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <label style={fieldLabel}>DJ</label>
          <input type="text" value={djText} onChange={e => setDjText(e.target.value)} placeholder="Leave empty if it still needs a DJ" style={fieldInput} />
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
            {users.map(u => (
              <button key={u.uid} type="button" onClick={() => setDjText(u.name || '')}
                style={{background:'transparent',border:'1px solid var(--border-mid)',borderRadius:14,color:'var(--text-primary)',fontSize:12,padding:'4px 10px',cursor:'pointer'}}>
                {(u.name || '').split(' ')[0]}
              </button>
            ))}
          </div>
          <div style={{fontSize:12,color:'var(--text-secondary)',marginTop:8}}>
            {resolved.kind === 'none'   && 'No DJ yet: it shows as “Needs a DJ” here and in the Unassigned column on the Gig list.'}
            {resolved.kind === 'roster' && `${resolved.user.name} is on GigBoard.`}
            {resolved.kind === 'typed'  && `“${resolved.name}” is not on GigBoard, so this is saved as confirmed with the name as written.`}
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <label style={fieldLabel}>Musician with the DJ (optional)</label>
          <input type="text" value={musician} onChange={e => setMusician(e.target.value)} placeholder="e.g. Sax, Violin, Drums" style={fieldInput} />
        </div>

        <div style={{marginBottom:14}}>
          <label style={fieldLabel}>Notes (optional)</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Brunch" style={fieldInput} />
        </div>

        {!editing && laterDates.length > 0 && (
          <label style={{display:'flex',alignItems:'center',gap:10,fontSize:13,color:'var(--text-primary)',marginBottom:14,cursor:'pointer'}}>
            <input type="checkbox" checked={repeat} onChange={e => setRepeat(e.target.checked)} style={{width:17,height:17,accentColor:'var(--neon)'}} />
            <span>Also add it to the {laterDates.length} later {dayName}{laterDates.length !== 1 ? 's' : ''} this month</span>
          </label>
        )}

        <div style={{display:'flex',gap:10,marginTop:6}}>
          {editing && (
            <button onClick={onDelete} style={{background:'transparent',border:'1px solid var(--danger-border)',color:'var(--danger)',borderRadius:7,padding:'8px 14px',fontSize:13,fontWeight:600,cursor:'pointer'}}>Delete</button>
          )}
          <button onClick={onClose} className="btn btn-ghost" style={{flex:1}}>Cancel</button>
          <button onClick={handleSave} disabled={!time || saving} className="btn btn-primary" style={{flex:1, opacity: !time || saving ? 0.5 : 1}}>
            {saving ? 'Saving…' : editing ? 'Save changes' : repeat ? `Add ${laterDates.length + 1} gigs` : 'Add gig'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Entry({ g, users, hideFees, onEdit }) {
  const needsDJ   = g.status === 'unassigned';
  const rosterIdx = users.findIndex(u => u.uid === g.djUid || (g.djName && u.name && g.djName.toLowerCase() === u.name.toLowerCase()));
  const dotColor  = needsDJ ? '#ff9900' : rosterIdx >= 0 ? DOT_COLORS[rosterIdx % DOT_COLORS.length] : 'var(--text-muted)';
  const hasSecondLine = g.musician || g.status === 'pending' || g.notes || (!hideFees && g.fee);

  return (
    <button
      onClick={e => { e.stopPropagation(); onEdit(g); }}
      title={g.notes ? g.notes : 'Click to edit'}
      style={{
        width:'100%', textAlign:'left', display:'flex', flexDirection:'column', gap:3, padding:'6px 8px',
        background: needsDJ ? '#ff990015' : 'var(--bg-raised)',
        border: `1px solid ${needsDJ ? '#ff990060' : 'var(--border-mid)'}`,
        borderRadius:6, cursor:'pointer',
        color: needsDJ ? '#ff9900' : 'var(--text-primary)',
      }}
    >
      <span style={{display:'flex',alignItems:'center',gap:6,width:'100%'}}>
        <span style={{width:7,height:7,borderRadius:'50%',background:dotColor,flexShrink:0}} />
        <span style={{flex:1,minWidth:0,fontSize:13,fontWeight:600}}>{needsDJ ? 'Needs a DJ' : (g.djName || 'DJ')}</span>
        <span style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text-secondary)',flexShrink:0}}>{g.time}</span>
      </span>
      {hasSecondLine && (
        <span style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:6,paddingLeft:13,fontSize:11,color:'var(--text-secondary)'}}>
          {g.musician && <span>+ {g.musician}</span>}
          {g.status === 'pending' && <span style={{color:'var(--pending)',fontWeight:700}}>Pending</span>}
          {g.notes && <span>📌</span>}
          {!hideFees && g.fee && <span style={{marginLeft:'auto',color:'var(--money)',fontWeight:700,fontSize:12}}>€{g.fee}</span>}
        </span>
      )}
    </button>
  );
}

export default function VenueView({ gigs, users = [], venues = [], profile, hideFees }) {
  const [offset, setOffset]   = useState(0);
  const [columns, setColumns] = useState(null);
  const [closed, setClosed]   = useState([]);
  const [slot, setSlot]       = useState(null);   // { venue, date, gig }

  // Which venues are shown as columns: remembered on this device.
  useEffect(() => {
    if (columns !== null || venues.length === 0) return;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(COLUMNS_KEY)); } catch (e) { saved = null; }
    const usable = Array.isArray(saved) ? saved.filter(v => venues.includes(v)) : [];
    setColumns(usable.length > 0 ? usable : DEFAULT_COLUMNS.filter(v => venues.includes(v)));
  }, [venues, columns]);

  useEffect(() => { getClosedDays().then(setClosed).catch(e => console.error(e)); }, []);

  function toggleColumn(v) {
    // Keep the columns in the same order as the venue list.
    const next = venues.filter(name => name === v ? !(columns || []).includes(v) : (columns || []).includes(name));
    setColumns(next);
    try { localStorage.setItem(COLUMNS_KEY, JSON.stringify(next)); } catch (e) { /* ignore */ }
  }

  const now         = new Date();
  const first       = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year        = first.getFullYear();
  const month       = first.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today       = todayStr();
  const cols        = columns || [];

  const monthFrom = isoFor(year, month, 1);
  const monthTo   = isoFor(year, month, daysInMonth);
  const shown     = gigs.filter(g => cols.includes(g.venue) && g.date >= monthFrom && g.date <= monthTo && g.status !== 'rejected');
  const needCount = shown.filter(g => g.status === 'unassigned').length;

  function gigsFor(venue, date) {
    return shown
      .filter(g => g.venue === venue && g.date === date)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }

  async function toggleClosed(date) {
    const isClosed = closed.includes(date);
    if (!isClosed && !window.confirm(`Mark ${formatLong(date)} as closed?`)) return;
    const next = isClosed ? closed.filter(d => d !== date) : [...closed, date].sort();
    setClosed(next);
    try { await saveClosedDays(next); } catch (e) { console.error(e); }
  }

  // Later dates in this month that fall on the same weekday as the chosen date.
  function laterSameWeekday(date) {
    const out = [];
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    while (d.getMonth() === month) {
      out.push(isoFor(d.getFullYear(), d.getMonth(), d.getDate()));
      d.setDate(d.getDate() + 7);
    }
    return out;
  }

  async function handleSave({ time, fee, djText, musician, notes, repeat }) {
    const r = resolveDJ(djText, users);
    let dj     = { djUid: '', djName: '', djEmail: '' };
    let status = 'unassigned';
    if (r.kind === 'roster') {
      dj     = { djUid: r.user.uid, djName: r.user.name || '', djEmail: r.user.email || '' };
      // Assigning yourself skips acceptance; anyone else gets a pending offer.
      status = r.user.uid === profile?.uid ? 'confirmed' : 'pending';
    } else if (r.kind === 'typed') {
      // A written-in DJ has no login to accept with, so the gig is confirmed.
      dj     = { djUid: '', djName: r.name, djEmail: '' };
      status = 'confirmed';
    }

    try {
      if (slot.gig) {
        const g = slot.gig;
        // The same roster DJ as before keeps their accepted / pending state.
        if (r.kind === 'roster' && g.djUid === r.user.uid && g.status !== 'unassigned') status = g.status;
        await updateGig(g.id, { venue: g.venue, date: g.date, time, ...dj, notes, fee, musician, status });
      } else {
        const dates = repeat ? [slot.date, ...laterSameWeekday(slot.date)] : [slot.date];
        for (const d of dates) {
          await createGig({ venue: slot.venue, date: d, time, ...dj, notes, fee, musician, assignedBy: profile?.name || 'Steve Howard', status });
        }
      }
    } catch (e) { console.error(e); alert('Could not save: ' + e.message); }
    setSlot(null);
  }

  async function handleDelete() {
    const g = slot.gig;
    if (!window.confirm(`Delete this gig?\n\n${g.venue} — ${g.date}\n\nThis cannot be undone.`)) return;
    try { await deleteGig(g.id); } catch (e) { console.error(e); }
    setSlot(null);
  }

  const navBtn = { background:'transparent', border:'1px solid var(--border-mid)', color:'var(--text-secondary)', borderRadius:5, width:26, height:26, fontSize:14, lineHeight:1, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, flexShrink:0 };
  const grid   = `84px repeat(${Math.max(cols.length, 1)}, minmax(150px, 1fr))`;

  return (
    <div className="page-body" style={{maxWidth:'100%'}}>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <button title="Previous month" onClick={() => setOffset(o => o - 1)} style={navBtn}>‹</button>
          <button title="Next month" onClick={() => setOffset(o => o + 1)} style={navBtn}>›</button>
          {offset !== 0 && <button onClick={() => setOffset(0)} style={{...navBtn, width:'auto', padding:'0 10px', fontSize:11}}>Today</button>}
          <span style={{fontSize:15,fontWeight:700,color: offset === 0 ? 'var(--text-primary)' : 'var(--neon)'}}>{MONTHS[month]} {year}</span>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <span style={{padding:'5px 12px',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:8,fontSize:12,color:'var(--text-secondary)'}}>
            Filled <span style={{fontFamily:'var(--font-mono)',color:'var(--text-primary)',marginLeft:4}}>{shown.length - needCount}</span>
          </span>
          <span style={{padding:'5px 12px',background:'#ff990015',border:'1px solid #ff990060',borderRadius:8,fontSize:12,color:'#ff9900',fontWeight:600}}>
            Needs a DJ <span style={{fontFamily:'var(--font-mono)',marginLeft:4}}>{needCount}</span>
          </span>
        </div>
      </div>

      <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center',marginBottom:14}}>
        <span style={{fontSize:11,color:'var(--text-muted)',marginRight:2}}>Columns:</span>
        {venues.map(v => {
          const on = cols.includes(v);
          return (
            <button key={v} onClick={() => toggleColumn(v)} style={{
              background: on ? 'var(--neon-bg)' : 'transparent',
              border: `1px solid ${on ? 'var(--neon-border)' : 'var(--border-mid)'}`,
              color: on ? 'var(--neon)' : 'var(--text-muted)',
              borderRadius:20, padding:'4px 12px', fontSize:11, fontWeight:600, cursor:'pointer',
            }}>
              {v}
            </button>
          );
        })}
      </div>

      {cols.length === 0 ? (
        <div style={{padding:'28px 14px',textAlign:'center',color:'var(--text-muted)',fontSize:13,background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:10}}>
          Pick at least one venue above to show it as a column.
        </div>
      ) : (
        <div style={{overflowX:'auto',border:'1px solid var(--border-mid)',borderRadius:10,background:'var(--bg-surface)'}}>
          <div style={{minWidth: 84 + cols.length * 150}}>

            <div style={{display:'grid',gridTemplateColumns:grid,background:'var(--bg-raised)',borderBottom:'1px solid var(--border-mid)'}}>
              <div style={{padding:'10px 12px',fontSize:11,fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Date</div>
              {cols.map(v => (
                <div key={v} style={{padding:'10px 12px',fontSize:13,fontWeight:700,color:'var(--text-primary)',borderLeft:'1px solid var(--border)'}}>{v}</div>
              ))}
            </div>

            {Array.from({length: daysInMonth}, (_, i) => {
              const date     = isoFor(year, month, i + 1);
              const dow      = new Date(date + 'T12:00:00').getDay();
              const weekend  = dow === 0 || dow === 6;
              const isClosed = closed.includes(date);
              const isToday  = date === today;
              const booked   = isClosed ? shown.filter(g => g.date === date).length : 0;
              return (
                <div key={date} style={{
                  display:'grid', gridTemplateColumns:grid,
                  borderTop: i === 0 ? 'none' : dow === 1 ? '2px solid var(--text-muted)' : '1px solid var(--border)',
                  background: weekend ? 'var(--bg-raised)' : 'transparent',
                  opacity: date < today ? 0.6 : 1,
                }}>
                  <button
                    onClick={() => toggleClosed(date)}
                    title={isClosed ? 'Closed. Click to reopen this day' : 'Click to mark this day as closed'}
                    style={{background:'transparent',border:'none',textAlign:'left',cursor:'pointer',padding:'10px 12px',display:'flex',alignItems:'baseline',gap:6}}
                  >
                    <span style={{fontSize:11,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',color:'var(--text-secondary)',width:30}}>{DOW[dow]}</span>
                    <span style={{fontFamily:'var(--font-mono)',fontSize:15,fontWeight:500,color: isToday ? 'var(--neon)' : 'var(--text-primary)'}}>{i + 1}</span>
                  </button>

                  {isClosed ? (
                    <div style={{gridColumn:`span ${cols.length}`,display:'flex',alignItems:'center',padding:'0 12px',minHeight:40,borderLeft:'1px solid var(--border)',background:'var(--danger-bg)',color:'var(--danger)',fontSize:12,fontWeight:600}}>
                      Closed{booked > 0 ? ` · ${booked} gig${booked !== 1 ? 's' : ''} still booked on this day` : ''}
                    </div>
                  ) : (
                    cols.map(v => {
                      const list = gigsFor(v, date);
                      return (
                        <div
                          key={v}
                          onClick={() => setSlot({ venue: v, date, gig: null })}
                          title="Click to add a gig that needs a DJ"
                          style={{minHeight:40,padding:5,borderLeft:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:4,cursor:'pointer'}}
                        >
                          {list.map(g => (
                            <Entry key={g.id} g={g} users={users} hideFees={hideFees} onEdit={gig => setSlot({ venue: v, date, gig })} />
                          ))}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{fontSize:12,color:'var(--text-muted)',marginTop:12,lineHeight:1.6}}>
        Click an empty cell to add a gig that needs a DJ. Click a gig to fill or change it. Click a date to mark the day as closed.
      </div>

      {slot && (
        <SlotModal
          venue={slot.venue} date={slot.date} gig={slot.gig} users={users}
          laterDates={slot.gig ? [] : laterSameWeekday(slot.date)}
          onClose={() => setSlot(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
