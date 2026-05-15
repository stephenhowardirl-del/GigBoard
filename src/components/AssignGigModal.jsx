import React, { useState, useEffect } from 'react';
import { getAllUsers, getAllUnavailability } from '../lib/db';

const VENUES = ['Clancys Cork','JJ Walsh','Dwyers','Seventy Seven','Seventy Seven (brunch)','Seventy Seven (first floor)','Seventy Seven (stamp room)','The Wash','The Pav','The Dean','The Woodford','Mardyke','Wedding','Private Event'];

export default function AssignGigModal({ onClose, onAssign, lockedVenue = null }) {
  const [users, setUsers]         = useState([]);
  const [unavail, setUnavail]     = useState([]);
  const [venue, setVenue]         = useState(lockedVenue || VENUES[0]);
  const [date, setDate]           = useState('');
  const [time, setTime]           = useState('');
  const [djUid, setDjUid]         = useState('');
  const [notes, setNotes]         = useState('');
  const [warning, setWarning]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getAllUsers().then(u => {
      const djs = u;
      setUsers(djs);
      if (djs.length) setDjUid(djs[0].uid);
    });
    getAllUnavailability().then(setUnavail);
  }, []);

  function checkUnavail(selectedDate, selectedDjUid) {
    const djUnavail = unavail.find(u => u.uid === selectedDjUid);
    if (djUnavail?.dates?.includes(selectedDate)) {
      const dj = users.find(u => u.uid === selectedDjUid);
      setWarning(`⚠️ ${dj?.name || 'This DJ'} has marked themselves unavailable on this date.`);
    } else {
      setWarning('');
    }
  }

  function handleDateChange(e) {
    setDate(e.target.value);
    checkUnavail(e.target.value, djUid);
  }

  function handleDjChange(e) {
    setDjUid(e.target.value);
    checkUnavail(date, e.target.value);
  }

  async function handleSubmit() {
    if (!date || !time || !djUid) return;
    setSubmitting(true);
    const dj = users.find(u => u.uid === djUid);
    await onAssign({ venue: lockedVenue || venue, date, time, djUid, djName: dj?.name, notes });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{lockedVenue ? `Assign gig at ${lockedVenue}` : 'Assign a gig'}</div>
        <div className="modal-sub">DJ will receive a notification and must accept before it goes to their calendar.</div>

        {!lockedVenue && (
          <div className="field">
            <label>Venue</label>
            <select value={venue} onChange={e => setVenue(e.target.value)}>
              {VENUES.map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
        )}

        {lockedVenue && (
          <div className="field">
            <label>Venue</label>
            <input value={lockedVenue} disabled />
          </div>
        )}

        <div className="field">
          <label>Date</label>
          <input type="date" value={date} onChange={handleDateChange} />
        </div>

        <div className="field">
          <label>Time (e.g. 22:00–03:00)</label>
          <input type="text" placeholder="22:00–03:00" value={time} onChange={e => setTime(e.target.value)} />
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
          <label>Notes (optional)</label>
          <input type="text" placeholder="e.g. Load in at 21:00" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !date || !time}>
            {submitting ? 'Sending…' : 'Send to DJ →'}
          </button>
        </div>
      </div>
    </div>
  );
}
