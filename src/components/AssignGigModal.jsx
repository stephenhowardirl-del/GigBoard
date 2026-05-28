import React, { useState, useEffect } from 'react';
import { getAllUsers, getAllUnavailability } from '../lib/db';

const TIMES = Array.from({length: 48}, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isoForDate(year, month, day) {
  return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function MiniCalendar({ selected, onChange, unavailDates = [], allowPast = false }) {
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
          const isPast     = iso < today;
          const isUnavail  = unavailDates.includes(iso);
          return (
            <div
              key={d}
              onClick={() => (!isPast || allowPast) && onChange(iso)}
              style={{
                textAlign: 'center',
                padding: '5px 0',
                borderRadius: 4,
                fontSize: 11,
                cursor: (!isPast || allowPast) ? 'pointer' : 'not-allowed',
                fontWeight: isSelected ? 700 : 400,
                background: isSelected ? '#00ffc2' : isToday ? '#0a1a14' : 'transparent',
                color: isSelected ? '#000' : isPast && !allowPast ? '#2a2a40' : isUnavail ? '#ff6090' : isToday ? '#00ffc2' : '#c0c0d0',
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

  const [users, setUsers]           = useState([]);
  const [unavail, setUnavail]       = useState([]);
  const [venue, setVenue]           = useState(existingGig?.venue || lockedVenue || '');
  const [date, setDate]             = useState(existingGig?.date || '');
  const [time, setTime]             = useState(existingGig?.time || '');
  const [djUid, setDjUid]           = useState(existingGig?.djUid || '');
  const [notes, setNotes]           = useState(existingGig?.notes || '');
  const [fee, setFee]               = useState(existingGig?.fee || '');
  const [warning, setWarning]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getAllUsers().then(u => {
      setUsers(u);
      if (!editing && u.length) setDjUid(u[0].uid);
    });
    getAllUnavailability().then(setUnavail);
  }, []);

  useEffect(() => {
    if (venues.length && !existingGig?.venue && !lockedVenue) {
      setVenue(venues[0]);
    }
  }, [venues]);

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

  async function handleSubmit() {
    if (!date || !time || !djUid) return;
    setSubmitting(true);
    const dj = users.find(u => u.uid === djUid);
    await onAssign({
      venue: lockedVenue || venue,
      date, time,
      djUid,
      djName:  dj?.name,
      djEmail: dj?.email,
      notes,
      fee,
    });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{maxHeight:'90vh',overflowY:'auto'}}>
        <div className="modal-title">{editing ? 'Edit gig' : lockedVenue ? `Assign gig at ${lockedVenue}` : 'Assign a gig'}</div>
        <div className="modal-sub">
          {editing ? 'Changes will reset the gig to pending — the DJ will need to reconfirm.' : 'DJ will need to accept before the gig is confirmed.'}
        </div>

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

        <div className="field">
          <label>Date</label>
          <MiniCalendar
            selected={date}
            onChange={handleDateChange}
            unavailDates={getDjUnavailDates(djUid)}
            allowPast={true}
          />
        </div>

        <div className="field">
          <label>Time</label>
          <select value={time} onChange={e => setTime(e.target.value)} style={{width:'100%'}}>
            <option value=''>Select time</option>
            {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

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

        <div className="field">
          <label>Fee (€)</label>
          <input type="number" placeholder="e.g. 150" value={fee} onChange={e => setFee(e.target.value)} min="0" />
        </div>

        <div className="field">
          <label>Notes (optional)</label>
          <input type="text" placeholder="e.g. Load in at 21:00" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !date || !time}>
            {submitting ? 'Saving…' : editing ? 'Save changes →' : 'Send to DJ →'}
          </button>
        </div>
      </div>
    </div>
  );
}
