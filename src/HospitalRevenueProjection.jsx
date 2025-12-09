import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, Bed, Wallet, Activity, ChevronDown, ChevronUp, 
  LayoutGrid, Table2, ArrowLeft, FileSpreadsheet, FileText, 
  Calendar, Minus, Plus, Users, DollarSign, BarChart3, Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ==================== UTILITIES ====================
const fmt = {
  rupiah: (n) => n >= 1e9 ? `Rp ${(n/1e9).toFixed(1)}M` : n >= 1e6 ? `Rp ${(n/1e6).toFixed(1)}Jt` : 
    new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR', maximumFractionDigits:0}).format(n),
  rupiahFull: (n) => new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR', maximumFractionDigits:0}).format(n),
  num: (n) => new Intl.NumberFormat('id-ID', {maximumFractionDigits:2}).format(n)
};

// ==================== EXPORT ====================
const exportToExcel = (calcs, inp) => {
  try {
    const wb = XLSX.utils.book_new();
    
    const summary = [
      ['PROYEKSI PENDAPATAN RAWAT INAP'],[''],
      ['Model', 'BOR + Bottom-Up + Case Mix'], ['Growth', `${inp.growthRate}%`],
      ['Periode', `${inp.tahunProyeksi} tahun`], ['Tanggal', new Date().toLocaleDateString('id-ID')],
      [''],['Tahun','Rawat Inap','Penunjang','Total','BOR (%)','Pasien'],
      ...calcs.map(c => [c.tahun, c.rawatInap, c.penunjang.total, c.total, c.indikator.bor.toFixed(2), Math.round(c.indikator.totalPasien)])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(summary);
    ws['!cols'] = [{wch:15},{wch:18},{wch:18},{wch:18},{wch:12},{wch:15}];
    XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan');
    
    calcs.forEach(c => {
      const detail = [
        [`DETAIL ${c.tahun.toUpperCase()}`],[''],
        ['Kelas','TT','BOR','Hari Rawat','Pasien','Pendapatan'],
        ...c.classDetails.map(d => [d.kelas, d.tt, d.bor, d.hariRawat, d.jumlahPasien, d.pendapatan]),
        ['','','','','TOTAL RAWAT INAP', c.rawatInap],[''],
        ['PENUNJANG'],['Lab','','','','', c.penunjang.lab],
        ['Radiologi','','','','', c.penunjang.radiologi],
        ['Farmasi','','','','', c.penunjang.farmasi],
        ['Tindakan','','','','', c.penunjang.tindakan],
        ['','','','','TOTAL PENUNJANG', c.penunjang.total],[''],
        ['','','','','TOTAL', c.total]
      ];
      const wd = XLSX.utils.aoa_to_sheet(detail);
      wd['!cols'] = [{wch:15},{wch:15},{wch:12},{wch:15},{wch:15},{wch:18}];
      XLSX.utils.book_append_sheet(wb, wd, c.tahun);
    });
    
    XLSX.writeFile(wb, `Proyeksi_RS_${new Date().toISOString().split('T')[0]}.xlsx`);
    alert('✓ Excel berhasil didownload');
  } catch (e) {
    alert('Error: ' + e.message);
  }
};

const exportToPDF = (calcs, inp) => {
  try {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    let y = 20;
    
    // Header
    doc.setFillColor(37,99,235);
    doc.rect(0,0,pw,35,'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(20);
    doc.setFont(undefined,'bold');
    doc.text('PROYEKSI PENDAPATAN RS', pw/2, 15, {align:'center'});
    doc.setFontSize(10);
    doc.setFont(undefined,'normal');
    doc.text('BOR + Bottom-Up + Case Mix INA-CBGs', pw/2, 25, {align:'center'});
    
    y = 45;
    doc.setTextColor(0,0,0);
    doc.setFontSize(9);
    doc.text(`Growth: ${inp.growthRate}% | Periode: ${inp.tahunProyeksi} tahun`, 14, y);
    doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, pw-14, y, {align:'right'});
    y += 10;
    
    calcs.forEach((c, i) => {
      if (y > ph - 80) { doc.addPage(); y = 20; }
      
      doc.setFillColor(16,185,129);
      doc.rect(14, y, pw-28, 10, 'F');
      doc.setTextColor(255,255,255);
      doc.setFontSize(12);
      doc.setFont(undefined,'bold');
      doc.text(c.tahun.toUpperCase(), pw/2, y+7, {align:'center'});
      y += 15;
      doc.setTextColor(0,0,0);
      
      autoTable(doc, {
        startY: y,
        head: [['Kelas','TT','BOR','Hari','Pasien','Pendapatan']],
        body: c.classDetails.map(d => [d.kelas, d.tt, `${d.bor}%`, fmt.num(d.hariRawat), fmt.num(d.jumlahPasien), fmt.rupiah(d.pendapatan)]),
        foot: [['TOTAL RAWAT INAP','','','','', fmt.rupiah(c.rawatInap)]],
        theme: 'striped',
        headStyles: {fillColor:[37,99,235], fontSize:9},
        footStyles: {fillColor:[241,245,249], textColor:[0,0,0], fontStyle:'bold'},
        styles: {fontSize:8, cellPadding:3},
        margin: {left:14, right:14}
      });
      
      y = doc.lastAutoTable.finalY + 10;
      
      autoTable(doc, {
        startY: y,
        head: [['Penunjang','Nilai']],
        body: [
          ['Lab', fmt.rupiah(c.penunjang.lab)],
          ['Radiologi', fmt.rupiah(c.penunjang.radiologi)],
          ['Farmasi', fmt.rupiah(c.penunjang.farmasi)],
          ['Tindakan', fmt.rupiah(c.penunjang.tindakan)]
        ],
        foot: [['TOTAL PENUNJANG', fmt.rupiah(c.penunjang.total)]],
        theme: 'striped',
        headStyles: {fillColor:[16,185,129], fontSize:9},
        footStyles: {fillColor:[241,245,249], textColor:[0,0,0], fontStyle:'bold'},
        styles: {fontSize:8, cellPadding:3},
        margin: {left:14, right:14}
      });
      
      y = doc.lastAutoTable.finalY + 8;
      
      doc.setFillColor(16,185,129);
      doc.rect(14, y, pw-28, 12, 'F');
      doc.setTextColor(255,255,255);
      doc.setFontSize(11);
      doc.setFont(undefined,'bold');
      doc.text('TOTAL:', 18, y+8);
      doc.text(fmt.rupiahFull(c.total), pw-18, y+8, {align:'right'});
      y += 17;
      
      if (y > ph - 60) { doc.addPage(); y = 20; }
      
      autoTable(doc, {
        startY: y,
        head: [['Indikator','Nilai','Standar','Status']],
        body: [
          ['BOR', `${c.indikator.bor.toFixed(2)}%`, '60-85%', c.indikator.bor>=60 && c.indikator.bor<=85 ? '✓ IDEAL':'⚠ REVIEW'],
          ['ALOS', `${c.indikator.alos.toFixed(2)} hari`, '3-6 hari', c.indikator.alos>=3 && c.indikator.alos<=6 ? '✓ IDEAL':'⚠ REVIEW'],
          ['BTO', `${c.indikator.bto.toFixed(2)} kali`, '40-50 kali', c.indikator.bto>=40 && c.indikator.bto<=50 ? '✓ IDEAL':'⚠ REVIEW'],
          ['TOI', `${c.indikator.toi.toFixed(2)} hari`, '1-3 hari', c.indikator.toi>=1 && c.indikator.toi<=3 ? '✓ IDEAL':'⚠ REVIEW'],
          ['Revenue/Bed', fmt.rupiah(c.indikator.revenuePerBed), '-', '-'],
          ['Total Pasien', fmt.num(c.indikator.totalPasien), '-', '-']
        ],
        theme: 'grid',
        headStyles: {fillColor:[37,99,235], fontSize:9},
        styles: {fontSize:8, cellPadding:2},
        margin: {left:14, right:14}
      });
      
      y = doc.lastAutoTable.finalY + 15;
    });
    
    doc.save(`Laporan_RS_${new Date().toISOString().split('T')[0]}.pdf`);
    alert('✓ PDF berhasil didownload');
  } catch (e) {
    alert('Error PDF: ' + e.message);
  }
};

// ==================== CHART ====================
const LineChart = ({ data, dataKey, color = '#2563eb', label }) => {
  const ref = React.useRef(null);
  
  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height, p = 30;
    ctx.clearRect(0, 0, w, h);
    
    const vals = data.map(d => d[dataKey]);
    const max = Math.max(...vals), min = Math.min(...vals);
    const range = max - min || 1;
    
    // Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = p + (h - 2*p) * i / 4;
      ctx.beginPath();
      ctx.moveTo(p, y);
      ctx.lineTo(w-p, y);
      ctx.stroke();
    }
    
    // Line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    vals.forEach((v, i) => {
      const x = p + (w - 2*p) * i / (vals.length - 1);
      const y = h - p - ((v - min) / range) * (h - 2*p);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Points
    ctx.fillStyle = color;
    vals.forEach((v, i) => {
      const x = p + (w - 2*p) * i / (vals.length - 1);
      const y = h - p - ((v - min) / range) * (h - 2*p);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [data, dataKey, color]);
  
  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-sm font-semibold text-slate-700 mb-3">{label}</p>
      <canvas ref={ref} width={300} height={150} className="w-full" />
    </div>
  );
};

