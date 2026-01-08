
import React, { useState, useEffect } from 'react';
import { db } from '../services/storage';
import { CURRENCY, ROOM_TYPES } from '../constants';
import { Room, RoomStatus } from '../types';

const Reports: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Customization state
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(["Room", "Type", "Status", "Rent", "Expenses", "Net P/L"]);

  useEffect(() => {
    const all = db.getRooms();
    setRooms(all);
    setSelectedRooms(all.map(r => r.id));
  }, []);

  const columns = [
    { id: "Room", label: "Room #" },
    { id: "Type", label: "Room Type" },
    { id: "Status", label: "Status" },
    { id: "Building", label: "Building" },
    { id: "Floor", label: "Floor" },
    { id: "Rent", label: "Monthly Rent" },
    { id: "Expenses", label: "Monthly Expenses" },
    { id: "Net P/L", label: "Net Projection" },
    { id: "Balance", label: "Balance Due" },
  ];

  const toggleColumn = (id: string) => {
    setSelectedColumns(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleRoom = (id: string) => {
    setSelectedRooms(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleSelectAllRooms = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedRooms(e.target.checked ? rooms.map(r => r.id) : []);
  };

  const getFilteredData = () => {
    return rooms.filter(r => selectedRooms.includes(r.id)).map(r => {
      const data: any = {};
      if (selectedColumns.includes("Room")) data["Room"] = r.roomNumber;
      if (selectedColumns.includes("Type")) data["Type"] = r.type;
      if (selectedColumns.includes("Status")) data["Status"] = r.status;
      if (selectedColumns.includes("Building")) data["Building"] = r.building;
      if (selectedColumns.includes("Floor")) data["Floor"] = r.floor;
      if (selectedColumns.includes("Rent")) data["Rent"] = r.monthlyRent;
      if (selectedColumns.includes("Expenses")) data["Expenses"] = r.monthlyExpenses || 0;
      if (selectedColumns.includes("Net P/L")) data["Net P/L"] = (r.status === RoomStatus.OCCUPIED ? r.monthlyRent : 0) - (r.monthlyExpenses || 0);
      if (selectedColumns.includes("Balance")) data["Balance"] = r.currentBalance;
      return data;
    });
  };

  const handleDownload = () => {
    const data = getFilteredData();
    if (data.length === 0) return;
    
    const headers = selectedColumns.filter(c => columns.some(col => col.id === c));
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(h => row[h]).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.body.appendChild(document.createElement("a"));
    link.href = URL.createObjectURL(blob);
    link.download = `RMS_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setShowExportModal(false);
  };

  const totalAssetValue = rooms.reduce((acc, r) => acc + r.monthlyRent, 0);
  const totalMonthlyExpenses = rooms.reduce((acc, r) => acc + (r.monthlyExpenses || 0), 0);
  const activeContracts = rooms.filter(r => r.status === RoomStatus.OCCUPIED).length;
  const currentMonthlyRevenue = rooms.filter(r => r.status === RoomStatus.OCCUPIED).reduce((acc, r) => acc + r.monthlyRent, 0);
  const netMonthlyProfit = currentMonthlyRevenue - totalMonthlyExpenses;

  const previewData = getFilteredData().slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analytics & Reports</h1>
          <p className="text-slate-500 text-sm">Real-time analysis including fixed monthly expenses.</p>
        </div>
        <button 
          onClick={() => setShowExportModal(true)} 
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
        >
          <i className="fas fa-file-export"></i> Custom Export Financials
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <i className="fas fa-chart-line text-emerald-500"></i> Monthly Profit Breakdown
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                   <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Total Revenue</p>
                   <p className="text-xl font-black text-emerald-800">{CURRENCY} {currentMonthlyRevenue.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                   <p className="text-[10px] font-black text-rose-600 uppercase mb-1">Total Fixed Expenses</p>
                   <p className="text-xl font-black text-rose-800">{CURRENCY} {totalMonthlyExpenses.toLocaleString()}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-end">
                   <div>
                     <p className="text-sm font-bold text-slate-500">Net Monthly Profit</p>
                     <p className={`text-3xl font-black ${netMonthlyProfit >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                       {CURRENCY} {netMonthlyProfit.toLocaleString()}
                     </p>
                   </div>
                   <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${netMonthlyProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {netMonthlyProfit >= 0 ? 'Surplus' : 'Deficit'}
                      </span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-slate-900 text-white p-6 shadow-xl border border-slate-800">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 border-b border-slate-800 pb-2">Portfolio Metrics</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Asset Valuation</span>
                <span className="font-black text-lg">{CURRENCY} {totalAssetValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Occupied Units</span>
                <span className="font-black text-lg text-emerald-400">{activeContracts}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Total Expense Load</span>
                <span className="font-black text-lg text-rose-400">{CURRENCY} {totalMonthlyExpenses.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Customization Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] p-6 shadow-2xl animate-in zoom-in duration-200 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Customize Financial Export</h2>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times text-xl"></i></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto mb-6 pr-2">
               {/* Step 1: Columns */}
               <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">1. Select Columns</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {columns.map(col => (
                      <button 
                        key={col.id}
                        onClick={() => toggleColumn(col.id)}
                        className={`p-3 rounded-xl border text-sm font-bold flex items-center gap-2 transition-all ${selectedColumns.includes(col.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                      >
                        <i className={`fas ${selectedColumns.includes(col.id) ? 'fa-check-circle' : 'fa-circle-notch opacity-20'}`}></i>
                        {col.label}
                      </button>
                    ))}
                  </div>
               </div>

               {/* Step 2: Rooms */}
               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">2. Select Units</h4>
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 cursor-pointer">
                      <input type="checkbox" checked={selectedRooms.length === rooms.length} onChange={handleSelectAllRooms} />
                      SELECT ALL
                    </label>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto border p-3 rounded-xl bg-slate-50">
                    {rooms.map(room => (
                      <button 
                        key={room.id}
                        onClick={() => toggleRoom(room.id)}
                        className={`px-2 py-1.5 rounded-lg border text-[10px] font-black transition-all ${selectedRooms.includes(room.id) ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-500 border-slate-200'}`}
                      >
                        {room.roomNumber}
                      </button>
                    ))}
                  </div>
               </div>

               {/* Step 3: Preview */}
               <div className="col-span-full space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">3. Preview (Excel/CSV View)</h4>
                  <div className="overflow-x-auto border rounded-xl shadow-inner bg-slate-50">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-200 font-bold text-slate-700">
                        <tr>
                          {selectedColumns.map(c => <th key={c} className="px-4 py-2 border-r last:border-0 border-slate-300">{c}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y border-slate-300">
                         {previewData.map((row, idx) => (
                           <tr key={idx} className="bg-white">
                             {selectedColumns.map(c => <td key={c} className="px-4 py-2 border-r last:border-0 border-slate-200 text-slate-500">{row[c]}</td>)}
                           </tr>
                         ))}
                         {getFilteredData().length > 5 && (
                           <tr className="bg-slate-50 italic text-slate-400">
                             <td colSpan={selectedColumns.length} className="px-4 py-1 text-center">... and {getFilteredData().length - 5} more rows</td>
                           </tr>
                         )}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>

            <div className="flex gap-4 mt-auto pt-6 border-t">
               <button onClick={() => setShowExportModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
               <button 
                onClick={handleDownload}
                disabled={selectedRooms.length === 0 || selectedColumns.length === 0}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all disabled:opacity-50 disabled:grayscale"
               >
                 <i className="fas fa-download mr-2"></i> Download CSV (.xls compatible)
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
