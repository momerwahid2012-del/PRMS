
import React, { useState, useEffect } from 'react';
import { db } from '../services/storage';
import { Room, RoomStatus, RoomType, UserRole } from '../types';
import { COLORS, ROOM_TYPES, ROOM_STATUSES, CURRENCY } from '../constants';

interface Props {
  onAction: (msg: string, type?: 'success' | 'warning' | 'info') => void;
  onOpenPaymentModal: (roomId: string) => void;
}

const RoomManagement: React.FC<Props> = ({ onAction, onOpenPaymentModal }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Room>>({
    roomNumber: '',
    type: RoomType.SINGLE,
    status: RoomStatus.AVAILABLE,
    floor: '',
    building: '',
    monthlyRent: 0,
    monthlyExpenses: 0,
    targetCollection: 0,
    minCollection: 0,
    isOpenEnded: false
  });

  const [bulkFormData, setBulkFormData] = useState<Partial<Room>>({
    status: RoomStatus.AVAILABLE
  });

  const user = db.getCurrentUser();
  const isAdmin = user?.role === UserRole.ADMIN;
  const canMove = isAdmin || user?.permissions.canMoveTenants;
  const canPay = isAdmin || user?.permissions.canAddPayments;

  useEffect(() => {
    setRooms(db.getRooms());
  }, []);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(rooms.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    
    if (!isAdmin && !canMove && editingRoom) {
      setErrorMsg("Error 403: Unauthorized to modify units.");
      onAction("Error 403: Unauthorized action", "warning");
      return;
    }

    if (formData.monthlyRent && formData.monthlyRent > 9999) {
      setErrorMsg("Error 422: Rent cannot exceed 9,999 AED.");
      onAction("Error 422: Amount limit exceeded", "warning");
      return;
    }

    if (formData.status === RoomStatus.OCCUPIED && !formData.occupancyStartDate) {
      setErrorMsg("Error 422: Occupancy date is required.");
      onAction("Error 422: Missing data", "warning");
      return;
    }

    try {
      if (editingRoom) {
        db.updateRoom(editingRoom.id, formData);
        onAction(`Success: Unit ${formData.roomNumber} updated`);
      } else {
        db.addRoom(formData as any);
        onAction(`Success: Unit ${formData.roomNumber} registered`);
      }
      setShowModal(false);
      setRooms(db.getRooms());
    } catch (err: any) {
      setErrorMsg(`Error 500: ${err.message}`);
      onAction(`Error 500: ${err.message}`, "warning");
    }
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    try {
      db.bulkUpdateRooms(selectedIds, bulkFormData);
      onAction(`Success: ${selectedIds.length} units updated in bulk`);
      setShowBulkModal(false);
      setSelectedIds([]);
      setRooms(db.getRooms());
    } catch (err) {
      onAction("Error 500: Bulk update failed", "warning");
    }
  };

  const getProjection = (room: Partial<Room>) => {
    const revenue = room.status === RoomStatus.OCCUPIED ? (room.monthlyRent || 0) : 0;
    const expense = room.monthlyExpenses || 0;
    return revenue - expense;
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 px-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory Summary</h1>
          <p className="text-xs text-slate-500 font-medium">Quick overview of status and financial projections.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          {selectedIds.length > 0 && isAdmin && (
            <button onClick={() => setShowBulkModal(true)} className="flex-1 sm:flex-none bg-amber-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2">
              <i className="fas fa-layer-group"></i> Bulk Actions
            </button>
          )}
          {isAdmin && (
            <button onClick={() => { setEditingRoom(null); setFormData({ roomNumber: '', type: RoomType.SINGLE, status: RoomStatus.AVAILABLE, floor: '', building: '', monthlyRent: 0, monthlyExpenses: 0, targetCollection: 0, minCollection: 0, isOpenEnded: false }); setShowModal(true); setErrorMsg(null); onAction("Success: Initialized unit creator"); }} className="flex-1 sm:flex-none bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg">
              Add Room
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col relative min-h-[400px]">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="px-6 py-5 w-10">
                  <input type="checkbox" checked={selectedIds.length === rooms.length && rooms.length > 0} onChange={handleSelectAll} className="w-4 h-4 rounded border-slate-300" />
                </th>
                <th className="px-6 py-5">Unit Info</th>
                <th className="px-6 py-5 text-center">Projection</th>
                <th className="px-6 py-5">Location</th>
                {isAdmin && <th className="px-6 py-5 text-center">Target / Min</th>}
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {rooms.map(room => {
                const projection = getProjection(room);
                return (
                  <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-5">
                      <input type="checkbox" checked={selectedIds.includes(room.id)} onChange={() => handleSelectOne(room.id)} className="w-4 h-4 rounded border-slate-300" />
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-800">Unit {room.roomNumber}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${COLORS[room.status]}`}>{room.status}</span>
                    </td>
                    <td className="px-6 py-5 text-center font-black">
                      <span className={projection >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{CURRENCY} {projection.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-5 text-slate-500 font-medium">{room.building}, Floor {room.floor}</td>
                    {isAdmin && (
                      <td className="px-6 py-5 text-center text-[10px] font-black uppercase text-slate-400">
                        T: {room.targetCollection} / M: {room.minCollection}
                      </td>
                    )}
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1">
                        {canPay && room.status === RoomStatus.OCCUPIED && <button onClick={() => { onOpenPaymentModal(room.id); onAction(`Success: Opened ledger for ${room.roomNumber}`); }} className="text-[#049669] p-2 hover:bg-emerald-50 rounded-lg"><i className="fas fa-money-bill-1-wave"></i></button>}
                        {canMove && <button onClick={() => { setEditingRoom(room); setFormData(room); setShowModal(true); setErrorMsg(null); onAction(`Success: Editing ${room.roomNumber}`); }} className="text-slate-400 p-2 hover:bg-indigo-50 rounded-lg"><i className="fas fa-edit"></i></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-xl p-10 shadow-2xl animate-in zoom-in duration-200 my-8">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-3xl font-bold text-slate-800 tracking-tight">Unit Configuration</h3>
               <button onClick={() => { setShowModal(false); onAction("Success: Form closed"); }} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times text-2xl"></i></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Room Number</label>
                  <input required placeholder="e.g. 101" className="w-full border border-slate-200 p-4 rounded-2xl outline-none focus:border-indigo-500 font-bold" value={formData.roomNumber} onChange={e => setFormData({...formData, roomNumber: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Monthly Expenses ({CURRENCY})</label>
                  <input required type="number" step="0.01" className="w-full border border-slate-200 p-4 rounded-2xl outline-none focus:border-indigo-500 font-bold" value={formData.monthlyExpenses} onChange={e => setFormData({...formData, monthlyExpenses: parseFloat(e.target.value) || 0})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Monthly Rent ({CURRENCY} - Max 9,999)</label>
                  <input required type="number" step="0.01" max="9999" placeholder="0.00" className="w-full border border-slate-200 p-4 rounded-2xl outline-none focus:border-indigo-500 font-bold" value={formData.monthlyRent || ''} onChange={e => setFormData({...formData, monthlyRent: Math.min(9999, parseFloat(e.target.value) || 0)})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Status</label>
                  <select className="w-full border border-slate-200 p-4 rounded-2xl outline-none focus:border-indigo-500 font-bold" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                    {ROOM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-[#0f172a] rounded-2xl p-6 text-white shadow-xl flex justify-between items-center overflow-hidden relative">
                 <div className="relative z-10">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Financial Projection</p>
                    <p className={`text-4xl font-black ${getProjection(formData) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {getProjection(formData) >= 0 ? '+' : ''}{CURRENCY} {getProjection(formData).toLocaleString()}
                    </p>
                 </div>
                 <div className="text-right text-[10px] font-black text-slate-500 uppercase tracking-widest leading-loose relative z-10">
                    <p>Rent: +{formData.monthlyRent || 0}</p>
                    <p>Exp: -{formData.monthlyExpenses || 0}</p>
                 </div>
              </div>

              {isAdmin && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Collection</label>
                    <input type="number" className="w-full border border-slate-200 p-4 rounded-2xl outline-none font-bold" value={formData.targetCollection} onChange={e => setFormData({...formData, targetCollection: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Min. Collection</label>
                    <input type="number" className="w-full border border-slate-200 p-4 rounded-2xl outline-none font-bold" value={formData.minCollection} onChange={e => setFormData({...formData, minCollection: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <input required placeholder="Building" className="w-full border p-4 rounded-2xl" value={formData.building} onChange={e => setFormData({...formData, building: e.target.value})} />
                <input required placeholder="Floor" className="w-full border p-4 rounded-2xl" value={formData.floor} onChange={e => setFormData({...formData, floor: e.target.value})} />
              </div>

              {formData.status === RoomStatus.OCCUPIED && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-2">
                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest pl-1">Occupancy Start Date</label>
                  <input required type="date" className="w-full border p-3 rounded-xl" value={formData.occupancyStartDate || ''} onChange={e => setFormData({...formData, occupancyStartDate: e.target.value})} />
                </div>
              )}

              {errorMsg && <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-black uppercase rounded-2xl">{errorMsg}</div>}

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => { setShowModal(false); onAction("Success: Cancelled unit changes"); }} className="flex-1 border py-4 rounded-2xl font-bold text-slate-500">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold">Save Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-2xl font-black text-slate-800 mb-6 uppercase">Bulk Control ({selectedIds.length} Units)</h3>
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <select className="w-full border p-4 rounded-2xl font-bold" value={bulkFormData.status} onChange={e => setBulkFormData({...bulkFormData, status: e.target.value as any})}>
                {ROOM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => { setShowBulkModal(false); onAction("Success: Discarded bulk changes"); }} className="flex-1 border py-3 rounded-xl font-bold text-slate-500">Cancel</button>
                <button type="submit" className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold">Apply Bulk Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomManagement;
