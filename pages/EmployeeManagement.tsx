
import React, { useState, useEffect } from 'react';
import { db } from '../services/storage';
import { User, Room, RoomAssignment, UserPermissions, UserRole } from '../types';
import { CURRENCY } from '../constants';

interface Props {
  onAction: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

const EmployeeManagement: React.FC<Props> = ({ onAction }) => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [assignments, setAssignments] = useState<RoomAssignment[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [empToDelete, setEmpToDelete] = useState<User | null>(null);
  
  const [newEmp, setNewEmp] = useState({ fullName: '', username: '', password: '', email: '' });
  const [targetForm, setTargetForm] = useState({ minAmount: 0, targetAmount: 0, dailyTarget: 0, coins: 0 });
  const [credsForm, setCredsForm] = useState({ username: '', password: '' });

  const adminUser = db.getCurrentUser();
  const isAdmin = adminUser?.role === UserRole.ADMIN;

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const emps = db.getEmployees();
    setEmployees(emps);
    setRooms(db.get<Room[]>('rms_rooms', []));
    setAssignments(db.getAssignments());
    
    if (selectedEmpId) {
      const selected = emps.find(e => e.id === selectedEmpId);
      if (selected) {
        setTargetForm({
          minAmount: selected.minAmount || 0,
          targetAmount: selected.targetAmount || 0,
          dailyTarget: selected.dailyTarget || 0,
          coins: selected.coins || 0
        });
        setCredsForm({
          username: selected.username || '',
          password: selected.password || ''
        });
      }
    }
  };

