import React, { useEffect, useState } from 'react';
import { getAllGigs, createGig, getAllUsers, updateUserRole, getAllUnavailability } from '../lib/db';
import { DJ_COLORS } from '../lib/config';
import CalendarView from '../components/CalendarView';
import AssignGigModal from '../components/AssignGigModal';

const DOT_COLORS = ['#00d4aa','#a080ff','#40a0ff','#ff60c0','#ffbb00','#80d040'];

function statusBadge(status) {
  return <span className={`badge badge-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

function djDot(name, idx) {
  const color = DOT_COLORS[idx % DOT_COLORS.length];
  return <div className="gig-dot" style={{background: color}} />;
}

function djTag(name) {
  const c = DJ_COLORS[name] || { color: '#9090b0', bg: '#1a1a2e' };
  return <span className="dj-tag" style={{background: c.bg, color: c.color}}>{name?.split(' ')[0]}</span>;
}

export default function AdminDashboard() {
  const [tab, setTab]         = useState('list');
  const [gigs, setGigs]       = useState([]);
  const [users, setUsers]     = useState([]);
  const [unavail, setUnavail] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [g, u, un] = await Promise.all([getAllGigs(), getAllUsers(), getAllUnavailability()]);
    setGigs(g);
    setUsers(u.filter(x => x.role !== 'full_admin'));
    setUnavail(un);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAssign(gigData) {
    await createGig({ ...gigData, assignedBy: 'Steve Howard' });
    load();
  }

  async function handleRoleChange(uid, role, venueScope) {
    await updateUserRole(uid, role, venueScope || null);
    load();
  }

  const upcoming  = gigs.filter(g => g.status !== 'rejected' && g.date >= new Date().toISOString().split('T')[0]);
  const pending   = gigs.filter(g => g.status === 'pending');
  const thisMonth = gigs.filter(g => {
    const d = new Date(g.date);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  });

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <>
      <div className="subnav">
        {['list','calendar','roster'].map(t => (
          <button key={t} className={`subnav-btn${tab===t?' active':''}`} onClick={() => setTab(t)}>
            {t === 'list' ? 'Gig list' : t === 'calendar' ? 'Month view' : 'DJ roster'}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <div className="page-body">
          <div className="stats-row">
            <div className="stat-card"><div className="stat-label">Upcoming</div><div className="stat-val neon">{upcoming.length}</div></div>
            <div className="stat-card"><div className="stat-label">Pending</div><div className="stat-val pending">{pending.length}</div></div>
            <div className="stat-card"><div className="stat-label">This month</div><div className="stat-val">{thisMonth.length}</div></div>
          </div>

          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Assign gig</button>
          </div>

          <div className="panel">
            <div className="panel-head">All venues — all DJs</div>
            {gigs.length === 0 && <div className="empty-state">No gigs yet. Assign one above.</div>}
            {gigs.map((g, i) => (
              <div key={g.id} className="gig-row">
                {djDot(g.djName, i)}
                <div className="gig-info">
                  <div className="gig-venue">{g.venue}</div>
                  <div className="gig-meta">{formatDate(g.date)} · {g.time}</div>
                </div>
                {djTag(g.djName)}
                {statusBadge(g.status)}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <CalendarView gigs={gigs} allUnavail={unavail} readOnly />
      )}

      {tab === 'roster' && (
        <div className="page-body">
          <div className="section-title">Manage DJ roster &amp; permissions</div>
          <div className="panel">
            <div className="panel-head">
              Active DJs
              <span style={{fontSize:10,color:'var(--text-muted)',fontWeight:400,textTransform:'none',letterSpacing:0}}>Change permissions anytime</span>
            </div>
            {users.map((u, i) => (
              <RosterRow key={u.uid} user={u} dotColor={DOT_COLORS[i % DOT_COLORS.length]} onRoleChange={handleRoleChange} />
            ))}
          </div>
        </div>
      )}

      {showModal && <AssignGigModal onClose={() => setShowModal(false)} onAssign={handleAssign} />}
    </>
  );
}

const VENUES = ['Wigwam', 'The Wash', 'Opium', 'District 8', "Workman's Club", 'The Button Factory'];

function RosterRow({ user, dotColor, onRoleChange }) {
  const [role, setRole]   = useState(user.role || 'dj');
  const [venue, setVenue] = useState(user.venueScope || VENUES[0]);

  function handleRole(e) {
    const r = e.target.value;
    setRole(r);
    onRoleChange(user.uid, r, r === 'venue_admin' ? venue : null);
  }
  function handleVenue(e) {
    setVenue(e.target.value);
    onRoleChange(user.uid, role, e.target.value);
  }

  const initials = user.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();

  return (
    <div>
      <div className="roster-row">
        <div className="avatar" style={{background: dotColor + '20', color: dotColor, borderColor: dotColor + '40'}}>{initials}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:500}}>{user.name}</div>
          <div style={{fontSize:11,color:'var(--text-muted)'}}>{user.email}</div>
        </div>
        <select className="perm-select" value={role} onChange={handleRole}>
          <option value="dj">DJ</option>
          <option value="venue_admin">Venue admin</option>
        </select>
      </div>
      {role === 'venue_admin' && (
        <div style={{padding:'6px 16px 10px 58px',borderBottom:'1px solid var(--bg-raised)'}}>
          <label style={{fontSize:10,color:'var(--text-muted)',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.07em'}}>Assigned venue</label>
          <select className="perm-select" style={{width:180}} value={venue} onChange={handleVenue}>
            {VENUES.map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-IE', { weekday:'short', day:'numeric', month:'short' });
}
