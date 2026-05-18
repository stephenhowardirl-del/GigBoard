import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { jsPDF } from 'jspdf';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function addDays(iso, days) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function generateInvoiceNumber() {
  const now = new Date();
  const rand = Math.floor(Math.random() * 900) + 100;
  return `INV-${now.getFullYear()}-${rand}`;
}

export default function InvoiceModal({ gig, userUid, onClose }) {
  const [djProfile, setDjProfile] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [fee, setFee]             = useState(String(gig.fee || ''));
  const [invoiceNum]              = useState(generateInvoiceNumber());

  useEffect(() => {
    async function load() {
      const ref  = doc(db, 'djProfiles', userUid);
      const snap = await getDoc(ref);
      if (snap.exists()) setDjProfile(snap.data());
      setLoading(false);
    }
    load();
  }, []);

  function generatePDF() {
    const pdf      = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW    = 210;
    const margin   = 20;
    const col2     = 120;
    let y          = 20;

    const feeNum   = parseFloat(fee) || 0;
    const hasVat   = djProfile?.vat && djProfile.vat.trim() !== '';
    const vatRate  = 0.23;
    const vatAmt   = hasVat ? feeNum * vatRate : 0;
    const total    = feeNum + vatAmt;

    const tradingName = djProfile?.tradingName?.trim() || djProfile?.name || gig.djName;

    // ── Header bar ──────────────────────────────────────────────
    pdf.setFillColor(10, 10, 15);
    pdf.rect(0, 0, pageW, 35, 'F');

    pdf.setTextColor(0, 255, 194);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('GIGBOARD', margin, 15);

    pdf.setTextColor(180, 180, 200);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('gigboard.app', margin, 22);

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INVOICE', pageW - margin, 20, { align: 'right' });

    pdf.setTextColor(150, 150, 180);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(invoiceNum, pageW - margin, 28, { align: 'right' });

    y = 50;

    // ── From / To ────────────────────────────────────────────────
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
      const addressLines = djProfile.address.split('\n');
      addressLines.forEach(line => {
        pdf.text(line.trim(), margin, y);
        y += 5;
      });
    }
    if (djProfile?.email) { pdf.text(djProfile.email, margin, y); y += 5; }
    if (djProfile?.phone) { pdf.text(djProfile.phone, margin, y); y += 5; }
    if (djProfile?.vat)   { pdf.text(`VAT: ${djProfile.vat}`, margin, y); y += 5; }

    y = 50 + 6 + 5;
    pdf.setTextColor(80, 80, 100);
    pdf.setFontSize(9);
    const gigDateFormatted = formatDate(gig.date);
    pdf.text(gigDateFormatted, col2, y); y += 5;
    pdf.text(gig.time || '', col2, y);

    y = Math.max(y + 20, 110);

    // ── Invoice meta ─────────────────────────────────────────────
    pdf.setFillColor(245, 245, 252);
    pdf.roundedRect(margin, y - 6, pageW - margin * 2, 22, 2, 2, 'F');

    pdf.setTextColor(80, 80, 100);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ISSUE DATE', margin + 4, y + 1);
    pdf.text('DUE DATE', margin + 55, y + 1);
    pdf.text('STATUS', margin + 110, y + 1);

    pdf.setTextColor(30, 30, 40);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const today = new Date().toISOString().split('T')[0];
    pdf.text(formatDate(today), margin + 4, y + 8);
    pdf.text(addDays(today, 14), margin + 55, y + 8);
    pdf.text('Due', margin + 110, y + 8);

    y += 30;

    // ── Line items header ────────────────────────────────────────
    pdf.setFillColor(10, 10, 15);
    pdf.rect(margin, y, pageW - margin * 2, 8, 'F');

    pdf.setTextColor(0, 255, 194);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DESCRIPTION', margin + 4, y + 5.5);
    pdf.text('AMOUNT', pageW - margin - 4, y + 5.5, { align: 'right' });

    y += 12;

    // ── Line item ────────────────────────────────────────────────
    pdf.setTextColor(30, 30, 40);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DJ Services', margin + 4, y);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 100);
    pdf.text(`${gig.venue} · ${formatDate(gig.date)} · ${gig.time}`, margin + 4, y + 6);

    pdf.setTextColor(30, 30, 40);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`€${feeNum.toFixed(2)}`, pageW - margin - 4, y, { align: 'right' });

    y += 20;

    // ── Divider ──────────────────────────────────────────────────
    pdf.setDrawColor(220, 220, 235);
    pdf.line(margin, y, pageW - margin, y);
    y += 8;

    // ── Totals ───────────────────────────────────────────────────
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 100);

    pdf.text('Subtotal', pageW - margin - 50, y);
    pdf.setTextColor(30, 30, 40);
    pdf.text(`€${feeNum.toFixed(2)}`, pageW - margin - 4, y, { align: 'right' });
    y += 7;

    if (hasVat) {
      pdf.setTextColor(80, 80, 100);
      pdf.text(`VAT (23%)`, pageW - margin - 50, y);
      pdf.setTextColor(30, 30, 40);
      pdf.text(`€${vatAmt.toFixed(2)}`, pageW - margin - 4, y, { align: 'right' });
      y += 7;
    }

    pdf.setDrawColor(220, 220, 235);
    pdf.line(pageW - margin - 60, y, pageW - margin, y);
    y += 6;

    pdf.setFillColor(10, 10, 15);
    pdf.roundedRect(pageW - margin - 62, y - 5, 62, 12, 2, 2, 'F');
    pdf.setTextColor(0, 255, 194);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL', pageW - margin - 50, y + 3.5);
    pdf.text(`€${total.toFixed(2)}`, pageW - margin - 4, y + 3.5, { align: 'right' });

    y += 24;

    // ── Payment details ──────────────────────────────────────────
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

      y += 30;
    }

    // ── Footer ───────────────────────────────────────────────────
    pdf.setFillColor(10, 10, 15);
    pdf.rect(0, 280, pageW, 17, 'F');
    pdf.setTextColor(100, 100, 130);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated by GigBoard · ${invoiceNum}`, pageW / 2, 290, { align: 'center' });

    pdf.save(`${invoiceNum}-${gig.venue.replace(/\s+/g, '-')}.pdf`);
  }

  const feeNum  = parseFloat(fee) || 0;
  const hasVat  = djProfile?.vat && djProfile.vat.trim() !== '';
  const vatAmt  = hasVat ? feeNum * 0.23 : 0;
  const total   = feeNum + vatAmt;

  return (
    <div style={{position:'fixed',inset:0,background:'#00000080',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#0d0d14',border:'1px solid #2a2a40',borderRadius:12,padding:28,width:'100%',maxWidth:420}} onClick={e => e.stopPropagation()}>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div>
            <div style={{fontSize:17,fontWeight:600,color:'#e8e8f0'}}>Create Invoice</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{invoiceNum}</div>
          </div>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:'#404060',fontSize:20,cursor:'pointer'}}>✕</button>
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:20,color:'var(--text-muted)'}}>Loading profile...</div>
        ) : !djProfile ? (
          <div style={{textAlign:'center',padding:20,color:'#ff6090',fontSize:13}}>
            Please fill in your profile before generating an invoice.
          </div>
        ) : (
          <>
            <div style={{background:'#13131f',border:'1px solid #1e1e2e',borderRadius:8,padding:14,marginBottom:20,fontSize:12,color:'#9090b0'}}>
              <div style={{fontWeight:600,color:'#e8e8f0',marginBottom:6}}>{gig.venue}</div>
              <div>{formatDate(gig.date)} · {gig.time}</div>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.07em'}}>Fee (€)</label>
              <input
                type="number"
                value={fee}
                onChange={e => setFee(e.target.value)}
                style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:14,padding:'9px 12px',boxSizing:'border-box'}}
              />
            </div>

            {hasVat && (
              <div style={{background:'#13131f',border:'1px solid #1e1e2e',borderRadius:8,padding:12,marginBottom:16,fontSize:12}}>
                <div style={{display:'flex',justifyContent:'space-between',color:'#9090b0',marginBottom:4}}>
                  <span>Subtotal</span><span>€{feeNum.toFixed(2)}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',color:'#9090b0',marginBottom:6}}>
                  <span>VAT 23%</span><span>€{vatAmt.toFixed(2)}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',color:'#00ffc2',fontWeight:600,fontSize:14}}>
                  <span>Total</span><span>€{total.toFixed(2)}</span>
                </div>
              </div>
            )}

            {!hasVat && fee && (
              <div style={{display:'flex',justifyContent:'space-between',color:'#00ffc2',fontWeight:600,fontSize:14,marginBottom:16}}>
                <span>Total</span><span>€{feeNum.toFixed(2)}</span>
              </div>
            )}

            <div style={{display:'flex',gap:10}}>
              <button onClick={onClose} className="btn btn-ghost" style={{flex:1}}>Cancel</button>
              <button
                onClick={generatePDF}
                disabled={!fee || feeNum <= 0}
                className="btn btn-primary"
                style={{flex:1}}
              >
                Download PDF
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
