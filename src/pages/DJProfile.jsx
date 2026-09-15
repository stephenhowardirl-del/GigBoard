import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
}

export default function DJProfile({ onClose }) {
  const { user, profile } = useAuth();
  const [form, setForm] = useState({
    name:           '',
    tradingName:    '',
    email:          '',
    phone:          '',
    address:        '',
    vat:            '',
    iban:           '',
    serviceDesc:    '',
    paymentTerms:   '14',
    invoiceMode:    'sequential',
    invoicePrefix:  'INV',
    invoiceCounter: 1,
    calendarToken:  '',
  });
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [loading, setLoading]   = useState(true);
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    async function load() {
      const ref  = doc(db, 'djProfiles', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        if (!data.calendarToken) {
          // Generate AND persist immediately — the URL shown below must work
          // even if the DJ never presses Save Profile.
          data.calendarToken = generateToken();
          await setDoc(ref, { calendarToken: data.calendarToken, uid: user.uid }, { merge: true });
        }
        setForm(f => ({ ...f, ...data }));
      } else {
        // Brand-new profile: create the doc shell right away so the
        // calendar URL is live from the first time it's displayed.
        const token = generateToken();
        const shell = { uid: user.uid, name: profile.name || '', email: user.email || '', calendarToken: token };
        await setDoc(ref, shell, { merge: true });
        setForm(f => ({ ...f, ...shell }));
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    const ref = doc(db, 'djProfiles', user.uid);
    await setDoc(ref, { ...form, uid: user.uid });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleChange(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function regenerateToken() {
    if (!window.confirm('This will break any existing calendar subscriptions. Continue?')) return;
    const token = generateToken();
    handleChange('calendarToken', token);
    // Persist immediately — the new URL must work the moment it's shown.
    const ref = doc(db, 'djProfiles', user.uid);
    await setDoc(ref, { calendarToken: token, uid: user.uid }, { merge: true });
  }

  function copyUrl() {
    navigator.clipboard.writeText(calendarUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const calendarUrl = `https://gig-board.vercel.app/api/calendar/${form.calendarToken}`;

  if (loading) return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{color:'var(--text-secondary)',textAlign:'center',padding:40}}>Loading...</div>
      </div>
    </div>
  );

  const sectionTitle = (title) => (
    <div style={{fontSize:11,fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.08em',marginTop:8,marginBottom:4,paddingBottom:6,borderBottom:'1px solid var(--border)'}}>
      {title}
    </div>
  );

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24}}>
          <div>
            <div style={{fontSize:18, fontWeight:600, color:'var(--text-primary)'}}>My Profile</div>
            <div style={{fontSize:12, color:'var(--text-secondary)', marginTop:2}}>Used for invoice generation</div>
          </div>
          <button onClick={onClose} style={{background:'transparent', border:'none', color:'var(--text-muted)', fontSize:20, cursor:'pointer', lineHeight:1}}>✕</button>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:14}}>

          {sectionTitle('Personal details')}

          {[
            { label:'Name',                   field:'name',        placeholder:'Your full name' },
            { label:'Trading / Company name', field:'tradingName', placeholder:'Leave blank to use your name' },
            { label:'Email',                  field:'email',       placeholder:'Your email address' },
            { label:'Phone',                  field:'phone',       placeholder:'Your phone number' },
            { label:'Address',                field:'address',     placeholder:'Your address', multiline:true },
            { label:'VAT No',                 field:'vat',         placeholder:'VAT number (if applicable)' },
            { label:'IBAN',                   field:'iban',        placeholder:'Your IBAN' },
          ].map(({ label, field, placeholder, multiline }) => (
            <div key={field}>
              <div style={{fontSize:12, color:'var(--text-secondary)', marginBottom:5, fontWeight:500}}>{label}</div>
              {multiline ? (
                <textarea value={form[field]} onChange={e => handleChange(field, e.target.value)} placeholder={placeholder} rows={3} style={inputStyle} />
              ) : (
                <input type="text" value={form[field]} onChange={e => handleChange(field, e.target.value)} placeholder={placeholder} style={inputStyle} />
              )}
            </div>
          ))}

          {sectionTitle('Invoice settings')}

          <div>
            <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:5,fontWeight:500}}>Service description</div>
            <input type="text" value={form.serviceDesc} onChange={e => handleChange('serviceDesc', e.target.value)} placeholder="e.g. DJ Services, Live DJ Performance" style={inputStyle} />
            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>Appears on invoice line items.</div>
          </div>

          <div>
            <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:5,fontWeight:500}}>Payment terms (days)</div>
            <input type="number" value={form.paymentTerms} onChange={e => handleChange('paymentTerms', e.target.value)} placeholder="14" min="0" style={{...inputStyle, width:100}} />
          </div>

          <div>
            <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:8,fontWeight:500}}>Invoice numbering</div>
            <div style={{display:'flex', gap:8}}>
              {[
                { key:'sequential', label:'Sequential',  desc:'INV-001, INV-002…' },
                { key:'per-client', label:'Per client',  desc:'JJW-001, SEV-001…' },
              ].map(opt => (
                <div key={opt.key} onClick={() => handleChange('invoiceMode', opt.key)} style={{flex:1,padding:'10px 12px',borderRadius:8,cursor:'pointer',border:`1px solid ${form.invoiceMode===opt.key?'var(--neon-border)':'var(--border-mid)'}`,background:form.invoiceMode===opt.key?'var(--neon-bg)':'var(--bg-base)'}}>
                  <div style={{fontSize:12,fontWeight:600,color:form.invoiceMode===opt.key?'var(--neon)':'var(--text-primary)',marginBottom:3}}>{opt.label}</div>
                  <div style={{fontSize:11,color:'var(--text-secondary)'}}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:5,fontWeight:500}}>Invoice prefix</div>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <input type="text" value={form.invoicePrefix} onChange={e => handleChange('invoicePrefix', e.target.value.toUpperCase().slice(0,6))} placeholder="INV" style={{...inputStyle, width:100}} />
              <span style={{fontSize:12,color:'var(--text-muted)'}}>→ {form.invoicePrefix||'INV'}-{String(form.invoiceCounter||1).padStart(3,'0')}</span>
            </div>
          </div>

          {form.invoiceMode === 'sequential' && (
            <div>
              <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:5,fontWeight:500}}>Next invoice number</div>
              <input type="number" value={form.invoiceCounter} onChange={e => handleChange('invoiceCounter', parseInt(e.target.value)||1)} min="1" style={{...inputStyle, width:100}} />
            </div>
          )}

          {sectionTitle('Calendar sync')}

          <div style={{background:'var(--neon-bg)',border:'1px solid var(--neon-border)',borderRadius:8,padding:14}}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)',marginBottom:6}}>Subscribe to your gig calendar</div>
            <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:12}}>
              Add this URL to Google Calendar or Apple Calendar to keep your confirmed gigs automatically in sync.
            </div>

            <div style={{background:'var(--bg-base)',border:'1px solid var(--border-mid)',borderRadius:6,padding:'8px 10px',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
              <div style={{flex:1,fontSize:11,color:'var(--text-secondary)',fontFamily:'monospace',wordBreak:'break-all'}}>{calendarUrl}</div>
              <button
                onClick={copyUrl}
                style={{background: copied ? 'var(--neon-bg)' : 'var(--bg-hover)',border:`1px solid ${copied?'var(--neon-border)':'var(--border-mid)'}`,color:copied?'var(--neon)':'var(--text-secondary)',borderRadius:5,padding:'4px 10px',fontSize:11,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}
              >
                {copied ? '✓ Copied' : 'Copy URL'}
              </button>
            </div>

            <div style={{fontSize:11,color:'var(--text-secondary)',marginBottom:8,fontWeight:600}}>How to add:</div>
            <div style={{fontSize:11,color:'var(--text-secondary)',lineHeight:1.7}}>
              <div><span style={{color:'var(--text-primary)'}}>Google Calendar:</span> Other calendars → + → From URL → paste → Add calendar</div>
              <div style={{marginTop:4}}><span style={{color:'var(--text-primary)'}}>Apple Calendar:</span> File → New Calendar Subscription → paste URL → Subscribe</div>
              <div style={{marginTop:4}}><span style={{color:'var(--text-primary)'}}>iPhone:</span> if iOS warns about an insecure connection, tap Continue — the feed is HTTPS, it's a known iOS quirk.</div>
            </div>

            <button
              onClick={regenerateToken}
              style={{marginTop:12,background:'transparent',border:'1px solid var(--border-mid)',color:'var(--text-muted)',borderRadius:5,padding:'4px 12px',fontSize:11,cursor:'pointer'}}
            >
              🔄 Regenerate URL
            </button>
          </div>

        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{marginTop:24,width:'100%',padding:'12px',background:saved?'var(--ok)':'var(--neon)',color:'var(--on-neon)',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:saving?'not-allowed':'pointer',transition:'background 0.2s'}}
        >
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Profile'}
        </button>

      </div>
    </div>
  );
}

const overlayStyle = { position:'fixed', inset:0, background:'#00000080', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 };
const modalStyle   = { background:'var(--bg-surface)', border:'1px solid var(--border-mid)', borderRadius:12, padding:28, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' };
const inputStyle   = { width:'100%', padding:'9px 12px', background:'var(--bg-base)', border:'1px solid var(--border-mid)', borderRadius:6, color:'var(--text-primary)', fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit', resize:'vertical' };
