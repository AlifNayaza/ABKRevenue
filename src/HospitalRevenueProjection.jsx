import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, Bed, Wallet, Activity, 
  ChevronDown, ChevronUp, PieChart, LayoutGrid, 
  Table2, ArrowLeft, ArrowUpRight,
  FileSpreadsheet, FileText, Calendar, Minus, Plus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- KOMPONEN UI KECIL (STYLING) ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden ${className}`}>
    {children}
  </div>
);

// StatCard Diperbarui untuk Menampilkan % Kenaikan/Penurunan
const StatCard = ({ title, value, subtext, trendLabel, trendValue, isPositive, onClick }) => (
  <div 
    onClick={onClick}
    className="p-5 rounded-2xl border bg-white border-slate-100 hover:border-slate-300 hover:shadow-md transition-all duration-300 cursor-pointer group"
  >
    <div className="flex justify-between items-start mb-2">
      <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
        {title}
      </p>
      {/* BADGE PERSENTASE KENAIKAN/PENURUNAN */}
      <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${
        isPositive 
          ? 'text-emerald-600 bg-emerald-50 border-emerald-100' 
          : 'text-rose-600 bg-rose-50 border-rose-100'
      }`}>
        <TrendingUp size={10} className={!isPositive ? 'rotate-180' : ''} /> 
        {trendLabel} {trendValue}
      </span>
    </div>
    
    <h3 className="text-2xl font-display font-bold text-slate-900 mb-1">
      {value}
    </h3>
    <span className="text-xs text-slate-500 font-medium">{subtext}</span>
  </div>
);

const InputField = ({ label, field, suffix, value, onChange, step = 1, min = 0 }) => (
  <div className="group">
    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 transition-colors group-focus-within:text-blue-600">
      {label}
    </label>
    <div className="relative flex items-center">
      <input 
        type="number" 
        value={value} 
        onChange={(e) => onChange(field, e.target.value)}
        step={step}
        min={min}
        className="w-full pl-0 pr-8 py-2 bg-transparent border-b-2 border-slate-200 text-slate-800 font-medium text-sm focus:border-blue-600 focus:outline-none transition-colors placeholder-slate-300"
        placeholder="0"
      />
      {suffix && <span className="absolute right-0 top-2 text-xs text-slate-400 font-medium">{suffix}</span>}
    </div>
  </div>
);

// --- KOMPONEN UTAMA ---