  const handleUpdateEmpStats = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;
    try {
      db.updateEmployee(selectedEmpId, {
        minAmount: targetForm.minAmount,
        targetAmount: targetForm.targetAmount,
        dailyTarget: targetForm.dailyTarget,
        coins: targetForm.coins
      });
      onAction("Success 200: Performance targets updated");
      refreshData();
    } catch (err) {
      onAction("Error 500: Failed to update targets", "warning");
    }
  };

  const handleUpdateCreds = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !isAdmin) return;
    try {
      db.updateEmployee(selectedEmpId, {
        username: credsForm.username,
        password: credsForm.password
      });
      onAction("Success 200: Staff credentials updated");
      refreshData();
    } catch (err) {
      onAction("Error 500: Failed to update credentials", "warning");
    }
  };

  const handlePermissionToggle = (key: keyof UserPermissions) => {
    if (!selectedEmpId) return;
    const emp = employees.find(e => e.id === selectedEmpId);
    if (!emp) return;
    const newPerms = { ...emp.permissions, [key]: !emp.permissions[key] };
    db.updateEmployee(selectedEmpId, { permissions: newPerms });
    onAction(`Success 200: Permission ${key} toggled`);
    refreshData();
  };

  const handleAllowAllPermissions = () => {
    if (!selectedEmpId) return;
    const allPerms: UserPermissions = {
      canMoveTenants: true,
      canViewPayments: true,
      canAddPayments: true,
      canEditPayments: true
    };
    db.updateEmployee(selectedEmpId, { permissions: allPerms });
    onAction("Success 200: All permissions granted");
    refreshData();
  };

  const handleRoomToggle = (roomId: string) => {
    if (!selectedEmpId) return;
    db.toggleAssignment(selectedEmpId, roomId);
    setAssignments(db.getAssignments());
    onAction("Success 200: Unit access updated");
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      db.addEmployee({
        ...newEmp,
        role: UserRole.EMPLOYEE,
        permissions: { 
          canMoveTenants: false, 
          canViewPayments: true, 
          canAddPayments: false, 
          canEditPayments: false 
        }
      });
      onAction(`Success 201: ${newEmp.fullName} registered`);
      setShowAddModal(false);
      setNewEmp({ fullName: '', username: '', password: '', email: '' });
      refreshData();
    } catch (err) {
      onAction("Error 422: Registration failed", "warning");
    }
  };

  const confirmDelete = (e: React.MouseEvent, emp: User) => {
    e.stopPropagation();
    e.preventDefault();
    setEmpToDelete(emp);
    setShowDeleteModal(true);
  };

  const executeDelete = () => {
    if (!empToDelete) return;
    try {
      db.deleteEmployee(empToDelete.id);
      onAction(`Success 200: ${empToDelete.fullName} removed from system`);
      if (selectedEmpId === empToDelete.id) setSelectedEmpId(null);
      setShowDeleteModal(false);
      setEmpToDelete(null);
      refreshData();
    } catch (err) {
      onAction("Error 500: Deletion failed", "warning");
    }
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmpId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Staff Management</h1>
          <p className="text-slate-500 text-sm">Configure granular access levels and individual performance targets.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
        >
          <i className="fas fa-user-plus"></i> Add New Personnel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[600px]">
            <div className="bg-slate-50 px-4 py-3 border-b flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Members</span>
              <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded">{employees.length}</span>
            </div>
            <div className="divide-y overflow-y-auto flex-1 custom-scrollbar">
              {employees.length === 0 ? (
                <div className="p-12 text-center text-slate-400 italic text-sm">No personnel registered yet.</div>
              ) : employees.map(emp => (
                <div
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmpId(emp.id);
                    setTargetForm({ 
                      minAmount: emp.minAmount || 0, 
                      targetAmount: emp.targetAmount || 0, 
                      dailyTarget: emp.dailyTarget || 0,
                      coins: emp.coins || 0 
                    });
                    setCredsForm({
                      username: emp.username || '',
                      password: emp.password || ''
                    });
                    onAction(`Success 200: Selected ${emp.fullName}`);
                  }}
                  className={`w-full flex items-center justify-between p-4 text-left transition-all group cursor-pointer ${selectedEmpId === emp.id ? 'bg-indigo-50/50 border-r-4 border-indigo-500' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center font-black transition-transform ${selectedEmpId === emp.id ? 'bg-indigo-600 text-white scale-105' : 'bg-slate-100 text-slate-500'}`}>
                      {emp.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${selectedEmpId === emp.id ? 'text-indigo-900' : 'text-slate-800'}`}>{emp.fullName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${emp.coins >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          <i className={`fas ${emp.coins >= 0 ? 'fa-coins' : 'fa-circle-minus'}`}></i>
                          {emp.coins}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">@{emp.username}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => confirmDelete(e, emp)}
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {selectedEmployee ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 overflow-hidden relative">
                <div className="flex items-center gap-6 relative z-10">
                   <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black border border-white/20">
                     {selectedEmployee.fullName.charAt(0)}
                   </div>
                   <div>
                     <h3 className="text-2xl font-black tracking-tight">{selectedEmployee.fullName}</h3>
                     <p className="text-indigo-100 text-sm font-medium">Staff Account Active</p>
                   </div>
                </div>
              </div>

              {isAdmin && (
                <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <i className="fas fa-user-shield text-rose-500"></i> Access Credentials (Admin Only)
                  </h3>
                  <form onSubmit={handleUpdateCreds} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase block pl-1">Login Username</label>
                      <input 
                        type="text" 
                        className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none font-bold" 
                        value={credsForm.username} 
                        onChange={e => setCredsForm({...credsForm, username: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase block pl-1">Login Password</label>
                      <input 
                        type="text" 
                        className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none font-bold" 
                        value={credsForm.password} 
                        onChange={e => setCredsForm({...credsForm, password: e.target.value})} 
                      />
                    </div>
                    <button type="submit" className="md:col-span-2 bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest mt-2 hover:bg-slate-800 transition-all">
                      Update Credentials
                    </button>
                  </form>
                </div>
              )}

              <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <i className="fas fa-key text-indigo-500"></i> Access Rights
                  </h3>
                  <button onClick={handleAllowAllPermissions} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase hover:bg-indigo-100">Allow All (Bulk)</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PermissionToggle label="Move Tenants" description="Reassign rooms/units" enabled={selectedEmployee.permissions.canMoveTenants} onToggle={() => handlePermissionToggle('canMoveTenants')} />
                  <PermissionToggle label="View Financials" description="See balance and payment history" enabled={selectedEmployee.permissions.canViewPayments} onToggle={() => handlePermissionToggle('canViewPayments')} />
                  <PermissionToggle label="Record Payments" description="Collect rent and record" enabled={selectedEmployee.permissions.canAddPayments} onToggle={() => handlePermissionToggle('canAddPayments')} />
                  <PermissionToggle label="Edit Payments" description="Modify recorded transactions" enabled={selectedEmployee.permissions.canEditPayments} onToggle={() => handlePermissionToggle('canEditPayments')} />
                </div>
              </div>

              <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <i className="fas fa-door-open text-indigo-500"></i> Unit Access
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  {rooms.map(room => {
                    const isAssigned = assignments.some(a => a.userId === selectedEmpId && a.roomId === room.id && a.isEnabled);
                    return (
                      <button key={room.id} onClick={() => handleRoomToggle(room.id)} className={`p-2 rounded-xl border text-[10px] font-black uppercase transition-all ${isAssigned ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                        {room.roomNumber}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <i className="fas fa-chart-line text-emerald-500"></i> Collection Targets
                </h3>
                <form onSubmit={handleUpdateEmpStats} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase block pl-1">Daily Target</label>
                      <input type="number" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:border-indigo-500 font-bold" value={targetForm.dailyTarget} onChange={e => setTargetForm({...targetForm, dailyTarget: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase block pl-1">Min. Monthly</label>
                      <input type="number" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:border-indigo-500 font-bold" value={targetForm.minAmount} onChange={e => setTargetForm({...targetForm, minAmount: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase block pl-1">Target Monthly</label>
                      <input type="number" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:border-indigo-500 font-bold" value={targetForm.targetAmount} onChange={e => setTargetForm({...targetForm, targetAmount: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase block pl-1">Coins</label>
                      <input type="number" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:border-indigo-500 font-black text-indigo-600" value={targetForm.coins} onChange={e => setTargetForm({...targetForm, coins: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]">
                    <i className="fas fa-save"></i> Save Target Changes
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="h-[600px] flex flex-col items-center justify-center p-12 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 text-center">
              <i className="fas fa-user-cog text-4xl mb-6"></i>
              <h3 className="text-xl font-bold text-slate-800">Staff Inspector</h3>
              <p className="max-w-xs mx-auto text-sm">Select a staff member to configure their settings.</p>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-200 my-8">
            <h2 className="text-2xl font-black text-slate-800 mb-6">Register Staff</h2>
            <form onSubmit={handleAddEmployee} className="space-y-5">
              <input required placeholder="Full Name" className="w-full border p-3.5 rounded-xl outline-none" value={newEmp.fullName} onChange={e => setNewEmp({...newEmp, fullName: e.target.value})} />
              <input required placeholder="Username" className="w-full border p-3.5 rounded-xl outline-none" value={newEmp.username} onChange={e => setNewEmp({...newEmp, username: e.target.value})} />
              <input required type="password" placeholder="Password" className="w-full border p-3.5 rounded-xl outline-none" value={newEmp.password} onChange={e => setNewEmp({...newEmp, password: e.target.value})} />
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => { setShowAddModal(false); onAction("Success 200: Action cancelled"); }} className="flex-1 border py-3.5 rounded-2xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-3.5 rounded-2xl font-bold">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && empToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in duration-300 border border-slate-100">
             <div className="h-20 w-20 rounded-3xl bg-rose-50 flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-user-slash text-3xl text-rose-500"></i>
             </div>
             <div className="text-center mb-10">
               <h2 className="text-2xl font-black text-slate-800 mb-2">Confirm Termination</h2>
               <p className="text-slate-500 text-sm">Are you sure you want to remove <span className="font-black text-slate-800">{empToDelete.fullName}</span> from the system? This action is permanent and will revoke all access immediately.</p>
             </div>
             <div className="flex flex-col gap-3">
                <button 
                  onClick={executeDelete} 
                  className="w-full bg-rose-500 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-600 transition-all active:scale-95"
                >
                  Confirm Delete
                </button>
                <button 
                  onClick={() => { setShowDeleteModal(false); setEmpToDelete(null); }} 
                  className="w-full bg-slate-50 text-slate-400 py-4 rounded-3xl font-bold text-sm hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PermissionToggle = ({ label, description, enabled, onToggle }: { label: string, description: string, enabled: boolean, onToggle: () => void }) => (
  <div onClick={onToggle} className={`p-4 border rounded-2xl flex items-center justify-between cursor-pointer transition-colors ${enabled ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
    <div>
      <p className="text-sm font-bold">{label}</p>
      <p className="text-[10px] text-slate-400">{description}</p>
    </div>
    <div className={`w-10 h-5 rounded-full relative transition-colors ${enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-5.5' : 'translate-x-0.5'}`}></div>
    </div>
  </div>
);

export default EmployeeManagement;
