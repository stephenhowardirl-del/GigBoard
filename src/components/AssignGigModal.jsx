import React, { useState, useEffect } from 'react';
import { getAllUsers, getAllUnavailability, createGig } from '../lib/db';

const TIMES = Array.from({length: 48}, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isoForDate(year, month, day) {
  return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

// Returns all dates between start and end (inclusive) that fall on dayOfWeek (0=Mon, 6=Sun)
function getRecurringDates(startIso, endIso, dayOfWeek) {
  const dates = [];
  const start = new Date(startIso + 'T12:00:00');
  const end   = new Date(endIso   + 'T12:00:00');
  const cur   = new Date(start);
  // Advance to first matching day
  const jsDow = (dayOfWeek + 1) % 7; // convert Mon=0 to JS Sun=0 system
  while (cur.getDay() !== jsDow) cur.setDate(cur.getDate() + 1);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth()+1).padStart(2,'0');
    const d = String(cur.getDate()).padStart(2,'0');
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 7);
  }
  return dates;
}

function MultiCalendar({ selected, onChange, unavailDates = [] }) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7;
  const today       = todayStr();

  function toggleDate(iso) {
    if (selected.includes(iso)) {
      onChange(selected.filter(d => d !== iso));
    } else {
      onChange([...selected, iso].sort());
    }
  }

  return (
    <div style={{background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:8,padding:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <button onClick={prevMonth} style={{background:'transparent',border:'none',color:'#6060a0',fontSize:16,cursor:'pointer',padding:'0 6px'}}>‹</button>
        <div style={{fontSize:12,color:'#e8e8f0',fontWeight:600}}>{MONTHS[month]} {year}</div>
        <button onClick={nextMonth} style={{background:'transparent',border:'none',color:'#6060a0',fontSize:16,cursor:'pointer',padding:'0 6px'}}>›</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
        {DAYS.map(d => (
          <div key={d} style={{fontSize:9,color:'#404060',textAlign:'center',padding:'2px 0',textTransform:'uppercase'}}>{d}</div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
        {Array.from({length: firstDow}, (_, i) => <div key={`e${i}`} />)}
        {Array.from({length: daysInMonth}, (_, i) => {
          const d          = i + 1;
          const iso        = isoForDate(year, month, d);
          const isSelected = selected.includes(iso);
          const isToday    = iso === today;
          const isUnavail  = unavailDates.includes(iso);
          return (
            <div
              key={d}
              onClick={() => toggleDate(iso)}
              style={{
                textAlign: 'center',
                padding: '5px 0',
                borderRadius: 4,
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: isSelected ? 700 : 400,
                background: isSelected ? '#00ffc2' : isToday ? '#0a1a14' : 'transparent',
                color: isSelected ? '#000' : isUnavail ? '#ff6090' : isToday ? '#00ffc2' : '#c0c0d0',
                border: isSelected ? '1px solid #00ffc2' : isToday ? '1px solid #00ffc230' : '1px solid transparent',
              }}
            >
              {d}
            </div>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div style={{marginTop:10,fontSize:11,color:'#00ffc2',textAlign:'center',fontWeight:600}}>
          {selected.length} date{selected.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}

function SingleCalendar({ selected, onChange, unavailDates = [] }) {
  const now = new Date();
  const [year, setYear]   = useState(selected ? new Date(selected + 'T12:00:00').getFullYear() : now.getFullYear());
  const [month, setMonth] = useState(selected ? new Date(selected + 'T12:00:00').getMonth() : now.getMonth());

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7;
  const today       = todayStr();

  return (
    <div style={{background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:8,padding:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <button onClick={prevMonth} style={{background:'transparent',border:'none',color:'#6060a0',fontSize:16,cursor:'pointer',padding:'0 6px'}}>‹</button>
        <div style={{fontSize:12,color:'#e8e8f0',fontWeight:600}}>{MONTHS[month]} {year}</div>
        <button onClick={nextMonth} style={{background:'transparent',border:'none',color:'#6060a0',fontSize:16,cursor:'pointer',padding:'0 6px'}}>›</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
        {DAYS.map(d => (
          <div key={d} style={{fontSize:9,color:'#404060',textAlign:'center',padding:'2px 0',textTransform:'uppercase'}}>{d}</div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
        {Array.from({length: firstDow}, (_, i) => <div key={`e${i}`} />)}
        {Array.from({length: daysInMonth}, (_, i) => {
          const d          = i + 1;
          const iso        = isoForDate(year, month, d);
          const isSelected = iso === selected;
          const isToday    = iso === today;
          const isUnavail  = unavailDates.includes(iso);
          return (
            <div
              key={d}
              onClick={() => onChange(iso)}
              style={{
                textAlign: 'center',
                padding: '5px 0',
                borderRadius: 4,
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: isSelected ? 700 : 400,
                background: isSelected ? '#00ffc2' : isToday ? '#0a1a14' : 'transparent',
                color: isSelected ? '#000' : isUnavail ? '#ff6090' : isToday ? '#00ffc2' : '#c0c0d0',
                border: isToday && !isSelected ? '1px solid #00ffc230' : isUnavail && !isSelected ? '1px solid #ff407040' : '1px solid transparent',
              }}
            >
              {d}
            </div>
          );
        })}
      </div>
      {selected && (
        <div style={{marginTop:10,fontSize:11,color:'#00ffc2',textAlign:'center',fontWeight:600}}>
          {(() => { const d = new Date(selected + 'T12:00:00'); return d.toLocaleDateString('en-IE', { weekday:'short', day:'numeric', month:'short', year:'numeric' }); })()}
        </div>
      )}
    </div>
  );
}

export default function AssignGigModal({ onClose, onAssign, lockedVenue = null, existingGig = null, venues = [] }) {
  const editing = !!existingGig;

  const [mode, setMode]             = useState('single'); // 'single' | 'multi' | 'recurring'
  const [users, setUsers]           = useState([]);
  const [unavail, setUnavail]       = useState([]);
  const [venue, setVenue]           = useState(existingGig?.venue || lockedVenue || '');
  const [date, setDate]             = useState(existingGig?.date || '');
  const [multiDates, setMultiDates] = useState([]);
  const [recurStart, setRecurStart] = useState('');
  const [recurEnd, setRecurEnd]     = useState('');
  const [recurDay, setRecurDay]     = useState(3); // Thursday = index 3 (Mon=0)
  const [time, setTime]             = useState(existingGig?.time || '');
  const [djUid, setDjUid]           = useState(existingGig?.djUid || '');
  const [notes, setNotes]           = useState(existingGig?.notes || '');
  const [fee, setFee]               = useState(existingGig?.fee || '');
  const [warning, setWarning]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview]       = useState([]);

  useEffect(() => {
    getAllUsers().then(u => {
      setUsers(u);
      if (!editing && u.length) setDjUid(u[0].uid);
    });
    getAllUnavailability().then(setUnavail);
  }, []);

  useEffect(() => {
    if (venues.length && !existingGig?.venue && !lockedVenue) setVenue(venues[0]);
  }, [venues]);

  useEffect(() => {
    if (mode === 'recurring' && recurStart && recurEnd) {
      setPreview(getRecurringDates(recurStart, recurEnd, recurDay));
    } else {
      setPreview([]);
    }
  }, [mode, recurStart, recurEnd, recurDay]);

  function getDjUnavailDates(selectedDjUid) {
    return unavail.find(u => u.uid === selectedDjUid)?.dates || [];
  }

  function checkUnavail(selectedDate, selectedDjUid) {
    const djUnavail = unavail.find(u => u.uid === selectedDjUid);
    if (djUnavail?.dates?.includes(selectedDate)) {
      const dj = users.find(u => u.uid === selectedDjUid);
      setWarning(`⚠️ ${dj?.name || 'This DJ'} has marked themselves unavailable on this date.`);
    } else {
      setWarning('');
    }
  }

  function handleDateChange(iso) { setDate(iso); checkUnavail(iso, djUid); }
  function handleDjChange(e)     { setDjUid(e.target.value); checkUnavail(date, e.target.value); }

  function getDatesToSubmit() {
    if (mode === 'single')    return [date];
    if (mode === 'multi')     return multiDates;
    if (mode === 'recurring') return preview;
    return [];
  }

  function isValid() {
    const dates = getDatesToSubmit();
    return dates.length > 0 && time && djUid;
  }

  async function handleSubmit() {
    if (!isValid()) return;
    setSubmitting(true);
    const dj    = users.find(u => u.uid === djUid);
    const dates = getDatesToSubmit();

    if (editing || dates.length === 1) {
      await onAssign({
        venue: lockedVenue || venue,
        date: dates[0], time, djUid,
        djName: dj?.name, djEmail: dj?.email,
        notes, fee,
      });
    } else {
      // Create multiple gigs
      for (const d of dates) {
        await createGig({
          venue: lockedVenue || venue,
          date: d, time, djUid,
          djName: dj?.name, djEmail: dj?.email,
          notes, fee,
          assignedBy: 'Steve Howard',
        });
      }
    }
    onClose();
  }

  const btnStyle = (active) => ({
    flex: 1,
    padding: '7px 0',
    borderRadius: 6,
    border: `1px solid ${active ? '#00ffc250' : '#2a2a40'}`,
    background: active ? '#00ffc215' : 'transparent',
    color: active ? '#00ffc2' : '#8080a0',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  const dates = getDatesToSubmit();

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{maxHeight:'90vh',overflowY:'auto'}}>
        <div className="modal-title">{editing ? 'Edit gig' : lockedVenue ? `Assign gig at ${lockedVenue}` : 'Assign a gig'}</div>
        <div className="modal-sub">
          {editing ? 'Changes will reset the gig to pending — the DJ will need to reconfirm.' : 'DJ will need to accept before the gig is confirmed.'}
        </div>

        {/* Mode toggle — only show when not editing */}
        {!editing && (
          <div style={{display:'flex', gap:6, marginBottom:16}}>
            <button style={btnStyle(mode === 'single')}    onClick={() => setMode('single')}>Single date</button>
            <button style={btnStyle(mode === 'multi')}     onClick={() => setMode('multi')}>Multiple dates</button>
            <button style={btnStyle(mode === 'recurring')} onClick={() => setMode('recurring')}>Recurring</button>
          </div>
        )}

        {/* Venue */}
        {!lockedVenue && (
          <div className="field">
            <label>Venue</label>
            <select value={venue} onChange={e => setVenue(e.target.value)}>
              {venues.length === 0 && <option>No venues added yet</option>}
              {venues.map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
        )}
        {lockedVenue && (
          <div className="field"><label>Venue</label><input value={lockedVenue} disabled /></div>
        )}

        {/* Single date */}
        {mode === 'single' && (
          <div className="field">
            <label>Date</label>
            <SingleCalendar selected={date} onChange={handleDateChange} unavailDates={getDjUnavailDates(djUid)} />
          </div>
        )}

        {/* Multiple dates */}
        {mode === 'multi' && (
          <div className="field">
            <label>Select dates — tap to toggle</label>
            <MultiCalendar selected={multiDates} onChange={setMultiDates} unavailDates={getDjUnavailDates(djUid)} />
            {multiDates.length > 0 && (
              <div style={{marginTop:8, display:'flex', flexWrap:'wrap', gap:4}}>
                {multiDates.map(d => (
                  <span key={d} style={{fontSize:10,background:'#00ffc215',border:'1px solid #00ffc230',color:'#00ffc2',borderRadius:4,padding:'2px 6px'}}>
                    {new Date(d + 'T12:00:00').toLocaleDateString('en-IE', {day:'numeric', month:'short'})}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recurring */}
        {mode === 'recurring' && (
          <>
            <div className="field">
              <label>Day of week</label>
              <select value={recurDay} onChange={e => setRecurDay(Number(e.target.value))} style={{width:'100%'}}>
                {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
              </select>
            </div>
            <div style={{display:'flex', gap:10}}>
              <div className="field" style={{flex:1}}>
                <label>From</label>
                <input type="date" value={recurStart} onChange={e => setRecurStart(e.target.value)} style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:13,padding:'8px 10px'}} />
              </div>
              <div className="field" style={{flex:1}}>
                <label>To</label>
                <input type="date" value={recurEnd} onChange={e => setRecurEnd(e.target.value)} style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:13,padding:'8px 10px'}} />
              </div>
            </div>
            {preview.length > 0 && (
              <div style={{background:'#0a1a10',border:'1px solid #00ffc230',borderRadius:6,padding:10,marginBottom:12}}>
                <div style={{fontSize:11,color:'#00ffc2',fontWeight:600,marginBottom:6}}>
                  {preview.length} gig{preview.length !== 1 ? 's' : ''} will be created — every {DAY_NAMES[recurDay]}
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                  {preview.map(d => (
                    <span key={d} style={{fontSize:10,background:'#00ffc215',border:'1px solid #00ffc230',color:'#00ffc2',borderRadius:4,padding:'2px 6px'}}>
                      {new Date(d + 'T12:00:00').toLocaleDateString('en-IE', {day:'numeric', month:'short'})}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Time */}
        <div className="field">
          <label>Time</label>
          <select value={time} onChange={e => setTime(e.target.value)} style={{width:'100%'}}>
            <option value=''>Select time</option>
            {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* DJ */}
        <div className="field">
          <label>Assign to DJ</label>
          <select value={djUid} onChange={handleDjChange}>
            {users.map(u => <option key={u.uid} value={u.uid}>{u.name}</option>)}
          </select>
        </div>

        {warning && (
          <div style={{background:'#2a1a00',border:'1px solid #ffbb0030',borderRadius:6,padding:'8px 10px',fontSize:11,color:'#ffbb00',marginBottom:12}}>
            {warning}
          </div>
        )}

        {/* Fee */}
        <div className="field">
          <label>Fee (€)</label>
          <input type="number" placeholder="e.g. 150" value={fee} onChange={e => setFee(e.target.value)} min="0" />
        </div>

        {/* Notes */}
        <div className="field">
          <label>Notes (optional)</label>
          <input type="text" placeholder="e.g. Load in at 21:00" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !isValid()}>
            {submitting ? 'Saving…' : editing ? 'Save changes →' : dates.length > 1 ? `Create ${dates.length} gigs →` : 'Send to DJ →'}
          </button>
        </div>
      </div>
    </div>
  );
}
