import React, { useState, useEffect } from 'react';
import { getAllUsers, getAllUnavailability } from '../lib/db';
import { notifyGigAssigned } from '../lib/email';

export default function AssignGigModal({ onClose, onAssign, lockedVenue = null, existingGig = null, venues = [] }) {
  const editing = !!existingGig;

  const [users, setUsers]       = useState([]);
  const [unavail, setUnavail]   = useState([]);
  const [venue, setVenue]       = useState(existingGig?.venue || lockedVenue || '');
  const [date, setDate]         = useState(existingGig?.date || '');
  const [time, setTime]         = useState(existingGig?.time || '');
  const [djUid, setDjUid]       = useState(existingGig?.djUid || '');
  const [notes, setNotes]       = useState(existingGig?.notes || '');
  const [fee, setFee]           = useState(existingGig?.fee || '');
  const [warning, setWarning]   = useState('');
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

  function checkUnavail(selectedDate, selectedDjUid) {
    const djUnavail = unavail.find(u => u.uid === selectedDjUid);
    if (djUnavail?.dates?.includes(selectedDate)) {
      const dj = users.find(u => u.uid === selectedDjUid);
      setWarning(`⚠️ ${dj?.name || 'This DJ'} has marked themselves unavailable on this date.`);
    } else {
      setWarning('');
    }
  }

  function handleDateChange(e) { setDate(e.target.value); checkUnavail(e.target.value, djUid); }
  function handleDjChange(e)   { setDjUid(e.target.value); checkUnavail(date, e.target.value); }

  async function handleSubmit() {
    if (!date || !time || !djUid) return;
    setSubmitting(true);
    const dj = users.find(u => u.uid === djUid);

    await onAssign({
      venue: lockedVenue || venue,
      date, time,
      djUid,
      djName: dj?.name,
      djEmail: dj?.email,
      notes,
      fee,
    });

    // Send email notification to DJ
    if (!editing && dj?.email) {
      await notifyGigAssigned({
        djName: dj.name,
        djEmail: dj.email,
        venue: lockedVenue || venue,
        date,
        time,
        fee,
        notes,
      });
    }

    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{editing ? 'Edit gig' : lockedVenue ? `Assign gig at ${lockedVenue}` : 'Assign a gig'}</div>
        <div className="modal-sub">
          {editing ? 'Changes will reset the gig to pending — the DJ will need to reconfirm.' : 'DJ will be notified by email and must accept before it is confirmed.'}
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
            {submitting ? 'Sending…' : editing ? 'Save changes →' : 'Send to DJ →'}
          </button>
        </div>
      </div>
    </div>
  );
}
