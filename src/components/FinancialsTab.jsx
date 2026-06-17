import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { jsPDF } from 'jspdf';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

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

const STATUS_CONFIG = {
  draft:    { label:'Draft',    color:'#8080a0', bg:'#8080a015', border:'#8080a030' },
  sent:     { label:'Sent',     color:'#40a0ff', bg:'#40a0ff15', border:'#40a0ff30' },
  overdue:  { label:'Overdue',  color:'#ff4070', bg:'#ff407015', border:'#ff407030' },
  paid:     { label:'Paid',     color:'#00ffc2', bg:'#00ffc215', border:'#00ffc230' },
};

function StatusPill({ status, onClick }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span
      onClick={onClick}
      style={{
        fontSize:11, fontWeight:600, color:c.color,
        background:c.bg, border:`1px solid ${c.border}`,
        borderRadius:4, padding:'3px 8px', whiteSpace:'nowrap',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {c.label}
    </span>
  );
}

function InvoiceTracker({ userUid }) {
  const [invoices, setInvoices]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('all');
  const [updating, setUpdating]       = useState(null);
  const [expandedId, setExpandedId]   = useState(null);

  useEffect(() => { loadInvoices(); }, []);

  async function loadInvoices() {
    setLoading(true);
    try {
      const ref  = collection(db, 'djProfiles', userUid, 'invoices');
      const snap = await getDocs(ref);
      const today = new Date().toISOString().split('T')[0];
      const list  = snap.docs.map(d => {
        const data = d.data();
        // Auto-mark overdue
        let status = data.status || 'draft';
        if (status === 'sent' && data.dueDate && data.dueDate < today) status = 'overdue';
        return { id: d.id, ...data, status };
      }).sort((a, b) => b.createdAt?.localeCompare?.(a.createdAt) || 0);
      setInvoices(list);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function updateStatus(invoiceId, newStatus) {
    setUpdating(invoiceId);
    try {
      const ref = doc(db, 'djProfiles', userUid, 'invoices', invoiceId);
      await updateDoc(ref, { status: newStatus });
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: newStatus } : inv));
    } catch (e) { console.error(e); }
    setUpdating(null);
  }

  const today   = new Date().toISOString().split('T')[0];
  const filtered = invoices.filter(inv => {
    if (filter === 'all') return true;
    if (filter === 'outstanding') return inv.status !== 'paid';
    return inv.status === filter;
  });

  const totalInvoiced   = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid       = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
  const totalOutstanding = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.total || 0), 0);

  const NEXT_STATUS = { draft:'sent', sent:'paid', overdue:'paid', paid:'draft' };
  const NEXT_LABEL  = { draft:'Mark sent', sent:'Mark paid', overdue:'Mark paid', paid:'Reset' };

  if (loading) return <div style={{textAlign:'center',padding:20,color:'#8080a0',fontSize:13}}>Loading invoices...</div>;

  return (
    <div>
      {/* Summary cards */}
      <div className="stats-row" style={{marginBottom:20}}>
        <div className="stat-card">
          <div className="stat-label">Total invoiced</div>
          <div className="stat-val" style={{color:'#a080ff'}}>€{totalInvoiced.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total paid</div>
          <div className="stat-val neon">€{totalPaid.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Outstanding</div>
          <div className="stat-val" style={{color: totalOutstanding > 0 ? '#ff9900' : '#8080a0'}}>€{totalOutstanding.toFixed(2)}</div>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {[
          { key:'all',         label:'All' },
          { key:'outstanding', label:'Outstanding' },
          { key:'draft',       label:'Draft' },
          { key:'sent',        label:'Sent' },
          { key:'overdue',     label:'Overdue' },
          { key:'paid',        label:'Paid' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding:'4px 12px', borderRadius:20, fontSize:11, cursor:'pointer',
              border: `1px solid ${filter === f.key ? '#00ffc250' : '#2a2a40'}`,
              background: filter === f.key ? '#00ffc215' : 'transparent',
              color: filter === f.key ? '#00ffc2' : '#8080a0',
              fontWeight: filter === f.key ? 600 : 400,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {invoices.length === 0 && (
        <div style={{background:'#0d0d18',border:'1px solid #1e1e30',borderRadius:10,padding:24,textAlign:'center',color:'#505070',fontSize:13}}>
          No invoices yet. Generate one from your gigs.
        </div>
      )}

      {filtered.length === 0 && invoices.length > 0 && (
        <div style={{textAlign:'center',color:'#505070',fontSize:13,padding:16}}>No invoices match this filter.</div>
      )}

      {filtered.map(inv => {
        const isExpanded = expandedId === inv.id;
        const sc         = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
        const isOverdue  = inv.status === 'overdue';

        return (
          <div
            key={inv.id}
            style={{
              background:'#0d0d18', border:`1px solid ${isOverdue ? '#ff407030' : '#1e1e30'}`,
              borderRadius:10, marginBottom:8, overflow:'hidden',
            }}
          >
            {/* Main row */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : inv.id)}
              style={{
                padding:'12px 16px', cursor:'pointer',
                display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
              }}
            >
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                  <span style={{fontSize:13,fontWeight:700,color:'#ffffff',fontFamily:'var(--font-mono)'}}>{inv.invoiceNum}</span>
                  <StatusPill status={inv.status} />
                </div>
                <div style={{fontSize:12,color:'#8080a0'}}>
                  {inv.venue} · {formatDateShort(inv.createdAt)}
                </div>
                {inv.dueDate && inv.status !== 'paid' && (
                  <div style={{fontSize:11,color: isOverdue ? '#ff4070' : '#8080a0',marginTop:2}}>
                    {isOverdue ? '⚠ Overdue — ' : 'Due '}
                    {formatDateShort(inv.dueDate)}
                  </div>
                )}
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:15,fontWeight:700,color: inv.status === 'paid' ? '#00ffc2' : '#ffffff'}}>
                  €{(inv.total || 0).toFixed(2)}
                </div>
                <div style={{fontSize:10,color:'#505070',marginTop:2}}>{isExpanded ? '▲' : '▼'}</div>
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div style={{borderTop:'1px solid #1e1e30',padding:'14px 16px',background:'#0a0a12'}}>

                {/* Gig lines */}
                {inv.gigs && inv.gigs.length > 0 && (
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:10,color:'#505070',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>Line items</div>
                    {inv.gigs.map((g, i) => (
                      <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'5px 0',borderBottom:'1px solid #1a1a2e'}}>
                        <span style={{color:'#c0c0d8'}}>{g.venue} · {formatDateShort(g.date)}</span>
                        <span style={{color:'#00ffc2',fontWeight:600}}>€{Number(g.fee).toFixed(2)}</span>
                      </div>
                    ))}
                    {inv.hasVat && (
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'5px 0',borderBottom:'1px solid #1a1a2e'}}>
                        <span style={{color:'#8080a0'}}>VAT (23%)</span>
                        <span style={{color:'#8080a0'}}>€{((inv.total || 0) - inv.gigs.reduce((s,g) => s+Number(g.fee),0)).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Status actions */}
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {['draft','sent','paid'].map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(inv.id, s)}
                      disabled={updating === inv.id || inv.status === s}
                      style={{
                        padding:'6px 14px', borderRadius:6, fontSize:12, cursor: inv.status === s ? 'default' : 'pointer',
                        border: `1px solid ${inv.status === s ? STATUS_CONFIG[s].border : '#2a2a40'}`,
                        background: inv.status === s ? STATUS_CONFIG[s].bg : 'transparent',
                        color: inv.status === s ? STATUS_CONFIG[s].color : '#8080a0',
                        fontWeight: inv.status === s ? 600 : 400,
                        opacity: updating === inv.id ? 0.5 : 1,
                      }}
                    >
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function FinancialsTab({ gigs, profile, userUid, hideFees }) {
  const now          = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth();

  const [year, setYear]             = useState(currentYear);
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo]     = useState('');
  const [djProfile, setDjProfile]   = useState(null);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab]   = useState('overview');

  useEffect(() => {
    async function load() {
      const ref  = doc(db, 'djProfiles', userUid);
      const snap = await getDoc(ref);
      if (snap.exists()) setDjProfile(snap.data());
    }
    load();
  }, [userUid]);

  const confirmedWithFee = gigs.filter(g => g.status === 'confirmed' && g.fee);
  const today            = new Date().toISOString().split('T')[0];

  const prevMonthDate  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth      = prevMonthDate.getMonth();
  const prevMonthYear  = prevMonthDate.getFullYear();
  const prevMonthTotal = confirmedWithFee.filter(g => {
    const d = new Date(g.date + 'T12:00:00');
    return d.getMonth() === prevMonth && d.getFullYear() === prevMonthYear;
  }).reduce((sum, g) => sum + Number(g.fee), 0);

  const thisMonthTotal = confirmedWithFee.filter(g => {
    const d = new Date(g.date + 'T12:00:00');
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).reduce((sum, g) => sum + Number(g.fee), 0);

  const nextMonthDate  = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonth      = nextMonthDate.getMonth();
  const nextMonthYear  = nextMonthDate.getFullYear();
  const nextMonthTotal = confirmedWithFee.filter(g => {
    const d = new Date(g.date + 'T12:00:00');
    return d.getMonth() === nextMonth && d.getFullYear() === nextMonthYear;
  }).reduce((sum, g) => sum + Number(g.fee), 0);

  let pctLabel = '';
  let pctColor = '#6060a0';
  if (prevMonthTotal > 0) {
    const pct = Math.round(((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100);
    pctLabel   = pct >= 0 ? `+${pct}% vs last month` : `${pct}% vs last month`;
    pctColor   = pct >= 0 ? '#00ffc2' : '#ff4070';
  } else if (thisMonthTotal > 0) {
    pctLabel = 'New earnings'; pctColor = '#00ffc2';
  }

  const upcomingTotal = confirmedWithFee.filter(g => g.date >= today).reduce((sum, g) => sum + Number(g.fee), 0);

  const monthlyData = MONTHS.map((_, i) =>
    confirmedWithFee.filter(g => {
      const d = new Date(g.date + 'T12:00:00');
      return d.getFullYear() === year && d.getMonth() === i;
    }).reduce((sum, g) => sum + Number(g.fee), 0)
  );
  const maxMonthly = Math.max(...monthlyData, 1);

  const reportGigs     = confirmedWithFee.filter(g => reportFrom && reportTo && g.date >= reportFrom && g.date <= reportTo).sort((a,b) => a.date.localeCompare(b.date));
  const reportSubtotal = reportGigs.reduce((sum, g) => sum + Number(g.fee), 0);
  const hasVat         = djProfile?.vat && djProfile.vat.trim() !== '';
  const reportVat      = hasVat ? reportSubtotal * 0.23 : 0;
  const reportTotal    = reportSubtotal + reportVat;
  const tradingName    = djProfile?.tradingName?.trim() || djProfile?.name || profile?.name;

  async function generateVatReport() {
    setGenerating(true);
    const pdf   = new jsPDF({ unit:'mm', format:'a4' });
    const pageW = 210; const margin = 20;
    let y = 20;

    pdf.setFillColor(10,10,15); pdf.rect(0,0,pageW,35,'F');
    pdf.setTextColor(255,255,255); pdf.setFontSize(20); pdf.setFont('helvetica','bold');
    pdf.text('EARNINGS REPORT', pageW-margin, 20, {align:'right'});
    pdf.setTextColor(150,150,180); pdf.setFontSize(9); pdf.setFont('helvetica','normal');
    pdf.text(`${formatDate(reportFrom)} — ${formatDate(reportTo)}`, pageW-margin, 28, {align:'right'});

    y = 50;
    pdf.setTextColor(100,100,150); pdf.setFontSize(8); pdf.setFont('helvetica','bold');
    pdf.text('PREPARED BY', margin, y); y += 6;
    pdf.setTextColor(30,30,40); pdf.setFontSize(11); pdf.setFont('helvetica','bold');
    pdf.text(tradingName || '', margin, y); y += 6;
    pdf.setTextColor(80,80,100); pdf.setFontSize(9); pdf.setFont('helvetica','normal');
    if (djProfile?.email) { pdf.text(djProfile.email, margin, y); y += 5; }
    if (djProfile?.vat)   { pdf.text(`VAT No: ${djProfile.vat}`, margin, y); y += 5; }
    y += 10;

    pdf.setFillColor(10,10,15); pdf.rect(margin,y,pageW-margin*2,8,'F');
    pdf.setTextColor(200,200,220); pdf.setFontSize(8); pdf.setFont('helvetica','bold');
    pdf.text('DATE', margin+4, y+5.5);
    pdf.text('VENUE', margin+35, y+5.5);
    pdf.text('FEE', pageW-margin-4, y+5.5, {align:'right'});
    y += 12;

    reportGigs.forEach((g, i) => {
      pdf.setTextColor(30,30,40); pdf.setFontSize(9); pdf.setFont('helvetica','normal');
      pdf.text(formatDate(g.date), margin+4, y);
      pdf.text(g.venue, margin+35, y);
      pdf.text(`€${Number(g.fee).toFixed(2)}`, pageW-margin-4, y, {align:'right'});
      y += 7;
      if (i < reportGigs.length-1) { pdf.setDrawColor(235,235,245); pdf.line(margin,y-2,pageW-margin,y-2); }
    });

    y += 8;
    pdf.setDrawColor(220,220,235); pdf.line(margin,y,pageW-margin,y); y += 8;
    pdf.setFontSize(9); pdf.setFont('helvetica','normal');
    pdf.setTextColor(80,80,100); pdf.text('Subtotal', pageW-margin-50, y);
    pdf.setTextColor(30,30,40); pdf.text(`€${reportSubtotal.toFixed(2)}`, pageW-margin-4, y, {align:'right'}); y += 7;
    if (hasVat) {
      pdf.setTextColor(80,80,100); pdf.text('VAT (23%)', pageW-margin-50, y);
      pdf.setTextColor(30,30,40); pdf.text(`€${reportVat.toFixed(2)}`, pageW-margin-4, y, {align:'right'}); y += 7;
    }
    pdf.setDrawColor(220,220,235); pdf.line(pageW-margin-60,y,pageW-margin,y); y += 6;
    pdf.setFillColor(10,10,15); pdf.roundedRect(pageW-margin-62,y-5,62,12,2,2,'F');
    pdf.setTextColor(200,200,220); pdf.setFontSize(11); pdf.setFont('helvetica','bold');
    pdf.text('TOTAL', pageW-margin-50, y+3.5);
    pdf.text(`€${reportTotal.toFixed(2)}`, pageW-margin-4, y+3.5, {align:'right'});

    pdf.save(`earnings-${reportFrom}-to-${reportTo}.pdf`);
    setGenerating(false);
  }

  const tabStyle = (active) => ({
    padding:'6px 16px', borderRadius:6, fontSize:12, cursor:'pointer',
    border: `1px solid ${active ? '#00ffc250' : '#2a2a40'}`,
    background: active ? '#00ffc215' : 'transparent',
    color: active ? '#00ffc2' : '#8080a0',
    fontWeight: active ? 600 : 400,
  });

  return (
    <div className="page-body">
      {/* Sub-tabs */}
      <div style={{display:'flex',gap:6,marginBottom:24}}>
        <button style={tabStyle(activeTab==='overview')} onClick={() => setActiveTab('overview')}>Overview</button>
        <button style={tabStyle(activeTab==='invoices')} onClick={() => setActiveTab('invoices')}>Invoices</button>
        <button style={tabStyle(activeTab==='report')}   onClick={() => setActiveTab('report')}>Earnings report</button>
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <>
          <div className="stats-row" style={{marginBottom:24}}>
            <div className="stat-card">
              <div className="stat-label">{MONTHS[prevMonth]} revenue</div>
              <div className="stat-val" style={{color:'#6060a0'}}>{hideFees ? '—' : `€${prevMonthTotal}`}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{MONTHS[currentMonth]} revenue</div>
              <div className="stat-val neon">{hideFees ? '—' : `€${thisMonthTotal}`}</div>
              {!hideFees && <div style={{fontSize:11,marginTop:4,color:pctColor,fontWeight:600}}>{pctLabel}</div>}
            </div>
            <div className="stat-card">
              <div className="stat-label">{MONTHS[nextMonth]} revenue</div>
              <div className="stat-val" style={{color:'#a080ff'}}>{hideFees ? '—' : `€${nextMonthTotal}`}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Upcoming booked</div>
              <div className="stat-val" style={{color:'#ffbb00'}}>{hideFees ? '—' : `€${upcomingTotal}`}</div>
            </div>
          </div>

          <div className="section-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>Monthly earnings</span>
            <div style={{display:'flex',gap:6}}>
              <button onClick={() => setYear(y => y-1)} style={{background:'var(--bg-raised)',border:'1px solid var(--border)',color:'var(--text-secondary)',borderRadius:5,padding:'2px 10px',fontSize:11,cursor:'pointer'}}>‹</button>
              <span style={{fontSize:12,color:'var(--text-secondary)',lineHeight:'24px'}}>{year}</span>
              <button onClick={() => setYear(y => y+1)} style={{background:'var(--bg-raised)',border:'1px solid var(--border)',color:'var(--text-secondary)',borderRadius:5,padding:'2px 10px',fontSize:11,cursor:'pointer'}}>›</button>
            </div>
          </div>

          <div style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:10,padding:'20px 16px',marginBottom:24}}>
            {hideFees ? (
              <div style={{textAlign:'center',padding:20,color:'#505070',fontSize:13}}>Fees are hidden.</div>
            ) : (
              <div style={{display:'flex',alignItems:'flex-end',gap:6,height:120}}>
                {monthlyData.map((val, i) => {
                  const isCurrentMonth = i === currentMonth && year === currentYear;
                  const barH = val > 0 ? Math.max((val / maxMonthly) * 100, 8) : 0;
                  return (
                    <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                      <div style={{fontSize:9,color:'#6060a0',fontFamily:'var(--font-mono)'}}>{val > 0 ? `€${val}` : ''}</div>
                      <div style={{width:'100%',height:100,display:'flex',alignItems:'flex-end'}}>
                        <div style={{width:'100%',height:`${barH}%`,background:isCurrentMonth?'#00ffc2':'#00ffc240',borderRadius:'3px 3px 0 0',transition:'height 0.3s',minHeight:val>0?4:0}} />
                      </div>
                      <div style={{fontSize:9,color:isCurrentMonth?'#00ffc2':'#404060',textTransform:'uppercase',letterSpacing:'0.05em'}}>{MONTHS[i]}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* INVOICES */}
      {activeTab === 'invoices' && (
        <InvoiceTracker userUid={userUid} />
      )}

      {/* EARNINGS REPORT */}
      {activeTab === 'report' && (
        <>
          <div style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:10,padding:20,marginBottom:20}}>
            <div style={{fontSize:12,color:'#8080a0',marginBottom:16}}>
              Select a date range to generate a PDF report of your earnings{hasVat ? ' including VAT breakdown.' : '.'}
            </div>
            <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:140}}>
                <label style={{fontSize:11,color:'#8080a0',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.07em'}}>From</label>
                <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:13,padding:'8px 10px',boxSizing:'border-box'}} />
              </div>
              <div style={{flex:1,minWidth:140}}>
                <label style={{fontSize:11,color:'#8080a0',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.07em'}}>To</label>
                <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a40',borderRadius:6,color:'#e8e8f0',fontSize:13,padding:'8px 10px',boxSizing:'border-box'}} />
              </div>
            </div>

            {reportGigs.length > 0 && (
              <div style={{background:'#13131f',border:'1px solid #1e1e2e',borderRadius:8,padding:12,marginBottom:16}}>
                <div style={{fontSize:11,color:'#8080a0',marginBottom:8}}>{reportGigs.length} gig{reportGigs.length!==1?'s':''} in this period</div>
                {hasVat && (
                  <>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#9090b0',marginBottom:4}}><span>Subtotal</span><span>€{reportSubtotal.toFixed(2)}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#9090b0',marginBottom:6}}><span>VAT 23%</span><span>€{reportVat.toFixed(2)}</span></div>
                  </>
                )}
                <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#00ffc2',fontWeight:600}}><span>Total</span><span>€{reportTotal.toFixed(2)}</span></div>
              </div>
            )}

            {reportFrom && reportTo && reportGigs.length === 0 && (
              <div style={{fontSize:13,color:'#8080a0',marginBottom:16}}>No confirmed gigs with fees in this period.</div>
            )}

            <button onClick={generateVatReport} disabled={reportGigs.length===0||generating} className="btn btn-primary" style={{width:'100%'}}>
              {generating ? 'Generating...' : 'Download PDF Report'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
