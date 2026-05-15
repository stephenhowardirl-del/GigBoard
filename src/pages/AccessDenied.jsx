import React from 'react';
import { useAuth } from '../hooks/useAuth';

export default function AccessDenied() {
  const { user, logout } = useAuth();

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0a0a0f'}}>
      <div style={{background:'#0d0d14',border:'1px solid #1e1e2e',borderRadius:16,padding:'48px 40px',textAlign:'center',width:360}}>
        <div style={{fontFamily:'var(--font-mono)',fontSize:22,fontWeight:500,letterSpacing:'0.06em',color:'#fff',marginBottom:8}}>
          GIG<span style={{color:'#00ffc2'}}>BOARD</span>
        </div>
        <div style={{width:48,height:48,borderRadius:'50%',background:'#1a0008',border:'1px solid #ff407050',display:'flex',alignItems:'center',justifyContent:'center',margin:'24px auto',fontSize:22}}>
          🔒
        </div>
        <div style={{fontSize:16,fontWeight:600,color:'#e8e8f0',marginBottom:8}}>Access not yet granted</div>
        <div style={{fontSize:13,color:'#404060',marginBottom:6}}>
          Your account <strong style={{color:'#6060a0'}}>{user?.email}</strong> has not been added to GigBoard yet.
        </div>
        <div style={{fontSize:13,color:'#404060',marginBottom:28}}>
          Contact Steve to get access.
        </div>
        <button
          onClick={logout}
          style={{width:'100%',padding:10,borderRadius:7,border:'1px solid #1e1e2e',background:'transparent',color:'#6060a0',fontSize:13,cursor:'pointer'}}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
