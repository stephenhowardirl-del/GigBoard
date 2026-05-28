import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { jsPDF } from 'jspdf';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-IE', { day:'numeric', month:'long', year:'numeric' });
}

export default function FinancialsTab({ gigs, profile, userUid }) {
  const now         = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [year, setYear]             = useState(currentYear);
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo]     = useState('');
  const [djProfile, setDjProfile]   = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function load() {
      const ref  = doc(db, 'djProfiles', userUid);
      const snap = await getDoc(ref);
      if (snap.exists()) setDjProfile(snap.data());
    }
    load();
  }, []);

  const confirmedWithFee = gigs.filter(g => g.status === 'confirmed' && g.fee);

  const today = new Date().toISOString().split('T')[0];

  // Previous month
  const prevMonthDate  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth      = prevMonthDate.getMonth();
  const prevMonthYear  = prevMonthDate.getFullYear();
  const prevMonthTotal = confirmedWithFee.filter(g => {
    const d = new Date(g.date + 'T12:00:00');
    return d.getMonth() === prevMonth && d.getFullYear() === prevMonthYear;
  }).reduce((sum, g) => sum + Number(g.fee), 0);

  // This month
  const thisMonthTotal = confirmedWithFee.filter(g => {
    const d = new Date(g.date + 'T12:00:00');
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).reduce((sum, g) => sum + Number(g.fee), 0);

  // Next month
  const nextMonthDate  = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonth      = nextMonthDate.getMonth();
  const nextMonthYear  = nextMonthDate.getFullYear();
  const nextMonthTotal = confirmedWithFee.filter(g => {
    const d = new Date(g.date + 'T12:00:00');
    return d.getMonth() === nextMonth && d.getFullYear() === nextMonthYear;
  }).reduce((sum, g) => sum + Number(g.fee), 0);

  // Percentage change this month vs last month
  let pctChange = null;
  let pctLabel  = '';
  if (prevMonthTotal > 0) {
    pctChange = Math.round(((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100);
    pctLabel  = pctChange >= 0 ? `+${pctChange}%` : `${pctChange}%`;
  } else if (thisMonthTotal > 0) {
    pctLabel = 'New earnings';
  } else {
    pctLabel = 'No data';
  }
  const pctColor = pctChange === null ? '#6060a0' : pctChange >= 0 ? '#00ffc2' : '#ff4070';

  // Upcoming booked work — all future confirmed gigs with fees
  const upcomingTotal = confirmedWithFee.filter(g => g.date >= today).reduce((sum, g) => sum + Number(g.fee), 0);

  // Monthly chart data
  const monthlyData = MONTHS.map((_, i) => {
    return confirmedWithFee.filter(g => {
      const d = new Date(g.date + 'T12:00:00');
      return d.getFullYear() === year && d.getMonth() === i;
    }).reduce((sum, g) => sum + Number(g.fee), 0);
  });

  const maxMonthly = Math.max(...monthlyData, 1);
  const yearTotal  = monthlyData.reduce((a, b) => a + b, 0);

  // VAT report
  const reportGigs = confirmedWithFee.filter(g => {
    if (!reportFrom || !reportTo) return false;
    return g.date >= reportFrom && g.date <= reportTo;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const reportSubtotal = reportGigs.reduce((sum, g) => sum + Number(g.fee), 0);
  const hasVat         = djProfile?.vat && djProfile.vat.trim() !== '';
  const reportVat      = hasVat ? reportSubtotal * 0.23 : 0;
  const reportTotal    = reportSubtotal + reportVat;
  const tradingName    = djProfile?.tradingName?.trim() || djProfile?.name || profile?.name;

  async function generateVatReport() {
    setGenerating(true);
    const pdf    = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW  = 210;
    const margin = 20;
    let y        = 20;

    pdf.setFillColor(10, 10, 15);
    pdf.rect(0, 0, pageW, 35, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('EARNINGS REPORT', pageW - margin, 20, { align: 'right' });
    pdf.setTextColor(150, 150, 180);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${formatDate(reportFrom)} — ${formatDate(reportTo)}`, pageW - margin, 28, { align: 'right' });

    y = 50;
    pdf.setTextColor(100, 100, 150);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PREPARED BY', margin, y);
    y += 6;
    pdf.setTextColor(30, 30, 40);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(tradingName || '', margin, y);
    y += 6;
    pdf.setTextColor(80, 80, 100);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    if (djProfile?.email) { pdf.text(djProfile.email, margin, y); y += 5; }
    if (djProfile?.vat)   { pdf.text(`VAT No: ${djProfile.vat}`, margin, y); y += 5; }
    y += 10;

    pdf.setFillColor(10, 10, 15);
    pdf.rect(margin, y, pageW - margin * 2, 8, 'F');
    pdf.setTextColor(200, 200, 220);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DATE', margin + 4, y + 5.5);
    pdf.text('VENUE', margin + 35, y + 5.5);
    pdf.text('FEE', pageW - margin - 4, y + 5.5, { align: 'right' });
    y += 12;

    reportGigs.forEach((g, i) => {
      pdf.setTextColor(30, 30, 40);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatDate(g.date), margin + 4, y);
      pdf.text(g.venue, margin + 35, y);
      pdf.text(`€${Number(g.fee).toFixed(2)}`, pageW - margin - 4, y, { align: 'right' });
      y += 7;
      if (i < reportGigs.length - 1) {
        pdf.setDrawColor(235, 235, 245);
        pdf.line(margin, y - 2, pageW - margin, y - 2);
      }
    });

    y += 8;
    pdf.setDrawColor(220, 220, 235);
    pdf.line(margin, y, pageW - margin, y);
    y += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 100);
    pdf.text('Subtotal', pageW - margin - 50, y);
    pdf.setTextColor(30, 30, 40);
    pdf.text(`€${reportSubtotal.toFixed(2)}`, pageW - margin - 4, y, { align: 'right' });
    y += 7;

    if (hasVat) {
      pdf.setTextColor(80, 80, 100);
      pdf.text('VAT (23%)', pageW - margin - 50, y);
      pdf.setTextColor(30, 30, 40);
      pdf.text(`€${reportVat.toFixed(2)}`, pageW - margin - 4, y, { align: 'right' });
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
    pdf.text(`€${reportTotal.toFixed(2)}`, pageW - margin - 4, y + 3.5, { align: 'right' });

    pdf.save(`earnings-${reportFrom}-to-${reportTo}.pdf`);
    setGenerating(false);
  }

  return (
    <div className="page-body">

      {/* New stat cards */}
      <div className="stats-row" style={{marginBottom:24}}>
        <div className="stat-card">
          <div className="stat-label">{MONTHS[prevMonth]} revenue</div>
          <div className="stat-val" style={{color:'#6060a0'}}>€{prevMonthTotal}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{MONTHS[currentMonth]} revenue</div>
          <div className="stat-val neon">€{thisMonthTotal}</div>
          <div style={{fontSize:11,marginTop:4,color:pctColor,fontWeight:600}}>{pctLabel} vs last month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{MONTHS[nextMonth]} revenue</div>
          <div className="stat-val" style={{color:'#a080ff'}}>€{nextMonthTotal}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Upcoming booked</div>
          <div className="stat-val" style={{color:'#ffbb00'}}>€{upcomingTotal}</div>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="section-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>Monthly earnings</span>
        <div style={{display:'flex',gap:6}}>
          <button onClick={() => setYear(y => y - 1)} style={{background:'var(--bg-raised)',border:'1px solid var(--border)',color:'var(--text-secondary)',borderRadius:5,padding:'2px 10px',fontSize:11,cursor:'pointer'}}>‹</button>
          <span style={{fontSize:12,color:'var(--text-secondary)',lineHeight:'24px'}}>{year}</span>
          <button onClick={() => setYear(y => y + 1)} style={{background:'var(--bg-raised)',border:'1px solid var(--border)',color:'var(--text-secondary)',borderRadius:5,padding:'2px 10px',fontSize:11,cursor:'pointer'}}>›</button>
        </div>
      </div>

      <div style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:10,padding:'20px 16px',marginBottom:24}}>
        <div style={{display:'flex',alignItems:'flex-end',gap:6,height:120}}>
          {monthlyData.map((val, i) => {
            const isCurrentMonth = i === currentMonth && year === currentYear;
            const barH = val > 0 ? Math.max((val / maxMonthly) * 100, 8) : 0;
            return (
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <div style={{fontSize:9,color:'#6060a0',fontFamily:'var(--font-mono)'}}>{val > 0 ? `€${val}` : ''}</div>
                <div style={{width:'100%',height:100,display:'flex',alignItems:'flex-end'}}>
                  <div style={{
                    width: '100%',
                    height: `${barH}%`,
                    background: isCurrentMonth ? '#00ffc2' : '#00ffc240',
                    borderRadius: '3px 3px 0 0',
                    transition: 'height 0.3s',
                    minHeight: val > 0 ? 4 : 0,
                  }} />
                </div>
                <div style={{fontSize:9,color: isCurrentMonth ? '#00ffc2' : '#404060',textTransform:'uppercase',letterSpacing:'0.05em'}}>{MONTHS[i]}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Earnings report */}
      <div className="section-title">Earnings report</div>
      <div style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:10,padding:20,marginBottom:20}}>
        <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:16}}>
          Select a date range to generate a PDF report of your earnings{hasVat ? ' including VAT breakdown.' : '.'}
        </div>
        <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:140}}>
            <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.07em'}}>From</label>
            <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:13,padding:'8px 10px',boxSizing:'border-box'}} />
          </div>
          <div style={{flex:1,minWidth:140}}>
            <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.07em'}}>To</label>
            <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:13,padding:'8px 10px',boxSizing:'border-box'}} />
          </div>
        </div>

        {reportGigs.length > 0 && (
          <div style={{background:'#13131f',border:'1px solid #1e1e2e',borderRadius:8,padding:12,marginBottom:16}}>
            <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:8}}>{reportGigs.length} gig{reportGigs.length !== 1 ? 's' : ''} in this period</div>
            {hasVat && (
              <>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#9090b0',marginBottom:4}}>
                  <span>Subtotal</span><span>€{reportSubtotal.toFixed(2)}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#9090b0',marginBottom:6}}>
                  <span>VAT 23%</span><span>€{reportVat.toFixed(2)}</span>
                </div>
              </>
            )}
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#00ffc2',fontWeight:600}}>
              <span>Total</span><span>€{reportTotal.toFixed(2)}</span>
            </div>
          </div>
        )}

        {reportFrom && reportTo && reportGigs.length === 0 && (
          <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:16}}>No confirmed gigs with fees in this period.</div>
        )}

        <button
          onClick={generateVatReport}
          disabled={reportGigs.length === 0 || generating}
          className="btn btn-primary"
          style={{width:'100%'}}
        >
          {generating ? 'Generating...' : 'Download PDF Report'}
        </button>
      </div>

    </div>
  );
}
