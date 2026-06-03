import React, { useEffect, useState } from 'react';
import { getGigsForDJ, updateGigStatus, getUnavailableDates, setUnavailableDates, createGigConfirmed, updateGig } from '../lib/db';
import { getVenueColor, getVenueLogo } from '../lib/venueGroups';
import { useAuth } from '../hooks/useAuth';
import CalendarView from '../components/CalendarView';
import InvoiceModal from '../components/InvoiceModal';
import FinancialsTab from '../components/FinancialsTab';

const TIMES = Array.from({length: 48}, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS      = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-IE', { weekday:'short', day:'numeric', month:'short' });
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isoForDate(year, month, day) {
  return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function isNightTime(time) {
  if (!time) return false;
  const hour = parseInt(time.split(':')[0], 10);
  return hour >= 18 || hour < 6;
}

function getRecurringDates(startIso, endIso, dayOfWeek) {
  const dates = [];
  const start = new Date(startIso + 'T12:00:00');
  const end   = new Date(endIso   + 'T12:00:00');
  const cur   = new Date(start);
  const jsDow = (dayOfWeek + 1) % 7;
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

function SingleCalendar({ selected, onChange, gigDates = [] }) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

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
        {DAYS.map(d => <div key={d} style={{fontSize:9,color:'#404060',textAlign:'center',padding:'2px 0',textTransform:'uppercase'}}>{d}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
        {Array.from({length: firstDow}, (_, i) => <div key={`e${i}`} />)}
        {Array.from({length: daysInMonth}, (_, i) => {
          const d   = i + 1;
          const iso = isoForDate(year, month, d);
          const isSelected = iso === selected;
          const isToday    = iso === today;
          const isPast     = iso < today;
          const hasGig     = gigDates.includes(iso);
          return (
            <div key={d} onClick={() => !isPast && onChange(iso)} style={{
              textAlign:'center', padding:'5px 0', borderRadius:4, fontSize:11,
              cursor: isPast ? 'not-allowed' : 'pointer',
              fontWeight: isSelected ? 700 : 400,
              background: isSelected ? '#00ffc2' : isToday ? '#0a1a14' : 'transparent',
              color: isSelected ? '#000' : isPast ? '#2a2a40' : isToday ? '#00ffc2' : hasGig ? '#ffbb00' : '#c0c0d0',
              border: isToday && !isSelected ? '1px solid #00ffc230' : '1px solid transparent',
              position: 'relative',
            }}>
              {d}
              {hasGig && !isSelected && <div style={{width:3,height:3,borderRadius:'50%',background:'#ffbb00',position:'absolute',bottom:2,left:'50%',transform:'translateX(-50%)'}} />}
            </div>
          );
        })}
      </div>
      {selected && <div style={{marginTop:10,fontSize:11,color:'#00ffc2',textAlign:'center',fontWeight:600}}>{formatDate(selected)}</div>}
    </div>
  );
}

function MultiCalendar({ selected, onChange }) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7;
  const today       = todayStr();

  function toggleDate(iso) {
    if (selected.includes(iso)) onChange(selected.filter(d => d !== iso));
    else onChange([...selected, iso].sort());
  }

  return (
    <div style={{background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:8,padding:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <button onClick={prevMonth} style={{background:'transparent',border:'none',color:'#6060a0',fontSize:16,cursor:'pointer',padding:'0 6px'}}>‹</button>
        <div style={{fontSize:12,color:'#e8e8f0',fontWeight:600}}>{MONTHS[month]} {year}</div>
        <button onClick={nextMonth} style={{background:'transparent',border:'none',color:'#6060a0',fontSize:16,cursor:'pointer',padding:'0 6px'}}>›</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
        {DAYS.map(d => <div key={d} style={{fontSize:9,color:'#404060',textAlign:'center',padding:'2px 0',textTransform:'uppercase'}}>{d}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
        {Array.from({length: firstDow}, (_, i) => <div key={`e${i}`} />)}
        {Array.from({length: daysInMonth}, (_, i) => {
          const d          = i + 1;
          const iso        = isoForDate(year, month, d);
          const isSelected = selected.includes(iso);
          const isToday    = iso === today;
          const isPast     = iso < today;
          return (
            <div key={d} onClick={() => !isPast && toggleDate(iso)} style={{
              textAlign:'center', padding:'5px 0', borderRadius:4, fontSize:11,
              cursor: isPast ? 'not-allowed' : 'pointer',
              fontWeight: isSelected ? 700 : 400,
              background: isSelected ? '#00ffc2' : isToday ? '#0a1a14' : 'transparent',
              color: isSelected ? '#000' : isPast ? '#2a2a40' : isToday ? '#00ffc2' : '#c0c0d0',
              border: isSelected ? '1px solid #00ffc2' : isToday ? '1px solid #00ffc230' : '1px solid transparent',
            }}>
              {d}
            </div>
          );
        })}
      </div>
      {selected.length > 0 && <div style={{marginTop:10,fontSize:11,color:'#00ffc2',textAlign:'center',fontWeight:600}}>{selected.length} date{selected.length !== 1 ? 's' : ''} selected</div>}
    </div>
  );
}

function NotesBanner({ notes }) {
  if (!notes) return null;
  return (
    <div style={{background:'#1a1400',border:'1px solid #ffbb0040',borderRadius:6,padding:'7px 10px',marginTop:8,fontSize:12,color:'#ffdd80',display:'flex',alignItems:'flex-start',gap:7}}>
      <span style={{fontSize:14,flexShrink:0}}>📌</span>
      <span>{notes}</span>
    </div>
  );
}

function SuccessToast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
  return (
    <div style={{position:'fixed',bottom:30,left:'50%',transform:'translateX(-50%)',background:'#002a1a',border:'1px solid #00ffcc60',borderRadius:10,padding:'14px 24px',color:'#00ffcc',fontSize:14,fontWeight:600,zIndex:400,boxShadow:'0 8px 24px #00000080',display:'flex',alignItems:'center',gap:10}}>
      <span style={{fontSize:18}}>✓</span>
      {message}
    </div>
  );
}

function EditGigModal({ gig, venues, onClose, onSaved }) {
  const [venue, setVenue]   = useState(gig.venue);
  const [date, setDate]     = useState(gig.date);
  const [time, setTime]     = useState(gig.time || '');
  const [notes, setNotes]   = useState(gig.notes || '');
  const [fee, setFee]       = useState(gig.fee || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!venue || !date || !time) return;
    setSaving(true);
    await updateGig(gig.id, { venue, date, time, notes, fee, djUid: gig.djUid, djName: gig.djName, djEmail: gig.djEmail || '' });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div style={{position:'fixed',inset:0,background:'#00000080',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#0d0d14',border:'1px solid #2a2a40',borderRadius:12,padding:28,width:'100%',maxWidth:420,maxHeight:'90vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>
        <div style={{fontSize:17,fontWeight:600,color:'#e8e8f0',marginBottom:4}}>Edit gig</div>
        <div style={{fontSize:12,color:'#8080a0',marginBottom:20}}>Update the details for this gig.</div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:'#8080a0',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.07em'}}>Venue</label>
          <select value={venue} onChange={e => setVenue(e.target.value)} style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:13,padding:'8px 10px'}}>
            {venues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:'#8080a0',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.07em'}}>Date</label>
          <SingleCalendar selected={date} onChange={setDate} />
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:'#8080a0',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.07em'}}>Time</label>
          <select value={time} onChange={e => setTime(e.target.value)} style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:13,padding:'8px 10px'}}>
            <option value=''>Select time</option>
            {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:'#8080a0',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.07em'}}>Fee (€)</label>
          <input type="number" value={fee} onChange={e => setFee(e.target.value)} placeholder="e.g. 150" style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:13,padding:'8px 10px'}} />
        </div>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:11,color:'#8080a0',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.07em'}}>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:13,padding:'8px 10px',resize:'vertical',fontFamily:'inherit'}} />
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} className="btn btn-ghost" style={{flex:1}}>Cancel</button>
          <button onClick={handleSave} disabled={!venue || !date || !time || saving} className="btn btn-primary" style={{flex:1}}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SelfAssignModal({ venues, profile, gigs, onClose, onBooked }) {
  const [mode, setMode]             = useState('single');
  const [venue, setVenue]           = useState(venues[0] || '');
  const [date, setDate]             = useState('');
  const [multiDates, setMultiDates] = useState([]);
  const [recurStart, setRecurStart] = useState('');
  const [recurEnd, setRecurEnd]     = useState('');
  const [recurDay, setRecurDay]     = useState(3);
  const [time, setTime]             = useState('');
  const [fee, setFee]               = useState('');
  const [notes, setNotes]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [preview, setPreview]       = useState([]);

  const gigDates = gigs.filter(g => g.status === 'confirmed').map(g => g.date);

  useEffect(() => {
    if (mode === 'recurring' && recurStart && recurEnd) setPreview(getRecurringDates(recurStart, recurEnd, recurDay));
    else setPreview([]);
  }, [mode, recurStart, recurEnd, recurDay]);

  function getDates() {
    if (mode === 'single')    return date ? [date] : [];
    if (mode === 'multi')     return multiDates;
    if (mode === 'recurring') return preview;
    return [];
  }

  const dates   = getDates();
  const isValid = dates.length > 0 && time && venue;

  async function handleBook() {
    if (!isValid) return;
    setSaving(true);
    for (const d of dates) {
      await createGigConfirmed({
        venue, date: d, time,
        djUid: profile.uid, djName: profile.name, djEmail: profile.email || '',
        notes, fee: fee || null, assignedBy: profile.name,
      });
    }
    setSaving(false);
    onBooked();
    onClose();
  }

  const btnStyle = (active) => ({
    flex:1, padding:'7px 0', borderRadius:6,
    border: `1px solid ${active ? '#00ffc250' : '#2a2a40'}`,
    background: active ? '#00ffc215' : 'transparent',
    color: active ? '#00ffc2' : '#8080a0',
    fontSize:12, fontWeight: active ? 600 : 400,
    cursor:'pointer', transition:'all 0.15s',
  });

  const fl = {fontSize:11,color:'#8080a0',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.07em'};
  const fi = {width:'100%',background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:13,padding:'8px 10px'};

  return (
    <div style={{position:'fixed',inset:0,background:'#00000080',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#0d0d14',border:'1px solid #2a2a40',borderRadius:12,padding:28,width:'100%',maxWidth:420,maxHeight:'90vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>
        <div style={{fontSize:17,fontWeight:600,color:'#e8e8f0',marginBottom:4}}>Book a gig</div>
        <div style={{fontSize:12,color:'#8080a0',marginBottom:16}}>Goes straight to confirmed.</div>

        <div style={{display:'flex',gap:6,marginBottom:16}}>
          <button style={btnStyle(mode==='single')}    onClick={() => setMode('single')}>Single date</button>
          <button style={btnStyle(mode==='multi')}     onClick={() => setMode('multi')}>Multiple dates</button>
          <button style={btnStyle(mode==='recurring')} onClick={() => setMode('recurring')}>Recurring</button>
        </div>

        <div style={{marginBottom:14}}>
          <label style={fl}>Venue</label>
          <select value={venue} onChange={e => setVenue(e.target.value)} style={fi}>
            {venues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        {mode === 'single' && (
          <div style={{marginBottom:14}}>
            <label style={fl}>Date</label>
            <SingleCalendar selected={date} onChange={setDate} gigDates={gigDates} />
          </div>
        )}

        {mode === 'multi' && (
          <div style={{marginBottom:14}}>
            <label style={fl}>Select dates — tap to toggle</label>
            <MultiCalendar selected={multiDates} onChange={setMultiDates} />
            {multiDates.length > 0 && (
              <div style={{marginTop:8,display:'flex',flexWrap:'wrap',gap:4}}>
                {multiDates.map(d => (
                  <span key={d} style={{fontSize:10,background:'#00ffc215',border:'1px solid #00ffc230',color:'#00ffc2',borderRadius:4,padding:'2px 6px'}}>
                    {new Date(d+'T12:00:00').toLocaleDateString('en-IE',{day:'numeric',month:'short'})}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'recurring' && (
          <>
            <div style={{marginBottom:14}}>
              <label style={fl}>Day of week</label>
              <select value={recurDay} onChange={e => setRecurDay(Number(e.target.value))} style={fi}>
                {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
              </select>
            </div>
            <div style={{display:'flex',gap:10,marginBottom:14}}>
              <div style={{flex:1}}><label style={fl}>From</label><input type="date" value={recurStart} onChange={e => setRecurStart(e.target.value)} style={fi} /></div>
              <div style={{flex:1}}><label style={fl}>To</label><input type="date" value={recurEnd} onChange={e => setRecurEnd(e.target.value)} style={fi} /></div>
            </div>
            {preview.length > 0 && (
              <div style={{background:'#0a1a10',border:'1px solid #00ffc230',borderRadius:6,padding:10,marginBottom:14}}>
                <div style={{fontSize:11,color:'#00ffc2',fontWeight:600,marginBottom:6}}>
                  {preview.length} gig{preview.length !== 1 ? 's' : ''} will be created — every {DAY_NAMES[recurDay]}
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                  {preview.map(d => (
                    <span key={d} style={{fontSize:10,background:'#00ffc215',border:'1px solid #00ffc230',color:'#00ffc2',borderRadius:4,padding:'2px 6px'}}>
                      {new Date(d+'T12:00:00').toLocaleDateString('en-IE',{day:'numeric',month:'short'})}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div style={{marginBottom:14}}>
          <label style={fl}>Time</label>
          <select value={time} onChange={e => setTime(e.target.value)} style={fi}>
            <option value=''>Select time</option>
            {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div style={{marginBottom:14}}>
          <label style={fl}>Fee (€)</label>
          <input type="number" value={fee} onChange={e => setFee(e.target.value)} placeholder="e.g. 150" style={fi} />
        </div>

        <div style={{marginBottom:20}}>
          <label style={fl}>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{...fi,resize:'vertical',fontFamily:'inherit'}} />
        </div>

        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} className="btn btn-ghost" style={{flex:1}}>Cancel</button>
          <button onClick={handleBook} disabled={!isValid || saving} className="btn btn-primary" style={{flex:1}}>
            {saving ? 'Booking…' : dates.length > 1 ? `Book ${dates.length} gigs →` : 'Confirm booking'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GigRow({ g, profile, isPreview, hideFees, onEdit, onInvoice }) {
  const d    = new Date(g.date + 'T12:00:00');
  const vc   = getVenueColor(g.venue);
  const logo = getVenueLogo(g.venue);
  const isSelfAssigned = g.assignedBy === profile.name;
  return (
    <div className="timeline-item" style={{borderLeft:`3px solid ${vc.color}`, flexWrap:'wrap'}}>
      <div className="timeline-date">
        <div className="timeline-day" style={{color:vc.color}}>{d.getDate()}</div>
        <div className="timeline-month">{d.toLocaleDateString('en-IE',{month:'short'})}</div>
      </div>
      <div className="timeline-line" style={{background:vc.color+'40'}} />
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
          {logo && <img src={logo} alt={g.venue} style={{width:44,height:44,borderRadius:8,objectFit:'cover',flexShrink:0}} onError={e=>{e.target.style.display='none';}} />}
          <div>
            <div className="timeline-venue" style={{fontSize:15,fontWeight:700}}>{g.venue}</div>
            <div style={{fontSize:13,color:'#c0c0d8',fontWeight:500,marginTop:2}}>{g.time} · {d.toLocaleDateString('en-IE',{weekday:'long'})}</div>
          </div>
        </div>
        {!hideFees && g.fee && <div style={{fontSize:14,color:'#00ffc2',fontWeight:700,marginTop:2}}>€{g.fee}</div>}
        {g.notes && <NotesBanner notes={g.notes} />}
      </div>
      {!isPreview && (
        <div style={{display:'flex',flexDirection:'column',gap:6,alignSelf:'center'}}>
          {isSelfAssigned && <button onClick={() => onEdit(g)} style={{background:'transparent',border:'1px solid #2a2a40',color:'#9090b0',borderRadius:5,padding:'4px 10px',fontSize:11,cursor:'pointer',whiteSpace:'nowrap'}}>✏️ Edit</button>}
          {!hideFees && g.fee && <button onClick={() => onInvoice(g)} style={{background:'transparent',border:'1px solid #2a2a40',color:'#9090b0',borderRadius:5,padding:'4px 10px',fontSize:11,cursor:'pointer',whiteSpace:'nowrap'}}>🧾 Invoice</button>}
        </div>
      )}
    </div>
  );
}

function TodayBanner({ gigs, hideFees }) {
  const sorted = [...gigs].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const allDay = sorted.every(g => !isNightTime(g.time));
  const label  = allDay ? '📅 Today' : '🎧 Tonight';
  const accent = allDay ? '#00ffc2' : '#ff9900';
  const bg     = allDay ? '#001a10' : '#1a0a00';
  const border = allDay ? '#00ffc240' : '#ff990060';

  return (
    <div style={{background:bg, border:`2px solid ${border}`, borderRadius:12, padding:'16px 20px', marginBottom:20}}>
      <div style={{fontSize:12,fontWeight:700,color:accent,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:14}}>{label}</div>
      {sorted.map((g, i) => {
        const vc   = getVenueColor(g.venue);
        const logo = getVenueLogo(g.venue);
        return (
          <div key={g.id} style={{display:'flex',alignItems:'center',gap:14,paddingTop:i>0?14:0,marginTop:i>0?14:0,borderTop:i>0?`1px solid ${accent}20`:'none'}}>
            {logo ? (
              <img src={logo} alt={g.venue} style={{width:54,height:54,borderRadius:10,objectFit:'cover',flexShrink:0}} onError={e=>{e.target.style.display='none';}} />
            ) : (
              <div style={{width:54,height:54,borderRadius:10,background:vc.bg,border:`1px solid ${vc.color}40`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{width:14,height:14,borderRadius:'50%',background:vc.color}} />
              </div>
            )}
            <div style={{flex:1}}>
              <div style={{fontSize:18,fontWeight:700,color:'#ffffff',marginBottom:4}}>{g.venue}</div>
              <div style={{fontSize:14,color:'#d0d0e8',fontWeight:500}}>{g.time}</div>
              {!hideFees && g.fee && <div style={{fontSize:15,color:'#00ffc2',fontWeight:700,marginTop:6}}>€{g.fee}</div>}
              {g.notes && <NotesBanner notes={g.notes} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DJDashboard({ previewProfile, hideFees }) {
  const { user, profile: authProfile } = useAuth();
  const profile   = previewProfile || authProfile;
  const isPreview = !!previewProfile;

  const [tab, setTab]                   = useState('schedule');
  const [gigs, setGigs]                 = useState([]);
  const [unavail, setUnavail]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showBooking, setShowBooking]   = useState(false);
  const [invoiceGig, setInvoiceGig]     = useState(null);
  const [editingGig, setEditingGig]     = useState(null);
  const [toast, setToast]               = useState(null);
  const [showPastGigs, setShowPastGigs] = useState(false);

  const selfAssignVenues = profile?.selfAssignVenues || [];

  async function load() {
    const [g, un] = await Promise.all([
      getGigsForDJ(profile.uid),
      getUnavailableDates(profile.uid),
    ]);
    setGigs(g);
    setUnavail(un);
    setLoading(false);
  }

  useEffect(() => { if (profile?.uid) load(); }, [profile?.uid]);

  async function handleAccept(gig) { await updateGigStatus(gig.id, 'confirmed'); load(); }
  async function handleReject(gig) { await updateGigStatus(gig.id, 'rejected');  load(); }
  async function handleToggleUnavail(isoDate) {
    if (isPreview) return;
    const next = unavail.includes(isoDate) ? unavail.filter(d => d !== isoDate) : [...unavail, isoDate];
    setUnavail(next);
    await setUnavailableDates(profile.uid, next);
  }

  function handleBooked() { load(); setToast('Gig booked and confirmed!'); }
  function handleSaved()  { load(); setToast('Gig updated!'); }

  const now          = new Date();
  const pending      = gigs.filter(g => g.status === 'pending');
  const confirmed    = gigs.filter(g => g.status === 'confirmed');
  const todayGigs    = confirmed.filter(g => g.date === todayStr());
  const upcomingGigs = confirmed.filter(g => g.date > todayStr());
  const pastGigs     = confirmed.filter(g => g.date < todayStr()).reverse();
  const nextGig      = upcomingGigs[0];

  const monthEarnings    = gigs.filter(g => { if (g.status !== 'confirmed' || !g.fee) return false; const d = new Date(g.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((sum, g) => sum + Number(g.fee), 0);
  const upcomingEarnings = upcomingGigs.filter(g => g.fee).reduce((sum, g) => sum + Number(g.fee), 0);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="subnav">
        <button className={'subnav-btn'+(tab==='schedule'?' active':'')} onClick={() => setTab('schedule')}>My schedule</button>
        <button className={'subnav-btn'+(tab==='calendar'?' active':'')} onClick={() => setTab('calendar')}>Month view</button>
        <button className={'subnav-btn'+(tab==='pending'?' active':'')} onClick={() => setTab('pending')}>
          Pending{pending.length > 0 && <span className="notif-dot">{pending.length}</span>}
        </button>
        <button className={'subnav-btn'+(tab==='financials'?' active':'')} onClick={() => setTab('financials')}>Financials</button>
        {!isPreview && selfAssignVenues.length > 0 && (
          <button className="subnav-btn" onClick={() => setShowBooking(true)} style={{color:'#00ffc2',borderBottom:'2px solid transparent'}}>+ Book a gig</button>
        )}
      </div>

      {tab === 'schedule' && (
        <div className="page-body">
          <div className="stats-row" style={{marginBottom:20}}>
            <div className="stat-card"><div className="stat-label">This month</div><div className="stat-val neon">{hideFees ? '—' : `€${monthEarnings}`}</div></div>
            <div className="stat-card"><div className="stat-label">Upcoming total</div><div className="stat-val" style={{color:'#a080ff'}}>{hideFees ? '—' : `€${upcomingEarnings}`}</div></div>
            <div className="stat-card"><div className="stat-label">Confirmed gigs</div><div className="stat-val">{upcomingGigs.length + todayGigs.length}</div></div>
          </div>

          {todayGigs.length > 0 && <TodayBanner gigs={todayGigs} hideFees={hideFees} />}

          {todayGigs.length === 0 && nextGig && (
            <div className="next-gig-card" style={{borderColor: getVenueColor(nextGig.venue).color+'40', marginBottom:20}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:700,color:'#8080a0',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10}}>Next up</div>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                  {getVenueLogo(nextGig.venue) && <img src={getVenueLogo(nextGig.venue)} alt={nextGig.venue} style={{width:52,height:52,borderRadius:10,objectFit:'cover'}} onError={e=>{e.target.style.display='none';}} />}
                  <div>
                    <div style={{fontSize:20,fontWeight:700,color:'#ffffff'}}>{nextGig.venue}</div>
                    <div style={{fontSize:14,color:'#d0d0e8',fontWeight:500,marginTop:3}}>{formatDate(nextGig.date)} · {nextGig.time}</div>
                  </div>
                </div>
                {!hideFees && nextGig.fee && <div style={{fontSize:16,color:'#00ffc2',fontWeight:700}}>€{nextGig.fee}</div>}
                {nextGig.notes && <NotesBanner notes={nextGig.notes} />}
              </div>
              <div style={{textAlign:'center',flexShrink:0}}>
                <div style={{fontSize:40,fontWeight:700,fontFamily:'var(--font-mono)',color:'#00ffc2',lineHeight:1}}>
                  {Math.round((new Date(nextGig.date+'T12:00:00') - new Date().setHours(0,0,0,0)) / 86400000)}
                </div>
                <div style={{fontSize:11,color:'#8080a0',letterSpacing:'0.1em',textTransform:'uppercase',marginTop:4}}>days away</div>
              </div>
            </div>
          )}

          {todayGigs.length === 0 && !nextGig && (
            <div style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:10,padding:20,marginBottom:20,textAlign:'center',color:'#8080a0',fontSize:13}}>
              No upcoming confirmed gigs.
            </div>
          )}

          {upcomingGigs.length > 0 && (
            <>
              <div className="section-title">Upcoming gigs</div>
              <div className="panel">
                {upcomingGigs.map(g => <GigRow key={g.id} g={g} profile={profile} isPreview={isPreview} hideFees={hideFees} onEdit={setEditingGig} onInvoice={setInvoiceGig} />)}
              </div>
            </>
          )}

          {pastGigs.length > 0 && (
            <div style={{marginTop:20}}>
              <button onClick={() => setShowPastGigs(p => !p)} style={{background:'transparent',border:'1px solid #2a2a40',borderRadius:6,color:'#8080a0',fontSize:12,padding:'6px 14px',cursor:'pointer',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
                {showPastGigs ? '▲' : '▼'} Past gigs ({pastGigs.length})
              </button>
              {showPastGigs && (
                <div className="panel">
                  {pastGigs.map(g => <GigRow key={g.id} g={g} profile={profile} isPreview={isPreview} hideFees={hideFees} onEdit={setEditingGig} onInvoice={setInvoiceGig} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'calendar' && (
        <CalendarView gigs={gigs} unavailDates={unavail} onToggleUnavail={isPreview ? null : handleToggleUnavail} readOnly={isPreview} />
      )}

      {tab === 'pending' && (
        <div className="page-body">
          {pending.length === 0 && <div className="empty-state">No pending gigs right now.</div>}
          {pending.map(g => {
            const vc = getVenueColor(g.venue); const logo = getVenueLogo(g.venue);
            return (
              <div key={g.id} className="pending-card" style={{borderColor:vc.color+'40'}}>
                <div className="pending-head" style={{background:vc.bg,color:vc.color}}>⏳ Gig offer — action required</div>
                <div className="pending-body">
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                    {logo && <img src={logo} alt={g.venue} style={{width:48,height:48,borderRadius:10,objectFit:'cover'}} onError={e=>{e.target.style.display='none';}} />}
                    <div>
                      <div className="pending-venue" style={{fontSize:16,fontWeight:700}}>{g.venue}</div>
                      <div style={{fontSize:13,color:'#c0c0d8',fontWeight:500,marginTop:3}}>{formatDate(g.date)} · {g.time}</div>
                    </div>
                  </div>
                  {!hideFees && g.fee && <div style={{fontSize:15,color:'#00ffc2',fontWeight:700,marginBottom:10}}>Fee: €{g.fee}</div>}
                  {g.notes && <NotesBanner notes={g.notes} />}
                  <div className="pending-actions" style={{marginTop:12}}>
                    <button className="btn btn-primary" onClick={() => handleAccept(g)}>Accept</button>
                    <button className="btn btn-danger"  onClick={() => handleReject(g)}>Reject</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'financials' && (
        <FinancialsTab gigs={gigs} profile={profile} userUid={profile.uid} hideFees={hideFees} />
      )}

      {!isPreview && showBooking && (
        <SelfAssignModal venues={selfAssignVenues} profile={profile} gigs={gigs} onClose={() => setShowBooking(false)} onBooked={handleBooked} />
      )}

      {!isPreview && editingGig && (
        <EditGigModal gig={editingGig} venues={selfAssignVenues} onClose={() => setEditingGig(null)} onSaved={handleSaved} />
      )}

      {!isPreview && invoiceGig && (
        <InvoiceModal gig={invoiceGig} userUid={user.uid} allGigs={gigs} onClose={() => setInvoiceGig(null)} />
      )}

      {toast && <SuccessToast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
