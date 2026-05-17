function RosterRow({ user, dotColor, onRoleChange, venues }) {
  const [role, setRole]   = useState(user.role || 'dj');
  const [scope, setScope] = useState(user.venueScope || VENUE_ADMIN_SCOPES[0]?.label || '');
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await onRoleChange(user.uid, role, role === 'venue_admin' ? scope : null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleRole(e) { setRole(e.target.value); }
  function handleScope(e) { setScope(e.target.value); }

  const initials = user.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();

  return (
    <div>
      <div className="roster-row">
        <div className="avatar" style={{background: dotColor+'20', color: dotColor, borderColor: dotColor+'40'}}>{initials}</div>
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
          <label style={{fontSize:10,color:'var(--text-muted)',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.07em'}}>Assigned scope</label>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <select className="perm-select" style={{width:180}} value={scope} onChange={handleScope}>
              {VENUE_ADMIN_SCOPES.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
            </select>
            <button
              onClick={handleSave}
              className="btn btn-primary btn-sm"
              style={{whiteSpace:'nowrap'}}
            >
              {saved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
