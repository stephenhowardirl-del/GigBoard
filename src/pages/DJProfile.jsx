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
        // Generate token if doesn't exist
        if (!data.calendarToken) data.calendarToken = generateToken();
        setForm(f => ({ ...f, ...data }));
      } else {
        setForm(f => ({
          ...f,
          name:          profile.name || '',
          email:         user.email   || '',
          calendarToken: generateToken(),
        }));
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
    handleChange('calendarToken', generateToken());
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
        <div style={{color:'#8080a0',textAlign:'center',padding:40}}>Loading...</div>
      </div>
    </div>
  );

  const sectionTitle = (title) => (
    <div style={{fontSize:11,fontWeight:700,color:'#8080a0',textTransform:'uppercase',letterSpacing:'0.08em',marginTop:8,marginBottom:4,paddingBottom:6,borderBottom:'1px solid #1e1e2e'}}>
      {title}
    </div>
  );

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24}}>
          <div>
            <div style={{fontSize:18, fontWeight:600, color:'#e8e8f0'}}>My Profile</div>
            <div style={{fontSize:12, color:'#8080a0', marginTop:2}}>Used for invoice generation</div>
          </div>
          <button onClick={onClose} style={{background:'transparent', border:'none', color:'#404060', fontSize:20, cursor:'pointer', lineHeight:1}}>✕</button>
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
              <div style={{fontSize:12, color:'#8080a0', marginBottom:5, fontWeight:500}}>{label}</div>
              {multiline ? (
                <textarea value={form[field]} onChange={e => handleChange(field, e.target.value)} placeholder={placeholder} rows={3} style={inputStyle} />
              ) : (
                <input type="text" value={form[field]} onChange={e => handleChange(field, e.target.value)} placeholder={placeholder} style={inputStyle} />
              )}
            </div>
          ))}

          {sectionTitle('Invoice settings')}

          <div>
            <div style={{fontSize:12,color:'#8080a0',marginBottom:5,fontWeight:500}}>Service description</div>
            <input type="text" value={form.serviceDesc} onChange={e => handleChange('serviceDesc', e.target.value)} placeholder="e.g. DJ Services, Live DJ Performance" style={inputStyle} />
            <div style={{fontSize:11,color:'#505070',marginTop:4}}>Appears on invoice line items.</div>
          </div>

          <div>
            <div style={{fontSize:12,color:'#8080a0',marginBottom:5,fontWeight:500}}>Payment terms (days)</div>
            <input type="number" value={form.paymentTerms} onChange={e => handleChange('paymentTerms', e.target.value)} placeholder="14" min="0" style={{...inputStyle, width:100}} />
          </div>

          <div>
            <div style={{fontSize:12,color:'#8080a0',marginBottom:8,fontWeight:500}}>Invoice numbering</div>
            <div style={{display:'flex', gap:8}}>
              {[
                { key:'sequential', label:'Sequential',  desc:'INV-001, INV-002…' },
                { key:'per-client', label:'Per client',  desc:'JJW-001, SEV-001…' },
              ].map(opt => (
                <div key={opt.key} onClick={() => handleChange('invoiceMode', opt.key)} style={{flex:1,padding:'10px 12px',borderRadius:8,cursor:'pointer',border:`1px solid ${form.invoiceMode===opt.key?'#00ffc250':'#2a2a40'}`,background:form.invoiceMode===opt.key?'#00ffc210':'#0a0a0f'}}>
                  <div style={{fontSize:12,fontWeight:600,color:form.invoiceMode===opt.key?'#00ffc2':'#e8e8f0',marginBottom:3}}>{opt.label}</div>
                  <div style={{fontSize:11,color:'#8080a0'}}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{fontSize:12,color:'#8080a0',marginBottom:5,fontWeight:500}}>Invoice prefix</div>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <input type="text" value={form.invoicePrefix} onChange={e => handleChange('invoicePrefix', e.target.value.toUpperCase().slice(0,6))} placeholder="INV" style={{...inputStyle, width:100}} />
              <span style={{fontSize:12,color:'#505070'}}>→ {form.invoicePrefix||'INV'}-{String(form.invoiceCounter||1).padStart(3,'0')}</span>
            </div>
          </div>

          {form.invoiceMode === 'sequential' && (
            <div>
              <div style={{fontSize:12,color:'#8080a0',marginBottom:5,fontWeight:500}}>Next invoice number</div>
              <input type="number" value={form.invoiceCounter} onChange={e => handleChange('invoiceCounter', parseInt(e.target.value)||1)} min="1" style={{...inputStyle, width:100}} />
            </div>
          )}

          {sectionTitle('Calendar sync')}

          <div style={{background:'#0a1a10',border:'1px solid #00ffc230',borderRadius:8,padding:14}}>
            <div style={{fontSize:13,fontWeight:600,color:'#ffffff',marginBottom:6}}>Subscribe to your gig calendar</div>
            <div style={{fontSize:12,color:'#8080a0',marginBottom:12}}>
              Add this URL to Google Calendar or Apple Calendar to keep your confirmed gigs automatically in sync.
            </div>

            <div style={{background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,padding:'8px 10px',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
              <div style={{flex:1,fontSize:11,color:'#6060a0',fontFamily:'monospace',wordBreak:'break-all'}}>{calendarUrl}</div>
              <button
                onClick={copyUrl}
                style={{background: copied ? '#00ffc220' : '#1a1a2e',border:`1px solid ${copied?'#00ffc250':'#2a2a40'}`,color:copied?'#00ffc2':'#8080a0',borderRadius:5,padding:'4px 10px',fontSize:11,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}
              >
                {copied ? '✓ Copied' : 'Copy URL'}
              </button>
            </div>

            <div style={{fontSize:11,color:'#8080a0',marginBottom:8,fontWeight:600}}>How to add:</div>
            <div style={{fontSize:11,color:'#8080a0',lineHeight:1.7}}>
              <div><span style={{color:'#ffffff'}}>Google Calendar:</span> Other calendars → + → From URL → paste → Add calendar</div>
              <div style={{marginTop:4}}><span style={{color:'#ffffff'}}>Apple Calendar:</span> File → New Calendar Subscription → paste URL → Subscribe</div>
            </div>

            <button
              onClick={regenerateToken}
              style={{marginTop:12,background:'transparent',border:'1px solid #2a2a40',color:'#505070',borderRadius:5,padding:'4px 12px',fontSize:11,cursor:'pointer'}}
            >
              🔄 Regenerate URL
            </button>
          </div>

        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{marginTop:24,width:'100%',padding:'12px',background:saved?'#00c896':'#00ffc2',color:'#0a0a0f',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:saving?'not-allowed':'pointer',transition:'background 0.2s'}}
        >
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Profile'}
        </button>

      </div>
    </div>
  );
}

const overlayStyle = { position:'fixed', inset:0, background:'#00000080', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 };
const modalStyle   = { background:'#0d0d14', border:'1px solid #2a2a40', borderRadius:12, padding:28, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' };
const inputStyle   = { width:'100%', padding:'9px 12px', background:'#0a0a0f', border:'1px solid #2a2a40', borderRadius:6, color:'#e8e8f0', fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit', resize:'vertical' };
