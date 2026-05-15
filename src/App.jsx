import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import VenueAdminDashboard from './pages/VenueAdminDashboard';
import DJDashboard from './pages/DJDashboard';
import './index.css';

const ROLE_LABELS = {
  full_admin:  'Full admin',
  venue_admin: 'Venue admin',
  dj:          'DJ',
};

const ROLE_CLASS = {
  full_admin:  'role-full-admin',
  venue_admin: 'role-venue-admin',
  dj:          'role-dj',
};

function roleLabel(profile) {
  if (profile.role === 'venue_admin' && profile.venueScope) {
    return `Venue admin · ${profile.venueScope}`;
  }
  return ROLE_LABELS[profile.role] || 'DJ';
}

function initials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function GigBoardLogo() {
  return (
    <div style={{display:'flex', alignItems:'center', gap:10}}>
      <svg width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="6" fill="#0a0a0f"/>
        <rect x="2" y="12" width="3" height="8" rx="1.5" fill="#00ffc2"/>
        <rect x="7" y="9" width="3" height="14" rx="1.5" fill="#00ffc2" opacity="0.8"/>
        <rect x="12" y="6" width="3" height="20" rx="1.5" fill="#00ffc2"/>
        <rect x="17" y="11" width="3" height="10" rx="1.5" fill="#00ffc2" opacity="0.7"/>
        <rect x="22" y="8" width="3" height="16" rx="1.5" fill="#00ffc2" opacity="0.9"/>
        <rect x="27" y="13" width="3" height="6" rx="1.5" fill="#00ffc2" opacity="0.6"/>
      </svg>
      <div style={{fontFamily:'var(--font-mono)', fontSize:16, fontWeight:500, letterSpacing:'0.06em', color:'#fff'}}>
        GIG<span style={{color:'#00ffc2'}}>BOARD</span>
      </div>
    </div>
  );
}

export default function App() {
  const { user, profile, loading, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  if (loading) return <div className="loading">Loading GigBoard…</div>;
  if (!user || !profile) return <LoginPage />;

  return (
    <div style={{minHeight:'100vh'}} onClick={() => setShowMenu(false)}>
      <div className="topbar">
        <GigBoardLogo />

        <div className="user-chip" style={{position:'relative'}}>
          <div>
            <div style={{fontSize:13,fontWeight:500,lineHeight:1.2,textAlign:'right'}}>{profile.name}</div>
            <div style={{textAlign:'right',marginTop:2}}>
              <span className={`role-pill ${ROLE_CLASS[profile.role] || 'role-dj'}`}>{roleLabel(profile)}</span>
            </div>
          </div>

          <div
            className="avatar"
            style={{cursor:'pointer'}}
            onClick={e => { e.stopPropagation(); setShowMenu(m => !m); }}
          >
            {user.photoURL
              ? <img src={user.photoURL} alt="avatar" style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} />
              : initials(profile.name)
            }
          </div>

          {showMenu && (
            <div style={{
              position:'absolute', top:44, right:0, zIndex:200,
              background:'#0d0d14', border:'1px solid #2a2a40',
              borderRadius:8, minWidth:160, overflow:'hidden',
              boxShadow:'0 8px 24px #00000060',
            }} onClick={e => e.stopPropagation()}>
              <div style={{padding:'10px 14px', borderBottom:'1px solid #1e1e2e'}}>
                <div style={{fontSize:12,fontWeight:500,color:'#e8e8f0'}}>{profile.name}</div>
                <div style={{fontSize:11,color:'#404060',marginTop:2}}>{user.email}</div>
              </div>
              <button
                onClick={() => { setShowMenu(false); logout(); }}
                style={{
                  width:'100%', padding:'10px 14px', background:'transparent',
                  border:'none', color:'#ff4070', fontSize:13, fontWeight:500,
                  textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:8,
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {profile.role === 'full_admin'  && <AdminDashboard />}
      {profile.role === 'venue_admin' && <VenueAdminDashboard />}
      {profile.role === 'dj'          && <DJDashboard />}
    </div>
  );
}