// ==================== COMPONENTS ====================
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>{children}</div>
);

const StatCard = ({ title, value, subtext, trendValue, isPositive, icon: Icon }) => (
  <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-emerald-50 rounded-xl border border-blue-200 hover:shadow-lg transition-all">
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-2">
        {Icon && <div className="p-2 rounded-lg bg-blue-100 text-blue-700"><Icon size={18} strokeWidth={2.5} /></div>}
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{title}</p>
      </div>
      {trendValue && (
        <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
          isPositive ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
        }`}>
          {isPositive ? <TrendingUp size={12} /> : <ChevronDown size={12} />}
          {trendValue}
        </span>
      )}
    </div>
    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1 break-words">{value}</h3>
    <span className="text-sm text-slate-500 font-medium">{subtext}</span>
  </div>
);

const InputField = ({ label, field, suffix, value, onChange, step = 1, min = 0 }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
    <div className="relative">
      <input 
        type="number" 
        value={value} 
        onChange={(e) => onChange(field, parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">{suffix}</span>}
    </div>
  </div>
);

const KPICard = ({ label, value, isGood, icon: Icon }) => (
  <div className={`p-3 rounded-lg border transition-all hover:shadow-md ${
    isGood ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
  }`}>
    <div className="flex items-center justify-between mb-1.5">
      <p className="text-xs text-slate-600 font-semibold">{label}</p>
      {Icon && <Icon size={14} className={isGood ? 'text-emerald-600' : 'text-amber-600'} />}
    </div>
    <p className={`text-lg sm:text-xl font-bold ${isGood ? 'text-emerald-700' : 'text-amber-700'}`}>{value}</p>
  </div>
);

// ==================== MAIN ====================
const HospitalAnalytics = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedSection, setExpandedSection] = useState('period');

  const [inputs, setInputs] = useState({
    ttVIP: 10, ttKelas1: 20, ttKelas2: 30, ttKelas3: 40,
    borVIP: 60, borKelas1: 70, borKelas2: 75, borKelas3: 80,
    alosVIP: 4, alosKelas1: 4, alosKelas2: 5, alosKelas3: 5,
    tarifVIP: 1500000, tarifKelas1: 800000, tarifKelas2: 500000, tarifKelas3: 300000,
    pctBPJS: 65, tarifBPJS: 5000000,
    pctLab: 15, pctRadiologi: 10, pctFarmasi: 25, pctTindakan: 20,
    growthRate: 8, tahunProyeksi: 3
  });

  const handleInputChange = (field, value) => setInputs(prev => ({ ...prev, [field]: value }));
  const adjustYear = (delta) => setInputs(prev => ({ ...prev, tahunProyeksi: Math.max(1, prev.tahunProyeksi + delta) }));

  // ==================== CALCULATIONS ====================
  const calculations = useMemo(() => {
    const results = [];
    for (let year = 0; year <= inputs.tahunProyeksi; year++) {
      const gf = Math.pow(1 + inputs.growthRate / 100, year);
      
      const classes = [
        { name: 'VIP', tt: inputs.ttVIP, bor: inputs.borVIP, alos: inputs.alosVIP, tarif: inputs.tarifVIP },
        { name: 'Kelas 1', tt: inputs.ttKelas1, bor: inputs.borKelas1, alos: inputs.alosKelas1, tarif: inputs.tarifKelas1 },
        { name: 'Kelas 2', tt: inputs.ttKelas2, bor: inputs.borKelas2, alos: inputs.alosKelas2, tarif: inputs.tarifKelas2 },
        { name: 'Kelas 3', tt: inputs.ttKelas3, bor: inputs.borKelas3, alos: inputs.alosKelas3, tarif: inputs.tarifKelas3 }
      ];
      
      let totalRI = 0, totalHR = 0, totalP = 0;
      const classDetails = [];
      
      classes.forEach(cls => {
        const hr = cls.tt * (cls.bor / 100) * 365;
        const jp = hr / cls.alos;
        const pBPJS = jp * (inputs.pctBPJS / 100);
        const pUmum = jp * (1 - inputs.pctBPJS / 100);
        const pendapatan = (pBPJS * inputs.tarifBPJS + pUmum * cls.alos * cls.tarif) * gf;
        
        totalRI += pendapatan;
        totalHR += hr;
        totalP += jp;
        
        classDetails.push({
          kelas: cls.name, tt: cls.tt, bor: cls.bor,
          hariRawat: Math.round(hr * gf),
          jumlahPasien: Math.round(jp * gf),
          pendapatan
        });
      });
      
      const penunjang = {
        lab: totalRI * (inputs.pctLab / 100),
        radiologi: totalRI * (inputs.pctRadiologi / 100),
        farmasi: totalRI * (inputs.pctFarmasi / 100),
        tindakan: totalRI * (inputs.pctTindakan / 100)
      };
      penunjang.total = Object.values(penunjang).reduce((a, b) => a + b, 0);
      
      const total = totalRI + penunjang.total;
      const totalTT = inputs.ttVIP + inputs.ttKelas1 + inputs.ttKelas2 + inputs.ttKelas3;
      const avgBOR = (totalHR / (totalTT * 365)) * 100 * gf;
      const avgALOS = totalHR / totalP;
      const bto = (totalP * gf) / totalTT;
      const toi = (365 - (avgBOR / 100 * 365)) / bto;
      
      results.push({
        tahun: year === 0 ? 'Tahun Dasar' : `Tahun ${year}`,
        yearNum: year,
        classDetails,
        rawatInap: totalRI,
        penunjang,
        total,
        indikator: {
          bor: avgBOR, alos: avgALOS, bto, toi,
          revenuePerBed: total / totalTT,
          totalPasien: totalP * gf
        }
      });
    }
    return results;
  }, [inputs]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'details', label: 'Detail', icon: Table2 },
    { id: 'analysis', label: 'Analisa', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 pb-24 md:pb-6">
      
      {/* NAVBAR */}
      <nav className="bg-white sticky top-0 z-50 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-emerald-600 text-white p-2 sm:p-2.5 rounded-lg">
              <Activity size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-xl text-slate-900">Analitik ABK</h1>
              <p className="text-xs font-medium text-slate-500 hidden sm:block">Proyeksi Pendapatan</p>
            </div>
          </div>

          <div className="hidden md:flex bg-slate-100 p-1 rounded-lg gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  activeTab === item.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-white/50'
                }`}
              >
                <item.icon size={16} /> {item.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 sm:gap-2">
            <button 
              onClick={() => exportToExcel(calculations, inputs)} 
              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-emerald-700 px-2.5 sm:px-4 py-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-200"
            >
              <FileSpreadsheet size={16} /> <span className="hidden sm:inline">Excel</span>
            </button>
            <button 
              onClick={() => exportToPDF(calculations, inputs)} 
              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-white px-2.5 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 rounded-lg transition-all"
            >
              <FileText size={16} /> <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        
        {activeTab !== 'dashboard' && (
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-all"
          >
            <ArrowLeft size={18} /> Kembali ke Dashboard
          </button>
        )}
        
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            
            {/* INPUT PANEL */}
            <div className="lg:col-span-4 space-y-3 sm:space-y-4">
              <h2 className="font-bold text-xl sm:text-2xl text-slate-900 mb-2 sm:mb-4">Konfigurasi Input</h2>

              {[
                { id: 'period', title: 'Periode & Pertumbuhan', icon: Calendar, fields: 'custom' },
                { id: 'beds', title: 'Kapasitas TT', icon: Bed, fields: [
                  {l:'VIP', k:'ttVIP'}, {l:'Kelas 1', k:'ttKelas1'},
                  {l:'Kelas 2', k:'ttKelas2'}, {l:'Kelas 3', k:'ttKelas3'}
                ]},
                { id: 'bor', title: 'Target BOR (%)', icon: Activity, fields: [
                  {l:'VIP', k:'borVIP', s:'%'}, {l:'Kelas 1', k:'borKelas1', s:'%'},
                  {l:'Kelas 2', k:'borKelas2', s:'%'}, {l:'Kelas 3', k:'borKelas3', s:'%'}
                ]},
                { id: 'alos', title: 'ALOS (hari)', icon: Calendar, fields: [
                  {l:'VIP', k:'alosVIP'}, {l:'Kelas 1', k:'alosKelas1'},
                  {l:'Kelas 2', k:'alosKelas2'}, {l:'Kelas 3', k:'alosKelas3'}
                ]},
                { id: 'tarif', title: 'Tarif & BPJS', icon: Wallet, fields: [
                  {l:'Tarif VIP', k:'tarifVIP'}, {l:'Tarif K1', k:'tarifKelas1'},
                  {l:'Tarif K2', k:'tarifKelas2'}, {l:'Tarif K3', k:'tarifKelas3'},
                  {l:'INA-CBG', k:'tarifBPJS'}, {l:'% BPJS', k:'pctBPJS', s:'%'}
                ]},
                { id: 'penunjang', title: 'Penunjang (%)', icon: DollarSign, fields: [
                  {l:'Lab', k:'pctLab', s:'%'}, {l:'Radio', k:'pctRadiologi', s:'%'},
                  {l:'Farmasi', k:'pctFarmasi', s:'%'}, {l:'Tindakan', k:'pctTindakan', s:'%'}
                ]},
              ].map((group) => (
                <Card key={group.id}>
                  <button 
                    onClick={() => setExpandedSection(expandedSection === group.id ? null : group.id)}
                    className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50 transition-all"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`p-1.5 sm:p-2 rounded-lg ${
                        expandedSection === group.id ? 'bg-gradient-to-br from-blue-600 to-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <group.icon size={16} />
                      </div>
                      <span className="font-semibold text-sm sm:text-base text-slate-900">{group.title}</span>
                    </div>
                    {expandedSection === group.id ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                  </button>
                  
                  {expandedSection === group.id && (
                    <div className="p-3 sm:p-4 pt-0 border-t border-slate-100">
                      {group.fields === 'custom' ? (
                        <div className="space-y-3 sm:space-y-4">
                          <div>
                            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">Periode Proyeksi (tahun)</label>
                            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg">
                              <button onClick={() => adjustYear(-1)} className="p-2 bg-white rounded-md shadow-sm hover:bg-slate-50">
                                <Minus size={16} />
                              </button>
                              <span className="flex-1 text-center font-bold text-xl sm:text-2xl text-slate-900">{inputs.tahunProyeksi}</span>
                              <button onClick={() => adjustYear(1)} className="p-2 bg-white rounded-md shadow-sm hover:bg-slate-50">
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                          <InputField label="Growth Rate (%)" field="growthRate" value={inputs.growthRate} onChange={handleInputChange} suffix="%" step={0.5} />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          {group.fields.map((f) => (
                            <InputField 
                              key={f.k} 
                              label={f.l} 
                              field={f.k} 
                              value={inputs[f.k]} 
                              onChange={handleInputChange} 
                              suffix={f.s}
                              step={f.k.includes('tarif') || f.k.includes('BPJS') ? 10000 : 1}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* HASIL PANEL */}
            <div className="lg:col-span-8 space-y-4 sm:space-y-6">
              
              {/* Hero Card */}
              <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-emerald-600 rounded-xl p-5 sm:p-8 text-white shadow-xl">
                <div className="flex justify-between items-start mb-4 sm:mb-6">
                  <div className="flex-1 min-w-0">
                    <p className="text-blue-200 text-xs sm:text-sm font-medium mb-2">Total Proyeksi Pendapatan</p>
                    <h2 className="text-2xl sm:text-4xl font-bold mb-2 break-words">{fmt.rupiahFull(calculations[0].total)}</h2>
                    <p className="text-blue-200 text-xs sm:text-sm flex items-center gap-2">
                      <Calendar size={14} />
                      {calculations[0].tahun}
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap ml-2">Base Year</div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-white/20">
                  {[
                    { label: 'Rawat Inap', value: fmt.rupiah(calculations[0].rawatInap), icon: Bed },
                    { label: 'Penunjang', value: fmt.rupiah(calculations[0].penunjang.total), icon: Activity },
                    { label: 'BOR', value: fmt.num(calculations[0].indikator.bor) + '%', icon: BarChart3 },
                    { label: 'Pasien/Th', value: fmt.num(calculations[0].indikator.totalPasien), icon: Users }
                  ].map((item, idx) => (
                    <div key={idx}>
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <item.icon size={12} className="text-blue-200" />
                        <p className="text-blue-200 text-xs font-medium">{item.label}</p>
                      </div>
                      <p className="font-bold text-sm sm:text-lg break-words">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <LineChart data={calculations.map((c) => ({ total: c.total / 1000000 }))} dataKey="total" color="#2563eb" label="Tren Pendapatan (Juta)" />
                <LineChart data={calculations.map((c) => ({ bor: c.indikator.bor }))} dataKey="bor" color="#10b981" label="Tren BOR (%)" />
                <LineChart data={calculations.map((c) => ({ pasien: c.indikator.totalPasien }))} dataKey="pasien" color="#0891b2" label="Tren Pasien" />
              </div>

              {/* Proyeksi Growth */}
              <div>
                <h3 className="font-bold text-xl sm:text-2xl text-slate-900 mb-3 sm:mb-4">Proyeksi Pertumbuhan</h3>
                {calculations.length > 1 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                    {calculations.slice(1).map((calc, idx) => {
                      const prevTotal = calculations[idx].total;
                      const growth = calc.total - prevTotal;
                      const growthPct = (growth / prevTotal) * 100;
                      return (
                        <StatCard 
                          key={idx}
                          title={calc.tahun}
                          value={fmt.rupiah(calc.total)}
                          subtext="Total Pendapatan"
                          trendValue={`${fmt.num(Math.abs(growthPct))}%`}
                          isPositive={growth >= 0}
                          icon={DollarSign}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <Card className="p-6 sm:p-8 text-center">
                    <p className="text-slate-600 text-sm">Tambahkan periode proyeksi untuk melihat tren</p>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DETAIL TAB */}
        {activeTab === 'details' && (
          <div className="space-y-4 sm:space-y-6">
            <Card>
              <div className="p-4 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-emerald-50">
                <h3 className="font-bold text-xl sm:text-2xl text-slate-900 mb-1">Rincian Keuangan Detail</h3>
                <p className="text-xs sm:text-sm text-slate-600">Detail proyeksi pendapatan per tahun dan per kelas</p>
              </div>
              
              <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
                {calculations.map((calc, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-3 sm:p-5 bg-gradient-to-br from-white to-blue-50">
                    <h4 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4">{calc.tahun}</h4>
                    
                    <div className="overflow-x-auto mb-3 sm:mb-4 -mx-3 sm:mx-0">
                      <div className="inline-block min-w-full align-middle">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-gradient-to-r from-blue-100 to-emerald-100">
                            <tr>
                              <th className="p-2 sm:p-3 text-left font-semibold">Kelas</th>
                              <th className="p-2 sm:p-3 text-right font-semibold">TT</th>
                              <th className="p-2 sm:p-3 text-right font-semibold">BOR</th>
                              <th className="p-2 sm:p-3 text-right font-semibold hidden sm:table-cell">Hari</th>
                              <th className="p-2 sm:p-3 text-right font-semibold hidden sm:table-cell">Pasien</th>
                              <th className="p-2 sm:p-3 text-right font-semibold">Pendapatan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {calc.classDetails.map((cls, i) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-blue-50">
                                <td className="p-2 sm:p-3 font-medium">{cls.kelas}</td>
                                <td className="p-2 sm:p-3 text-right">{cls.tt}</td>
                                <td className="p-2 sm:p-3 text-right">{cls.bor}%</td>
                                <td className="p-2 sm:p-3 text-right hidden sm:table-cell">{fmt.num(cls.hariRawat)}</td>
                                <td className="p-2 sm:p-3 text-right hidden sm:table-cell">{fmt.num(cls.jumlahPasien)}</td>
                                <td className="p-2 sm:p-3 text-right font-semibold text-xs sm:text-sm break-words">{fmt.rupiah(cls.pendapatan)}</td>
                              </tr>
                            ))}
                            <tr className="bg-gradient-to-r from-blue-100 to-emerald-100 font-bold">
                              <td className="p-2 sm:p-3" colSpan="5">Total Rawat Inap</td>
                              <td className="p-2 sm:p-3 text-right text-xs sm:text-sm break-words">{fmt.rupiah(calc.rawatInap)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 border border-slate-200">
                      <h5 className="font-bold mb-2 sm:mb-3 text-sm sm:text-base text-slate-700">Pendapatan Penunjang</h5>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                        {[
                          {label:'Laboratorium', val:calc.penunjang.lab, bg:'emerald'},
                          {label:'Radiologi', val:calc.penunjang.radiologi, bg:'blue'},
                          {label:'Farmasi', val:calc.penunjang.farmasi, bg:'cyan'},
                          {label:'Tindakan', val:calc.penunjang.tindakan, bg:'teal'},
                          {label:'Total', val:calc.penunjang.total, bg:'slate', full:true}
                        ].map((p,i) => (
                          <div key={i} className={`bg-${p.bg}-50 p-2 sm:p-3 rounded-lg border border-${p.bg}-200 ${p.full ? 'col-span-2' : ''}`}>
                            <div className="text-slate-600 text-xs mb-1">{p.label}</div>
                            <div className={`font-bold text-${p.bg}-700 text-xs sm:text-sm break-words`}>{fmt.rupiah(p.val)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-blue-600 text-white rounded-lg p-4 sm:p-5 shadow-lg">
                      <div className="text-sm sm:text-lg font-medium mb-1">TOTAL PENDAPATAN</div>
                      <div className="text-xl sm:text-3xl font-bold break-words mb-2">{fmt.rupiahFull(calc.total)}</div>
                      {idx > 0 && (
                        <div className="text-xs sm:text-sm opacity-90 break-words">
                          Pertumbuhan: {fmt.rupiah(calc.total - calculations[idx-1].total)} 
                          ({(((calc.total - calculations[idx-1].total) / calculations[idx-1].total) * 100).toFixed(2)}%)
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-emerald-50">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-blue-600 to-emerald-600 text-white flex-shrink-0">
                  <Info size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-base sm:text-lg text-slate-900 mb-2 sm:mb-3">Metodologi Perhitungan</h4>
                  <div className="space-y-2 text-xs sm:text-sm text-slate-700">
                    {[
                      {label:'BOR Method', desc:'Hari Rawat = TT × BOR% × 365', bg:'blue'},
                      {label:'Bottom-Up', desc:'Perhitungan detail per kelas', bg:'emerald'},
                      {label:'Case Mix', desc:'Pemisahan BPJS & Umum', bg:'cyan'},
                      {label:'Penunjang', desc:'Lab, Radiologi, Farmasi, Tindakan', bg:'teal'}
                    ].map((m,i) => (
                      <div key={i} className={`bg-${m.bg}-50 p-2 sm:p-3 rounded-lg border border-${m.bg}-200`}>
                        <strong>{m.label}:</strong> {m.desc}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ANALYSIS TAB */}
        {activeTab === 'analysis' && (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h3 className="font-bold text-xl sm:text-2xl text-slate-900 mb-1">Indikator Kinerja</h3>
              <p className="text-xs sm:text-sm text-slate-600">Key Performance Indicators</p>
            </div>

            <Card className="p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-200">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Info className="text-blue-600" size={18} />
                <h4 className="font-bold text-base sm:text-lg text-slate-900">Standar Ideal</h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                {[
                  {label:'BOR', val:'60-85%', bg:'blue'},
                  {label:'ALOS', val:'3-6 hari', bg:'emerald'},
                  {label:'BTO', val:'40-50x', bg:'cyan'},
                  {label:'TOI', val:'1-3 hari', bg:'teal'}
                ].map((s,i) => (
                  <div key={i} className={`bg-white p-2 sm:p-3 rounded-lg border border-${s.bg}-200`}>
                    <div className="text-slate-600 mb-1 text-xs">{s.label}</div>
                    <div className={`font-bold text-${s.bg}-700 text-xs sm:text-sm`}>{s.val}</div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {calculations.map((calc, idx) => (
                <Card key={idx} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="bg-gradient-to-r from-blue-600 to-emerald-600 p-4 sm:p-5 text-white">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-base sm:text-lg">{calc.tahun}</h4>
                      <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${
                        calc.indikator.bor >= 60 && calc.indikator.bor <= 85 ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}></div>
                    </div>
                    <p className="text-xs sm:text-sm text-blue-200">Indikator Medis</p>
                  </div>
                  
                  <div className="p-3 sm:p-5 space-y-2 sm:space-y-3">
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <KPICard label="BOR" value={fmt.num(calc.indikator.bor) + '%'} 
                        isGood={calc.indikator.bor >= 60 && calc.indikator.bor <= 85} icon={BarChart3} />
                      <KPICard label="ALOS" value={fmt.num(calc.indikator.alos)} 
                        isGood={calc.indikator.alos >= 3 && calc.indikator.alos <= 6} icon={Activity} />
                      <KPICard label="BTO" value={fmt.num(calc.indikator.bto) + 'x'} 
                        isGood={calc.indikator.bto >= 40 && calc.indikator.bto <= 50} icon={TrendingUp} />
                      <KPICard label="TOI" value={fmt.num(calc.indikator.toi)} 
                        isGood={calc.indikator.toi >= 1 && calc.indikator.toi <= 3} icon={Calendar} />
                    </div>
                    
                    <div className="pt-2 sm:pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-200">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <DollarSign size={14} className="text-blue-600 flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-semibold text-slate-700">Revenue/Bed</span>
                        </div>
                        <span className="text-sm sm:text-lg font-bold text-blue-600 break-words text-right ml-2">{fmt.rupiah(calc.indikator.revenuePerBed)}</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 p-2 sm:p-3 rounded-lg border border-emerald-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-semibold text-slate-700">Total Pasien</span>
                        <span className="text-sm sm:text-lg font-bold text-emerald-700">{fmt.num(calc.indikator.totalPasien)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-4 sm:p-6">
              <h4 className="font-bold text-lg sm:text-xl text-slate-900 mb-3 sm:mb-4">Tren Pendapatan</h4>
              <div className="space-y-2 sm:space-y-3">
                {calculations.map((calc, idx) => {
                  const maxRevenue = Math.max(...calculations.map(c => c.total));
                  const percentage = (calc.total / maxRevenue) * 100;
                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-xs sm:text-sm mb-1">
                        <span className="font-semibold text-slate-700">{calc.tahun}</span>
                        <span className="font-bold text-blue-700 break-words text-right ml-2">{fmt.rupiah(calc.total)}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-5 sm:h-6">
                        <div
                          className="bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 h-5 sm:h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-bold transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        >
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

      </main>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 pb-safe z-50 shadow-lg">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 transition-all ${
                activeTab === item.id ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <div className={`p-2 rounded-lg transition-all ${
                activeTab === item.id ? 'bg-gradient-to-br from-blue-600 to-emerald-600 text-white' : 'bg-transparent'
              }`}>
                <item.icon size={18} />
              </div>
              <span className="text-xs font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default HospitalAnalytics;