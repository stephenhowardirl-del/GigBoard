import React, { useEffect, useState, useRef } from 'react';
import { subscribeNotifications, markNotificationsRead, deleteNotifications } from '../lib/db';

function timeAgo(createdAt) {
  if (!createdAt) return '';
  const then = new Date(createdAt.replace(' ', 'T'));
  if (isNaN(then.getTime())) return '';
  const mins = Math.floor((Date.now() - then.getTime()) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

export default function NotificationBell({ address }) {
  const [items, setItems] = useState([]);
  const [open, setOpen]   = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!address) return;
    return subscribeNotifications(address, setItems);
  }, [address]);

  useEffect(() => {
    if (!open) return;
    function onClick(e) { if (!wrapRef.current?.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const unread = items.filter(n => !n.read);
  const shown  = items.slice(0, 25);

  function toggle(e) {
    e.stopPropagation();
    const next = !open;
    setOpen(next);
    // Opening the dropdown marks everything as seen.
    if (next && unread.length > 0) markNotificationsRead(unread.map(n => n.id));
  }

  function clearAll(e) {
    e.stopPropagation();
    if (items.length === 0) return;
    deleteNotifications(items.map(n => n.id));
    setOpen(false);
  }

  return (
    <div ref={wrapRef} style={{position:'relative'}}>
      <button
        onClick={toggle}
        title="Notifications"
        style={{
          background:'transparent', border:'1px solid var(--border-mid)',
          borderRadius:8, width:34, height:34,
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', fontSize:15, position:'relative', flexShrink:0,
        }}
      >
        🔔
        {unread.length > 0 && (
          <span style={{
            position:'absolute', top:-5, right:-5,
            background:'var(--danger)', color:'#fff',
            borderRadius:9, minWidth:17, height:17, padding:'0 4px',
            fontSize:10, fontWeight:700, lineHeight:'17px', textAlign:'center',
          }}>
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position:'absolute', top:42, right:0, zIndex:250,
            background:'var(--bg-surface)', border:'1px solid var(--border-mid)',
            borderRadius:10, width:310, maxHeight:400, overflowY:'auto',
            boxShadow:'0 8px 24px #00000060',
          }}
        >
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid var(--border)', position:'sticky', top:0, background:'var(--bg-surface)'}}>
            <span style={{fontSize:12, fontWeight:700, color:'var(--text-primary)'}}>Notifications</span>
            {items.length > 0 && (
              <button onClick={clearAll} style={{background:'transparent', border:'none', color:'var(--text-muted)', fontSize:11, cursor:'pointer'}}>
                Clear all
              </button>
            )}
          </div>

          {shown.length === 0 ? (
            <div style={{padding:'24px 14px', textAlign:'center', color:'var(--text-muted)', fontSize:12}}>
              No notifications yet.
            </div>
          ) : (
            shown.map(n => (
              <div key={n.id} style={{padding:'10px 14px', borderBottom:'1px solid var(--border)', display:'flex', gap:8, alignItems:'flex-start'}}>
                {!n.read && <span style={{width:7, height:7, borderRadius:'50%', background:'var(--neon)', flexShrink:0, marginTop:5}} />}
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:12, fontWeight:600, color:'var(--text-primary)', lineHeight:1.4}}>{n.title}</div>
                  {n.body && <div style={{fontSize:11, color:'var(--text-secondary)', marginTop:2, lineHeight:1.4}}>{n.body}</div>}
                  <div style={{fontSize:10, color:'var(--text-muted)', marginTop:3}}>{timeAgo(n.createdAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
