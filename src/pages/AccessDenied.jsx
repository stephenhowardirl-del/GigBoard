import React from 'react';
import { useAuth } from '../hooks/useAuth';

export default function AccessDenied() {
  const { user, logout } = useAuth();

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg-base)'}}>
      <div style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:16,padding:'48px 40px',textAlign:'center',width:360}}>
        <div style={{fontFamily:'var(--font-display)',fontSize:24,fontWeight:700,letterSpacing:'-0.01em',color:'var(--text-primary)',marginBottom:8}}>
          GigBoard
        </div>
        <div style={{width:48,height:48,borderRadius:'50%',background:'var(--danger-bg)',border:'1px solid var(--danger-border)',display:'flex',alignItems:'center',justifyContent:'center',margin:'24px auto',fontSize:22}}>
          🔒
        </div>
        <div style={{fontSize:16,fontWeight:600,color:'var(--text-primary)',marginBottom:8}}>Access not yet granted</div>
        <div style={{fontSize:13,color:'var(--text-secondary)',marginBottom:6}}>
          Your account <strong style={{color:'var(--text-primary)'}}>{user?.email}</strong> has not been added to GigBoard yet.
        </div>
        <div style={{fontSize:13,color:'var(--text-secondary)',marginBottom:28}}>
          Contact Steve to get access.
        </div>
        <button
          onClick={logout}
          style={{width:'100%',padding:10,borderRadius:7,border:'1px solid var(--border-mid)',background:'transparent',color:'var(--text-secondary)',fontSize:13,cursor:'pointer'}}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
