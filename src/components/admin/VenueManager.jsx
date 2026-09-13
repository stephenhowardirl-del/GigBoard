import React, { useState, useEffect } from 'react';
import {
  getVenueConfig, subscribeVenueConfig, saveVenueConfig,
  AVAILABLE_LOGOS, GROUP_COLOR_PALETTE,
} from '../../lib/venueGroups';

const inputStyle = { background:'#0a0a0f', border:'1px solid #2a2a40', borderRadius:6, color:'#e8e8f0', fontSize:13, padding:'8px 10px' };
const label      = { fontSize:10, color:'#8080a0', textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:700, display:'block', marginBottom:5 };

function normaliseLogo(val) {
  const v = (val || '').trim();
  if (!v) return null;
  if (v.startsWith('/') || v.startsWith('http')) return v;
  return '/logos/' + v;
}

export default function VenueManager({ onChanged }) {
  const [cfg, setCfg]           = useState(getVenueConfig());
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [newVenue, setNewVenue] = useState('');
  const [newVenueGroup, setNewVenueGroup] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [editing, setEditing]   = useState(null);
  const [editName, setEditName] = useState('');
  const [logoDraft, setLogoDraft] = useState({});
  // All groups collapsed by default — expanded is a Set of group names currently open
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => subscribeVenueConfig(setCfg), []);

  function toggleExpanded(name) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function persist(next) {
    setSaving(true);
    try {
      await saveVenueConfig(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      onChanged && onChanged(next);
    } catch (e) { console.error(e); alert('Save failed: ' + e.message); }
    setSaving(false);
  }

  function addVenue() {
    const name = newVenue.trim();
    if (!name) return;
    if (cfg.venues.some(v => v.name.toLowerCase() === name.toLowerCase())) { alert('That venue already exists'); return; }
    persist({ ...cfg, venues: [...cfg.venues, { name, group: newVenueGroup || null, logo: null }] });
    setNewVenue('');
    // Auto-expand whichever section the new venue lands in
    setExpanded(prev => new Set([...prev, newVenueGroup || '__ungrouped__']));
  }

  function updateVenue(name, patch) {
    persist({ ...cfg, venues: cfg.venues.map(v => v.name === name ? { ...v, ...patch } : v) });
  }

  function renameVenue(oldName) {
    const name = editName.trim();
    setEditing(null);
    if (!name || name === oldName) return;
    if (cfg.venues.some(v => v.name.toLowerCase() === name.toLowerCase())) { alert('That name is already in use'); return; }
    persist({ ...cfg, venues: cfg.venues.map(v => v.name === oldName ? { ...v, name } : v) });
  }

  function removeVenue(name) {
    if (!window.confirm(`Remove "${name}"?\n\nExisting gigs at this venue are kept, but you won't be able to book new ones here.`)) return;
    persist({ ...cfg, venues: cfg.venues.filter(v => v.name !== name) });
  }

  function commitLogo(name) {
    const draft = logoDraft[name];
    if (draft === undefined) return;
    updateVenue(name, { logo: normaliseLogo(draft) });
    setLogoDraft(d => { const n = { ...d }; delete n[name]; return n; });
  }

  function addGroup() {
    const name = newGroup.trim();
    if (!name) return;
    if (cfg.groups.some(g => g.name.toLowerCase() === name.toLowerCase())) { alert('That group already exists'); return; }
    const color = GROUP_COLOR_PALETTE[cfg.groups.length % GROUP_COLOR_PALETTE.length];
    persist({ ...cfg, groups: [...cfg.groups, { name, color }] });
    setNewGroup('');
    // Auto-expand newly created group so you can add venues straight away
    setExpanded(prev => new Set([...prev, name]));
  }

  function recolorGroup(name, color) {
    persist({ ...cfg, groups: cfg.groups.map(g => g.name === name ? { ...g, color } : g) });
  }

  function removeGroup(name) {
    const count = cfg.venues.filter(v => v.group === name).length;
    if (!window.confirm(`Remove group "${name}"?${count ? `\n\n${count} venue${count !== 1 ? 's' : ''} will become ungrouped.` : ''}`)) return;
    persist({
      groups: cfg.groups.filter(g => g.name !== name),
      venues: cfg.venues.map(v => v.group === name ? { ...v, group: null } : v),
    });
    setExpanded(prev => { const next = new Set(prev); next.delete(name); return next; });
  }

  const grouped    = cfg.groups.map(g => ({ ...g, venues: cfg.venues.filter(v => v.group === g.name) }));
  const ungrouped  = cfg.venues.filter(v => !v.group || !cfg.groups.some(g => g.name === v.group));
  const knownLogos = Array.from(new Set([...AVAILABLE_LOGOS, ...cfg.venues.map(v => v.logo).filter(Boolean)]));

  function LogoStrip({ venues, color }) {
    if (venues.length === 0) return null;
    return (
      <div style={{display:'flex',gap:4,alignItems:'center'}}>
        {venues.slice(0, 6).map(v => v.logo ? (
          <img key={v.name} src={v.logo} alt={v.name} title={v.name}
            style={{width:22,height:22,borderRadius:4,objectFit:'cover',background:'#1a1a2e',opacity:0.8}}
            onError={e=>{e.target.style.display='none';}}
          />
        ) : (
          <div key={v.name} title={v.name}
            style={{width:22,height:22,borderRadius:4,background:'#1a1a2e',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:color}} />
          </div>
        ))}
        {venues.length > 6 && <span style={{fontSize:10,color:'#505070'}}>+{venues.length - 6}</span>}
      </div>
    );
  }

  function VenueRow({ v, color }) {
    const isEditing = editing === v.name;
    const logoValue = logoDraft[v.name] !== undefined ? logoDraft[v.name] : (v.logo || '').replace('/logos/', '');
    return (
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderBottom:'1px solid #1a1a2e',flexWrap:'wrap'}}>
        {v.logo ? (
          <img key={v.logo} src={v.logo} alt="" style={{width:34,height:34,borderRadius:7,objectFit:'cover',flexShrink:0,background:'#1a1a2e'}} onError={e=>{e.target.style.opacity='0.2';}} />
        ) : (
          <div style={{width:34,height:34,borderRadius:7,background:'#1a1a2e',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:color}} />
          </div>
        )}
        <div style={{flex:1,minWidth:160}}>
          {isEditing ? (
            <input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') renameVenue(v.name); if (e.key === 'Escape') setEditing(null); }}
              onBlur={() => renameVenue(v.name)}
              style={{...inputStyle, width:'100%'}}
            />
          ) : (
            <div onClick={() => { setEditing(v.name); setEditName(v.name); }} style={{fontSize:13,fontWeight:600,color:'#ffffff',cursor:'text'}} title="Click to rename">
              {v.name}
            </div>
          )}
        </div>
        <select value={v.group || ''} onChange={e => updateVenue(v.name, { group: e.target.value || null })} style={{...inputStyle, fontSize:12, padding:'6px 8px'}}>
          <option value=''>No group</option>
          {cfg.groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
        </select>
        <input
          list="gigboard-logos"
          value={logoValue}
          onChange={e => setLogoDraft(d => ({ ...d, [v.name]: e.target.value }))}
          onBlur={() => commitLogo(v.name)}
          onKeyDown={e => e.key === 'Enter' && e.target.blur()}
          placeholder="logo filename"
          style={{...inputStyle, fontSize:12, padding:'6px 8px', width:150}}
        />
        <button onClick={() => removeVenue(v.name)} style={{background:'transparent',border:'1px solid #2a2a40',color:'#ff4070',borderRadius:5,padding:'5px 10px',fontSize:11,cursor:'pointer'}}>Remove</button>
      </div>
    );
  }

  return (
    <div className="page-body">

      <datalist id="gigboard-logos">
        {knownLogos.map(l => <option key={l} value={l.replace('/logos/','')} />)}
      </datalist>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:'#ffffff'}}>Venues</div>
          <div style={{fontSize:12,color:'#8080a0',marginTop:2}}>Click a name to rename it. Changes save instantly and apply everywhere in the app.</div>
        </div>
        <div style={{fontSize:12,color: saving ? '#8080a0' : '#00ffc2',minWidth:70,textAlign:'right'}}>{saving ? 'Saving…' : saved ? '✓ Saved' : ''}</div>
      </div>

      <div style={{background:'#0d0d18',border:'1px solid #1e1e30',borderRadius:10,padding:16,marginBottom:20}}>
        <span style={label}>Add a venue</span>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input
            value={newVenue}
            onChange={e => setNewVenue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addVenue()}
            placeholder="e.g. Arthur's Bar"
            style={{...inputStyle, flex:1, minWidth:180}}
          />
          <select value={newVenueGroup} onChange={e => setNewVenueGroup(e.target.value)} style={inputStyle}>
            <option value=''>No group</option>
            {cfg.groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={addVenue} disabled={!newVenue.trim() || saving}>+ Add</button>
        </div>
      </div>

      {/* Grouped venues — all collapsed by default, click header to expand */}
      {grouped.map(g => {
        const isOpen = expanded.has(g.name);
        return (
          <div key={g.name} style={{background:'#0d0d18',border:'1px solid #1e1e30',borderRadius:10,overflow:'hidden',marginBottom:14}}>
            {/* Clickable header */}
            <div
              onClick={() => toggleExpanded(g.name)}
              style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:'#131320',cursor:'pointer',userSelect:'none'}}
            >
              <div style={{width:10,height:10,borderRadius:'50%',background:g.color,flexShrink:0}} />
              <div style={{flex:1,fontSize:13,fontWeight:700,color:'#ffffff'}}>
                {g.name} <span style={{color:'#8080a0',fontWeight:400}}>({g.venues.length})</span>
              </div>
              {/* Logo strip — only when collapsed so it doesn't duplicate the rows */}
              {!isOpen && <LogoStrip venues={g.venues} color={g.color} />}
              <div style={{fontSize:11,color:'#505070',marginLeft:4,flexShrink:0}}>{isOpen ? '▲' : '▼'}</div>
            </div>

            {isOpen && (
              <>
                {/* Colour picker + remove — visible only when expanded */}
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'9px 14px',background:'#0f0f1e',borderBottom:'1px solid #1a1a2e',flexWrap:'wrap'}}>
                  <span style={{fontSize:10,color:'#505070',textTransform:'uppercase',letterSpacing:'0.07em',fontWeight:700}}>Colour</span>
                  <div style={{display:'flex',gap:4}}>
                    {GROUP_COLOR_PALETTE.map(c => (
                      <div key={c} onClick={() => recolorGroup(g.name, c)} title={c}
                        style={{width:16,height:16,borderRadius:'50%',background:c,cursor:'pointer',border: g.color === c ? '2px solid #fff' : '2px solid transparent'}} />
                    ))}
                  </div>
                  <div style={{marginLeft:'auto'}}>
                    <button
                      onClick={e => { e.stopPropagation(); removeGroup(g.name); }}
                      style={{background:'transparent',border:'1px solid #2a2a40',color:'#8080a0',borderRadius:5,padding:'4px 9px',fontSize:11,cursor:'pointer'}}
                    >
                      Remove group
                    </button>
                  </div>
                </div>
                {g.venues.length === 0 && <div style={{padding:'12px 14px',fontSize:12,color:'#505070'}}>No venues in this group yet.</div>}
                {g.venues.map(v => <VenueRow key={v.name} v={v} color={g.color} />)}
              </>
            )}
          </div>
        );
      })}

      {/* Individual venues — also collapsible */}
      <div style={{background:'#0d0d18',border:'1px solid #1e1e30',borderRadius:10,overflow:'hidden',marginBottom:20}}>
        <div
          onClick={() => toggleExpanded('__ungrouped__')}
          style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:'#131320',cursor:'pointer',userSelect:'none'}}
        >
          <div style={{flex:1,fontSize:13,fontWeight:700,color:'#ffffff'}}>
            Individual venues <span style={{color:'#8080a0',fontWeight:400}}>({ungrouped.length})</span>
          </div>
          {!expanded.has('__ungrouped__') && <LogoStrip venues={ungrouped} color="#00d4aa" />}
          <div style={{fontSize:11,color:'#505070',marginLeft:4,flexShrink:0}}>{expanded.has('__ungrouped__') ? '▲' : '▼'}</div>
        </div>
        {expanded.has('__ungrouped__') && (
          <>
            {ungrouped.length === 0 && <div style={{padding:'12px 14px',fontSize:12,color:'#505070'}}>None.</div>}
            {ungrouped.map(v => <VenueRow key={v.name} v={v} color="#00d4aa" />)}
          </>
        )}
      </div>

      <div style={{background:'#0d0d18',border:'1px solid #1e1e30',borderRadius:10,padding:16}}>
        <span style={label}>Add a group</span>
        <div style={{fontSize:12,color:'#8080a0',marginBottom:10}}>Groups bundle rooms under one owner, e.g. "Clancys Group". Venue admins can be scoped to a group.</div>
        <div style={{display:'flex',gap:8}}>
          <input
            value={newGroup}
            onChange={e => setNewGroup(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addGroup()}
            placeholder="e.g. Rearden's Group"
            style={{...inputStyle, flex:1}}
          />
          <button className="btn btn-primary" onClick={addGroup} disabled={!newGroup.trim() || saving}>+ Add group</button>
        </div>
      </div>

      <div style={{fontSize:11,color:'#505070',marginTop:16,lineHeight:1.6}}>
        <strong style={{color:'#8080a0'}}>Logos:</strong> upload the image to <code>public/logos/</code> on GitHub, then type its filename in the logo box above (e.g. <code>clubmovida.png</code>). Filenames are case-sensitive — match exactly what's on GitHub.
      </div>
    </div>
  );
}
