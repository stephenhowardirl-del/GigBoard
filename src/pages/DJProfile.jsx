import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function DJProfile({ onClose }) {
  const { user, profile } = useAuth();
  const [form, setForm] = useState({
    name:    '',
    email:   '',
    phone:   '',
    address: '',
    vat:     '',
    iban:    '',
  });
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const ref  = doc(db, 'djProfiles', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setForm(f => ({ ...f, ...snap.data() }));
      } else {
        setForm(f => ({
          ...f,
          name:  profile.name || '',
          email: user.email   || '',
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

  if (loading) return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{color:'var(--text-muted)',textAlign:'center',padding:40}}>Loading...</div>
      </div>
    </div>
  );

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24}}>
          <div>
            <div style={{fontSize:18, fontWeight:600, color:'#e8e8f0'}}>My Profile</div>
            <div style={{fontSize:12, color:'var(--text-muted)', marginTop:2}}>This info will be used for invoice generation</div>
          </div>
          <button onClick={onClose} style={{background:'transparent', border:'none', color:'#404060', fontSize:20, cursor:'pointer', lineHeight:1}}>✕</button>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          {[
            { label: 'Name',    field: 'name',    placeholder: 'Your full name' },
            { label: 'Email',   field: 'email',   placeholder: 'Your email address' },
            { label: 'Phone',   field: 'phone',   placeholder: 'Your phone number' },
            { label: 'Address', field: 'address', placeholder: 'Your address', multiline: true },
            { label: 'VAT No',  field: 'vat',     placeholder: 'VAT number (if applicable)' },
            { label: 'IBAN',    field: 'iban',     placeholder: 'Your IBAN' },
          ].map(({ label, field, placeholder, multiline }) => (
            <div key={field}>
              <div style={{fontSize:12, color:'var(--text-muted)', marginBottom:5, fontWeight:500}}>{label}</div>
              {multiline ? (
                <textarea
                  value={form[field]}
                  onChange={e => handleChange(field, e.target.value)}
                  placeholder={placeholder}
                  rows={3}
                  style={inputStyle}
                />
              ) : (
                <input
                  type="text"
                  value={form[field]}
                  onChange={e => handleChange(field, e.target.value)}
                  placeholder={placeholder}
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            marginTop: 24,
            width: '100%',
            padding: '12px',
            background: saved ? '#00c896' : '#00ffc2',
            color: '#0a0a0f',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Profile'}
        </button>

      </div>
    </div>
  );
}

const overlayStyle = {
  position:       'fixed',
  inset:          0,
  background:     '#00000080',
  zIndex:         300,
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  padding:        20,
};

const modalStyle = {
  background:   '#0d0d14',
  border:       '1px solid #2a2a40',
  borderRadius: 12,
  padding:      28,
  width:        '100%',
  maxWidth:     480,
  maxHeight:    '90vh',
  overflowY:    'auto',
};

const inputStyle = {
  width:        '100%',
  padding:      '9px 12px',
  background:   '#0a0a0f',
  border:       '1px solid #2a2a40',
  borderRadius: 6,
  color:        '#e8e8f0',
  fontSize:     13,
  outline:      'none',
  boxSizing:    'border-box',
  fontFamily:   'inherit',
  resize:       'vertical',
};
