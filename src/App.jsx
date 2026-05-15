import React from 'react';
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

export default function App() {
  const { user, profile, loading, logout } = useAuth();

  if (loading) return <div className="loading">Loading GigBoard…</div>;
  if (!user || !profile) return <LoginPage />;

  return (
    <div style={{minHeight:'100vh'}}>
      <div className="topbar">
        <div className="logo">GIG<span>BOARD</span></div>

        <div className="user-chip">
          <div>
            <div style={{fontSize:13,fontWeight:500,lineHeight:1.2,textAlign:'right'}}>{profile.name}</div>
            <div style={{textAlign:'right',marginTop:2}}>
              <span className={`role-pill ${ROLE_CLASS[profile.role] || 'role-dj'}`}>{roleLabel(profile)}</span>
            </div>
          </div>
          <div
            className="avatar"
            style={{cursor:'pointer'}}
            title="Click to sign out"
            onClick={logout}
          >
            {user.photoURL
              ? <img src={user.photoURL} alt="avatar" style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} />
              : initials(profile.name)
            }
          </div>
        </div>
      </div>

      {profile.role === 'full_admin'  && <AdminDashboard />}
      {profile.role === 'venue_admin' && <VenueAdminDashboard />}
      {profile.role === 'dj'          && <DJDashboard />}
    </div>
  );
}
