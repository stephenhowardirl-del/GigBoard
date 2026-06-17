import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { jsPDF } from 'jspdf';
import { getAllGigs } from '../lib/db';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-IE', { day:'numeric', month:'long', year:'numeric' });
}

function formatDateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-IE', { day:'numeric', month:'short', year:'numeric' });
}

function addDays(iso, days) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-IE', { day:'numeric', month:'long', year:'numeric' });
}

function venuePrefix(venue) {
  return venue
    .replace(/[^a-zA-Z\s]/g, '')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);
}

export default function InvoiceModal({ gig, userUid, allGigs = [], onClose }) {
  const [djProfile, setDjProfile]     = useState(null);
  const [loading, setLoading]         = useState(true);
  const [invoiceNum, setInvoiceNum]   = useState('');
  const [relatedGigs, setRelatedGigs] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set([gig.id]));
  const [fees, setFees]               = useState({ [gig.id]: String(gig.fee || '') });

  useEffect(() => {
    async function load() {
      const ref  = doc(db, 'djProfiles', userUid);
      const snap = await getDoc(ref);
      let profile = null;
      if (snap.exists()) {
        profile = snap.data();
        setDjProfile(profile);
      }

      // Generate invoice number based on profile settings
      if (profile) {
        const mode    = profile.invoiceMode || 'sequential';
        const prefix  = profile.invoicePrefix || 'INV';
        const counter = profile.invoiceCounter || 1;
        if (mode === 'sequential') {
          setInvoiceNum(`${prefix}-${String(counter).padStart(3,'0')}`);
        } else {
          // per-client: use venue prefix + counter
          const vPrefix  = venuePrefix(gig.venue);
          const vCounter = profile[`counter_${vPrefix}`] || 1;
          setInvoiceNum(`${vPrefix}-${String(vCounter).padStart(3,'0')}`);
        }
      } else {
        setInvoiceNum(`INV-${new Date().getFullYear()}-${Math.floor(Math.random()*900)+100}`);
      }

      // Find related confirmed gigs with a fee
      const all     = allGigs.length > 0 ? allGigs : await getAllGigs();
      const related = all.filter(g =>
        g.id !== gig.id &&
        g.djUid === gig.djUid &&
        g.status === 'confirmed' &&
        g.fee
      ).sort((a, b) => a.date.localeCompare(b.date));

      setRelatedGigs(related);
      const initFees = { [gig.id]: String(gig.fee || '') };
      related.forEach(g => { initFees[g.id] = String(g.fee || ''); });
      setFees(initFees);
      setLoading(false);
    }
    load();
  }, []);

  function toggleGig(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (id === gig.id) return next;
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = [gig, ...relatedGigs].filter(g => selectedIds.has(g.id));
  const hasVat      = djProfile?.vat && djProfile.vat.trim() !== '';
  const subtotal    = allSelected.reduce((sum, g) => sum + (parseFloat(fees[g.id]) || 0), 0);
  const vatAmt      = hasVat ? subtotal * 0.23 : 0;
  const total       = subtotal + vatAmt;
  const tradingName = djProfile?.tradingName?.trim() || djProfile?.name || gig.djName;
  const serviceDesc = djProfile?.serviceDesc?.trim() || 'DJ Services';
  const payTerms    = parseInt(djProfile?.paymentTerms) || 14;

  async function incrementCounter() {
    if (!djProfile) return;
    const ref    = doc(db, 'djProfiles', userUid);
    const mode   = djProfile.invoiceMode || 'sequential';
    if (mode === 'sequential') {
      const next = (djProfile.invoiceCounter || 1) + 1;
      await setDoc(ref, { ...djProfile, invoiceCounter: next }, { merge: true });
    } else {
      const vPrefix = venuePrefix(gig.venue);
      const key     = `counter_${vPrefix}`;
      const next    = (djProfile[key] || 1) + 1;
      await setDoc(ref, { ...djProfile, [key]: next }, { merge: true });
    }
  }

  function generatePDF() {
    const pdf   = new jsPDF({ unit:'mm', format:'a4' });
    const pageW = 210;
    const margin = 20;
    const col2   = 120;
    let y        = 20;

    // Header bar
    pdf.setFillColor(10, 10, 15);
    pdf.rect(0, 0, pageW, 35, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INVOICE', pageW - margin, 20, { align:'right' });
    pdf.setTextColor(150, 150, 180);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(invoiceNum, pageW - margin, 28, { align:'right' });

    y = 50;

    // From / To
    pdf.setTextColor(100, 100, 150);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FROM', margin, y);
    pdf.text('TO', col2, y);
    y += 6;

    pdf.setTextColor(30, 30, 40);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(tradingName, margin, y);
    pdf.text(gig.venue, col2, y);
    y += 6;

    pdf.setTextColor(80, 80, 100);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    if (djProfile?.address) {
      djProfile.address.split('\n').forEach(line => { pdf.text(line.trim(), margin, y); y += 5; });
    }
    if (djProfile?.email) { pdf.text(djProfile.email, margin, y); y += 5; }
    if (djProfile?.phone) { pdf.text(djProfile.phone, margin, y); y += 5; }
    if (djProfile?.vat)   { pdf.text(`VAT: ${djProfile.vat}`, margin, y); y += 5; }

    y = Math.max(y + 10, 110);

    // Invoice meta
    pdf.setFillColor(245, 245, 252);
    pdf.roundedRect(margin, y - 6, pageW - margin * 2, 22, 2, 2, 'F');
    pdf.setTextColor(80, 80, 100);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ISSUE DATE', margin + 4, y + 1);
    pdf.text('DUE DATE',   margin + 55, y + 1);
    pdf.text('INVOICE NO', margin + 110, y + 1);
    pdf.setTextColor(30, 30, 40);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const today = new Date().toISOString().split('T')[0];
    pdf.text(formatDate(today),       margin + 4,   y + 8);
    pdf.text(addDays(today, payTerms), margin + 55,  y + 8);
    pdf.text(invoiceNum,              margin + 110,  y + 8);

    y += 30;

    // Line items header
    pdf.setFillColor(10, 10, 15);
    pdf.rect(margin, y, pageW - margin * 2, 8, 'F');
    pdf.setTextColor(200, 200, 220);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DESCRIPTION', margin + 4, y + 5.5);
    pdf.text('AMOUNT', pageW - margin - 4, y + 5.5, { align:'right' });
    y += 12;

    // Line items
    allSelected.forEach((g, i) => {
      const gigFee = parseFloat(fees[g.id]) || 0;
      pdf.setTextColor(30, 30, 40);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(serviceDesc, margin + 4, y);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(80, 80, 100);
      pdf.text(`${g.venue} · ${formatDateShort(g.date)} · ${g.time}`, margin + 4, y + 6);
      pdf.setTextColor(30, 30, 40);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`€${gigFee.toFixed(2)}`, pageW - margin - 4, y, { align:'right' });
      y += 16;
      if (i < allSelected.length - 1) {
        pdf.setDrawColor(235, 235, 245);
        pdf.line(margin + 4, y, pageW - margin - 4, y);
        y += 6;
      }
    });

    y += 8;

    // Divider
    pdf.setDrawColor(220, 220, 235);
    pdf.line(margin, y, pageW - margin, y);
    y += 8;

    // Totals
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 100);
    pdf.text('Subtotal', pageW - margin - 50, y);
    pdf.setTextColor(30, 30, 40);
    pdf.text(`€${subtotal.toFixed(2)}`, pageW - margin - 4, y, { align:'right' });
    y += 7;

    if (hasVat) {
      pdf.setTextColor(80, 80, 100);
      pdf.text('VAT (23%)', pageW - margin - 50, y);
      pdf.setTextColor(30, 30, 40);
      pdf.text(`€${vatAmt.toFixed(2)}`, pageW - margin - 4, y, { align:'right' });
      y += 7;
    }

    pdf.setDrawColor(220, 220, 235);
    pdf.line(pageW - margin - 60, y, pageW - margin, y);
    y += 6;

    pdf.setFillColor(10, 10, 15);
    pdf.roundedRect(pageW - margin - 62, y - 5, 62, 12, 2, 2, 'F');
    pdf.setTextColor(200, 200, 220);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL', pageW - margin - 50, y + 3.5);
    pdf.text(`€${total.toFixed(2)}`, pageW - margin - 4, y + 3.5, { align:'right' });

    y += 24;

    // Payment details
    if (djProfile?.iban) {
      pdf.setFillColor(245, 245, 252);
      pdf.roundedRect(margin, y, pageW - margin * 2, 22, 2, 2, 'F');
      pdf.setTextColor(100, 100, 150);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PAYMENT DETAILS', margin + 4, y + 6);
      pdf.setTextColor(30, 30, 40);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`IBAN: ${djProfile.iban}`, margin + 4, y + 13);
      if (tradingName) pdf.text(`Account name: ${tradingName}`, margin + 4, y + 19);
    }

    pdf.save(`${invoiceNum}-${gig.venue.replace(/\s+/g, '-')}.pdf`);
    incrementCounter();
  }

  // Group related gigs by venue for display
  const gigsByVenue = relatedGigs.reduce((acc, g) => {
    if (!acc[g.venue]) acc[g.venue] = [];
    acc[g.venue].push(g);
    return acc;
  }, {});

  return (
    <div style={{position:'fixed',inset:0,background:'#00000080',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#0d0d14',border:'1px solid #2a2a40',borderRadius:12,padding:28,width:'100%',maxWidth:500,maxHeight:'90vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div>
            <div style={{fontSize:17,fontWeight:600,color:'#e8e8f0'}}>Create Invoice</div>
            <div style={{fontSize:12,color:'#8080a0',marginTop:2}}>{invoiceNum}</div>
          </div>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:'#404060',fontSize:20,cursor:'pointer'}}>✕</button>
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:20,color:'#8080a0'}}>Loading...</div>
        ) : !djProfile ? (
          <div style={{textAlign:'center',padding:20,color:'#ff6090',fontSize:13}}>
            Please fill in your profile before generating an invoice.
          </div>
        ) : (
          <>
            {/* Primary gig — always included */}
            <div style={{fontSize:11,color:'#8080a0',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>Primary gig</div>
            <div style={{background:'#002a1a',border:'1px solid #00ffcc40',borderRadius:8,padding:'10px 12px',marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:600,color:'#e8e8f0'}}>{gig.venue}</div>
              <div style={{fontSize:11,color:'#8080a0',marginTop:2}}>{formatDateShort(gig.date)} · {gig.time}</div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}>
                <span style={{fontSize:11,color:'#8080a0'}}>Fee: €</span>
                <input
                  type="number"
                  value={fees[gig.id] || ''}
                  onChange={e => setFees(f => ({ ...f, [gig.id]: e.target.value }))}
                  style={{width:80,background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:5,color:'#00ffc2',fontSize:13,padding:'4px 8px',fontWeight:700}}
                />
              </div>
            </div>

            {/* Additional gigs — grouped by venue */}
            {relatedGigs.length > 0 && (
              <>
                <div style={{fontSize:11,color:'#8080a0',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>Add more gigs to this invoice</div>
                {Object.entries(gigsByVenue).map(([venue, venueGigs]) => (
                  <div key={venue} style={{marginBottom:12}}>
                    <div style={{fontSize:11,color:'#6060a0',marginBottom:6,fontWeight:600}}>{venue}</div>
                    {venueGigs.map(g => {
                      const isSelected = selectedIds.has(g.id);
                      return (
                        <div
                          key={g.id}
                          onClick={() => toggleGig(g.id)}
                          style={{
                            background: isSelected ? '#001a10' : '#0f0f1a',
                            border: `1px solid ${isSelected ? '#00ffcc30' : '#1e1e2e'}`,
                            borderRadius: 7, padding:'9px 12px', marginBottom:6,
                            cursor:'pointer', display:'flex', alignItems:'center', gap:10,
                          }}
                        >
                          <div style={{width:14,height:14,borderRadius:3,border:`1px solid ${isSelected?'#00ffcc':'#2a2a40'}`,background:isSelected?'#00ffcc':'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                            {isSelected && <div style={{width:8,height:8,background:'#0a0a0f',borderRadius:1}} />}
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,color:'#e8e8f0'}}>{formatDateShort(g.date)} · {g.time}</div>
                          </div>
                          <input
                            type="number"
                            value={fees[g.id] || ''}
                            onChange={e => { e.stopPropagation(); setFees(f => ({ ...f, [g.id]: e.target.value })); }}
                            onClick={e => e.stopPropagation()}
                            placeholder="Fee"
                            style={{width:70,background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:5,color:'#e8e8f0',fontSize:12,padding:'4px 8px',textAlign:'right'}}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </>
            )}

            {/* Totals */}
            <div style={{marginTop:16,padding:'12px',background:'#13131f',border:'1px solid #1e1e2e',borderRadius:8,fontSize:12}}>
              {hasVat && (
                <>
                  <div style={{display:'flex',justifyContent:'space-between',color:'#9090b0',marginBottom:4}}>
                    <span>Subtotal</span><span>€{subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',color:'#9090b0',marginBottom:8}}>
                    <span>VAT 23%</span><span>€{vatAmt.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div style={{display:'flex',justifyContent:'space-between',color:'#00ffc2',fontWeight:600,fontSize:14}}>
                <span>Total</span><span>€{total.toFixed(2)}</span>
              </div>
              <div style={{fontSize:11,color:'#505070',marginTop:8}}>
                Payment due {addDays(new Date().toISOString().split('T')[0], payTerms)} · {invoiceNum}
              </div>
            </div>

            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button onClick={onClose} className="btn btn-ghost" style={{flex:1}}>Cancel</button>
              <button onClick={generatePDF} disabled={subtotal <= 0} className="btn btn-primary" style={{flex:1}}>
                Download PDF
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