const ABKAnalytics = () => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedSection, setExpandedSection] = useState('mix'); 

  const [inputs, setInputs] = useState({
    // Waktu
    baseYear: new Date().getFullYear(),
    tahunProyeksi: 3, 
    growthRate: 8,

    // Kapasitas
    ttVIP: 10, ttKelas1: 20, ttKelas2: 30, ttKelas3: 40,
    // Target BOR
    borVIP: 60, borKelas1: 70, borKelas2: 75, borKelas3: 80,
    // ALOS
    alosVIP: 4, alosKelas1: 4, alosKelas2: 5, alosKelas3: 5,
    // Tarif Umum
    tarifVIP: 1500000, tarifKelas1: 800000, tarifKelas2: 500000, tarifKelas3: 300000,
    // BPJS
    pctBPJS: 65, tarifBPJS: 5000000,
    // Penunjang
    pctLab: 15, pctRadiologi: 10, pctFarmasi: 25, pctTindakan: 20
  });

  // --- LOGIC PERHITUNGAN ---
  const handleInputChange = (field, value) => {
    setInputs(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const adjustYear = (delta) => {
    setInputs(prev => ({ ...prev, baseYear: prev.baseYear + delta }));
  };

  const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  const formatNum = (num) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(num);

  const calculations = useMemo(() => {
    const results = [];
    let previousTotalRevenue = 0; 

    for (let year = 0; year <= inputs.tahunProyeksi; year++) {
      const growthFactor = Math.pow(1 + inputs.growthRate / 100, year);
      const currentYear = inputs.baseYear + year;
      
      const classes = [
        { name: 'VIP', tt: inputs.ttVIP, bor: inputs.borVIP, alos: inputs.alosVIP, tarif: inputs.tarifVIP },
        { name: 'Kelas 1', tt: inputs.ttKelas1, bor: inputs.borKelas1, alos: inputs.alosKelas1, tarif: inputs.tarifKelas1 },
        { name: 'Kelas 2', tt: inputs.ttKelas2, bor: inputs.borKelas2, alos: inputs.alosKelas2, tarif: inputs.tarifKelas2 },
        { name: 'Kelas 3', tt: inputs.ttKelas3, bor: inputs.borKelas3, alos: inputs.alosKelas3, tarif: inputs.tarifKelas3 }
      ];
      
      let totalRawatInap = 0;
      let totalHariRawat = 0;
      let totalPasien = 0;
      const classDetails = [];
      
      classes.forEach(cls => {
        const hariRawat = cls.tt * (cls.bor / 100) * 365;
        const jumlahPasien = hariRawat / cls.alos;
        const pasienBPJS = jumlahPasien * (inputs.pctBPJS / 100);
        const pasienUmum = jumlahPasien * (1 - inputs.pctBPJS / 100);
        
        const pendapatanBPJS = pasienBPJS * inputs.tarifBPJS;
        const pendapatanUmum = pasienUmum * cls.alos * cls.tarif;
        const pendapatanKelas = (pendapatanBPJS + pendapatanUmum) * growthFactor;
        
        totalRawatInap += pendapatanKelas;
        totalHariRawat += hariRawat;
        totalPasien += jumlahPasien;
        
        classDetails.push({
          kelas: cls.name, tt: cls.tt, bor: cls.bor,
          hariRawat: Math.round(hariRawat * growthFactor),
          jumlahPasien: Math.round(jumlahPasien * growthFactor),
          pendapatan: pendapatanKelas
        });
      });
      
      const penunjang = {
        lab: totalRawatInap * (inputs.pctLab / 100),
        radiologi: totalRawatInap * (inputs.pctRadiologi / 100),
        farmasi: totalRawatInap * (inputs.pctFarmasi / 100),
        tindakan: totalRawatInap * (inputs.pctTindakan / 100)
      };
      penunjang.total = Object.values(penunjang).reduce((a, b) => a + b, 0);
      
      const totalPendapatan = totalRawatInap + penunjang.total;
      
      // LOGIKA PERSENTASE KENAIKAN/PENURUNAN
      let actualGrowthPercent = 0;
      if (year > 0 && previousTotalRevenue > 0) {
        actualGrowthPercent = ((totalPendapatan - previousTotalRevenue) / previousTotalRevenue) * 100;
      }
      previousTotalRevenue = totalPendapatan;

      const totalTT = inputs.ttVIP + inputs.ttKelas1 + inputs.ttKelas2 + inputs.ttKelas3;
      const avgBOR = (totalHariRawat / (totalTT * 365)) * 100 * growthFactor;
      
      results.push({
        tahunLabel: year === 0 ? `${currentYear} (Dasar)` : `${currentYear}`,
        tahunAngka: currentYear,
        classDetails,
        rawatInap: totalRawatInap,
        penunjang,
        total: totalPendapatan,
        growthReal: actualGrowthPercent,
        indikator: {
          bor: avgBOR,
          alos: totalHariRawat / totalPasien,
          bto: (totalPasien * growthFactor) / totalTT,
          toi: (365 - (avgBOR / 100 * 365)) / ((totalPasien * growthFactor) / totalTT),
          revenuePerBed: totalPendapatan / totalTT
        }
      });
    }
    return results;
  }, [inputs]);

  // --- EKSPOR DATA ---
  const handleExport = (type) => {
    if (type === 'excel') {
      const wb = XLSX.utils.book_new();
      
      const summaryData = calculations.map(c => ({
        Tahun: c.tahunLabel,
        'Pendapatan Rawat Inap': c.rawatInap,
        'Pendapatan Penunjang': c.penunjang.total,
        'TOTAL PENDAPATAN': c.total,
        'Pertumbuhan (%)': c.growthReal.toFixed(2) + '%',
        'BOR (%)': c.indikator.bor,
        'ALOS (hari)': c.indikator.alos
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Ringkasan");

      let detailRows = [];
      calculations.forEach(c => {
        detailRows.push({ Kelas: `--- ${c.tahunLabel} ---` });
        c.classDetails.forEach(cls => {
          detailRows.push({
            Tahun: c.tahunLabel,
            Kelas: cls.kelas,
            'Tempat Tidur': cls.tt,
            'Hari Rawat': cls.hariRawat,
            'Jumlah Pasien': cls.jumlahPasien,
            'Pendapatan': cls.pendapatan
          });
        });
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), "Detail Per Kelas");
      
      XLSX.writeFile(wb, "ABK_Proyeksi_Keuangan.xlsx");
    } else {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Laporan Proyeksi Keuangan RS - ABK Financial", 14, 20);
      doc.setFontSize(10);
      doc.text(`Dibuat pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 26);
      
      const summaryBody = calculations.map(c => [
        c.tahunLabel,
        formatRupiah(c.rawatInap),
        formatRupiah(c.penunjang.total),
        formatRupiah(c.total),
        (c.growthReal >= 0 ? '+' : '') + c.growthReal.toFixed(2) + '%',
        formatNum(c.indikator.bor) + '%'
      ]);

      autoTable(doc, {
        startY: 35,
        head: [['Tahun', 'Rawat Inap', 'Penunjang', 'Total', 'Growth', 'BOR']],
        body: summaryBody,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] }
      });

      doc.text("Indikator Kinerja Medis", 14, doc.lastAutoTable.finalY + 15);
      
      const indBody = calculations.map(c => [
        c.tahunLabel,
        formatNum(c.indikator.alos),
        formatNum(c.indikator.bto),
        formatNum(c.indikator.toi),
        formatRupiah(c.indikator.revenuePerBed)
      ]);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Tahun', 'ALOS', 'BTO', 'TOI', 'Rev/Bed']],
        body: indBody,
        theme: 'striped'
      });

      doc.save("ABK_Laporan_Lengkap.pdf");
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'details', label: 'Tabel Detail', icon: Table2 },
    { id: 'analysis', label: 'Analisa', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 md:pb-0 font-body">
      
      {/* 1. TOP NAVBAR (DESKTOP) */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-white p-2 rounded-xl shadow-lg shadow-slate-900/20">
              <TrendingUp size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-slate-900 leading-tight">ABK</h1>
              <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Financial Intelligence</p>
            </div>
          </div>

          <div className="hidden md:flex bg-slate-100 p-1 rounded-lg">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === item.id 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <item.icon size={14} /> {item.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex gap-2">
             <button onClick={() => handleExport('excel')} className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-transparent">
                <FileSpreadsheet size={16} /> Excel
             </button>
             <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 text-xs font-bold text-white px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg shadow-lg shadow-slate-900/20 transition-all active:scale-95">
                <FileText size={16} /> Laporan PDF
             </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {activeTab !== 'dashboard' && (
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={18} /> Kembali ke Dashboard
          </button>
        )}
        
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* TAMPILAN DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* KIRI: PANEL INPUT */}
              <div className="lg:col-span-4 space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-display font-bold text-lg text-slate-800">Konfigurasi</h2>
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Auto-Simpan</span>
                </div>

                {[
                  { id: 'mix', title: 'Waktu & Pertumbuhan', icon: Calendar, type: 'custom' },
                  
                  { id: 'beds', title: 'Kapasitas TT', icon: Bed, type: 'fields', fields: [
                    {l:'TT VIP', k:'ttVIP'}, {l:'TT Kelas 1', k:'ttKelas1'},
                    {l:'TT Kelas 2', k:'ttKelas2'}, {l:'TT Kelas 3', k:'ttKelas3'}
                  ]},
                  { id: 'bor', title: 'Target BOR', icon: Activity, type: 'fields', fields: [
                    {l:'VIP %', k:'borVIP', s:'%'}, {l:'Kelas 1 %', k:'borKelas1', s:'%'},
                    {l:'Kelas 2 %', k:'borKelas2', s:'%'}, {l:'Kelas 3 %', k:'borKelas3', s:'%'}
                  ]},
                  { id: 'finance', title: 'Tarif & BPJS', icon: Wallet, type: 'fields', fields: [
                    {l:'Tarif VIP', k:'tarifVIP'}, {l:'Tarif K1', k:'tarifKelas1'},
                    {l:'INA-CBG', k:'tarifBPJS'}, {l:'Mix BPJS', k:'pctBPJS', s:'%'}
                  ]},
                ].map((group) => (
                  <Card key={group.id} className="transition-all duration-300">
                    <button 
                      onClick={() => setExpandedSection(expandedSection === group.id ? null : group.id)}
                      className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${expandedSection === group.id ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'}`}>
                          <group.icon size={18} />
                        </div>
                        <span className="font-semibold text-sm text-slate-700">{group.title}</span>
                      </div>
                      {expandedSection === group.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    
                    {expandedSection === group.id && (
                      <div className="p-4 pt-0 bg-white border-t border-slate-50/50 mt-2">
                        {group.type === 'fields' ? (
                          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                            {group.fields.map((f) => (
                              <InputField 
                                key={f.k} 
                                label={f.l} 
                                field={f.k} 
                                value={inputs[f.k]} 
                                onChange={handleInputChange} 
                                suffix={f.s} 
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* KONTROL TAHUN & DURASI */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Tahun Awal (Dasar)
                              </label>
                              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <button onClick={() => adjustYear(-1)} className="p-2 bg-white rounded-md shadow-sm hover:bg-slate-100 text-slate-600">
                                  <Minus size={16} />
                                </button>
                                <span className="flex-1 text-center font-bold text-lg text-slate-800 font-display">
                                  {inputs.baseYear}
                                </span>
                                <button onClick={() => adjustYear(1)} className="p-2 bg-white rounded-md shadow-sm hover:bg-slate-100 text-blue-600">
                                  <Plus size={16} />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                               <InputField 
                                  label="Durasi Proyeksi (Thn)" 
                                  field="tahunProyeksi" 
                                  value={inputs.tahunProyeksi} 
                                  onChange={handleInputChange} 
                                  min={1} 
                                  suffix="thn"
                               />
                               <InputField 
                                  label="Growth Rate" 
                                  field="growthRate" 
                                  value={inputs.growthRate} 
                                  onChange={handleInputChange} 
                                  suffix="%" 
                                  step={0.5}
                               />
                               <InputField label="Lab %" field="pctLab" value={inputs.pctLab} onChange={handleInputChange} suffix="%"/>
                               <InputField label="Rad %" field="pctRadiologi" value={inputs.pctRadiologi} onChange={handleInputChange} suffix="%"/>
                               <InputField label="Farmasi %" field="pctFarmasi" value={inputs.pctFarmasi} onChange={handleInputChange} suffix="%"/>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* KANAN: HASIL UTAMA */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Kartu Hero */}
                <div className="bg-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-2xl shadow-slate-900/30 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-32 bg-blue-500 rounded-full blur-[100px] opacity-20 group-hover:opacity-30 transition-opacity duration-700"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <p className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-1">Total Proyeksi Pendapatan</p>
                        <h2 className="text-3xl sm:text-5xl font-display font-bold text-white tracking-tight">
                          {formatRupiah(calculations[0].total)}
                        </h2>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium">
                        Tahun {calculations[0].tahunLabel}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-white/10">
                      <div>
                        <p className="text-slate-400 text-xs mb-1">Rawat Inap</p>
                        <p className="font-semibold text-sm sm:text-base">{formatRupiah(calculations[0].rawatInap)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs mb-1">Penunjang</p>
                        <p className="font-semibold text-sm sm:text-base">{formatRupiah(calculations[0].penunjang.total)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs mb-1">Rerata BOR</p>
                        <p className={`font-semibold text-sm sm:text-base ${calculations[0].indikator.bor >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {formatNum(calculations[0].indikator.bor)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs mb-1">Pasien/Tahun</p>
                        <p className="font-semibold text-sm sm:text-base">{formatNum(calculations[0].indikator.totalPasien || (calculations[0].rawatInap/1000000))}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kartu Pertumbuhan Tahunan */}
                <h3 className="font-display font-bold text-slate-800 text-lg pt-4">Tren Pertumbuhan</h3>
                
                {calculations.length > 1 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {calculations.slice(1).map((calc, idx) => {
                      const isPositive = calc.growthReal >= 0;
                      return (
                        <StatCard 
                          key={idx}
                          title={`TAHUN ${calc.tahunAngka}`}
                          value={formatRupiah(calc.total)}
                          subtext="vs Tahun Lalu"
                          // LOGIKA LABEL & WARNA
                          trendLabel={isPositive ? "Naik" : "Turun"}
                          trendValue={`${formatNum(Math.abs(calc.growthReal))}%`}
                          isPositive={isPositive}
                          onClick={() => {}} 
                        />
                      );
                    })}
                    <div 
                      onClick={() => setActiveTab('details')}
                      className="p-5 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-slate-100 transition-colors cursor-pointer group h-full min-h-[140px]"
                    >
                      <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                         <ArrowUpRight size={20} className="text-blue-600" />
                      </div>
                      <span className="text-sm font-semibold text-slate-600">Lihat Detail Lengkap</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500">
                    Tambahkan durasi proyeksi (lebih dari 1 tahun) untuk melihat tren pertumbuhan.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAMPILAN TABEL DETAIL */}
          {activeTab === 'details' && (
            <Card className="p-0">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
                <div>
                  <h3 className="font-display font-bold text-xl text-slate-900">Rincian Keuangan</h3>
                  <p className="text-sm text-slate-500">Proyeksi detail tahun ke tahun</p>
                </div>
                <div className="flex md:hidden gap-2 w-full sm:w-auto">
                    <button onClick={() => handleExport('excel')} className="flex-1 flex justify-center items-center gap-2 text-xs font-medium bg-slate-100 py-2 rounded-lg">
                        <FileSpreadsheet size={14} /> Excel
                    </button>
                    <button onClick={() => handleExport('pdf')} className="flex-1 flex justify-center items-center gap-2 text-xs font-medium bg-slate-100 py-2 rounded-lg">
                        <FileText size={14} /> PDF
                    </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-left">Periode</th>
                      <th className="px-6 py-4 text-right text-slate-700">Rawat Inap</th>
                      <th className="px-6 py-4 text-right">Penunjang</th>
                      <th className="px-6 py-4 text-right bg-slate-100 text-slate-600">Growth %</th>
                      <th className="px-6 py-4 text-right text-slate-900 bg-slate-50/50">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {calculations.map((row, idx) => {
                       const isPositive = row.growthReal >= 0;
                       return (
                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-6 py-4 font-semibold text-slate-900">{row.tahunLabel}</td>
                          <td className="px-6 py-4 text-right text-slate-600 font-medium">{formatRupiah(row.rawatInap)}</td>
                          <td className="px-6 py-4 text-right text-slate-500">{formatRupiah(row.penunjang.total)}</td>
                          <td className={`px-6 py-4 text-right font-bold ${isPositive ? 'text-emerald-600 bg-emerald-50/30' : 'text-rose-600 bg-rose-50/30'}`}>
                            {idx === 0 ? '-' : `${isPositive ? '+' : ''}${formatNum(row.growthReal)}%`}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-900 bg-slate-50/30 group-hover:bg-blue-50/50">{formatRupiah(row.total)}</td>
                        </tr>
                       );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAMPILAN ANALISA KPI */}
          {activeTab === 'analysis' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {calculations.map((calc, idx) => (
                  <Card key={idx} className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-display font-bold text-lg text-slate-900">KPI {calc.tahunLabel}</h3>
                      <div className={`h-2 w-2 rounded-full ${calc.indikator.bor >= 60 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { l: 'Bed Occupancy (BOR)', v: formatNum(calc.indikator.bor) + '%', ok: calc.indikator.bor >= 60 },
                        { l: 'ALOS (Hari)', v: formatNum(calc.indikator.alos), ok: calc.indikator.alos >= 3 && calc.indikator.alos <= 6 },
                        { l: 'Bed Turnover (BTO)', v: formatNum(calc.indikator.bto) + 'x', ok: true },
                        { l: 'Rev/Bed', v: formatRupiah(calc.indikator.revenuePerBed).split(',')[0], ok: true }
                      ].map((kpi, i) => (
                        <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">{kpi.l}</p>
                          <p className={`text-lg font-bold ${kpi.ok ? 'text-slate-800' : 'text-amber-500'}`}>{kpi.v}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
             </div>
          )}

        </div>
      </main>

      {/* 3. MOBILE BOTTOM NAVIGATION */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 pb-6 z-40 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === item.id ? 'text-slate-900' : 'text-slate-300 hover:text-slate-500'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${activeTab === item.id ? 'bg-slate-100' : 'bg-transparent'}`}>
              <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-medium ${activeTab === item.id ? 'text-slate-900' : 'text-transparent h-0 overflow-hidden'}`}>{item.label}</span>
          </button>
        ))}
      </div>

    </div>
  );
};

export default ABKAnalytics;