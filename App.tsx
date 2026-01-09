
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import RoomManagement from './pages/RoomManagement';
import EmployeeManagement from './pages/EmployeeManagement';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Feedback from './pages/Feedback';
import NotificationToast from './components/NotificationToast';
import { db } from './services/storage';
import { User, Notification } from './types';
import { CURRENCY } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState<Notification | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ roomId: '', amount: '' });
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Memoized refresh to prevent unnecessary re-renders
  const refreshUserData = useCallback(() => {
    const updatedUser = db.getCurrentUser();
    setUser(updatedUser);
  }, []);

  useEffect(() => {
    refreshUserData();

    // Listen for local database updates
    const handleDbUpdate = (e: any) => {
      refreshUserData();
    };

    // Listen for cross-tab storage changes
    const handleStorageChange = (e: StorageEvent) => {
      refreshUserData();
    };

    window.addEventListener(db.UPDATE_EVENT as any, handleDbUpdate);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener(db.UPDATE_EVENT as any, handleDbUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshUserData]);

  const handleLoginSuccess = () => {
    setUser(db.getCurrentUser());
    setActiveTab('dashboard');
    triggerNotification("Successfully verified: Login confirmed");
  };

  const handleLogout = () => {
    db.logout();
    setUser(null);
  };

  const triggerNotification = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setNotification({ id: Date.now().toString(), message, type });
  };

  const openPaymentModalWithRoom = (roomId: string) => {
    setPaymentForm({ roomId, amount: '' });
    setPaymentError(null);
    setShowPaymentModal(true);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    try {
      const amount = parseFloat(paymentForm.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Error 422: Enter a valid collection amount");
      }
      if (amount > 9999) {
        setPaymentError("Error 422: Maximum payment limit is 9,999 AED.");
        triggerNotification("Error 422: Payment limit exceeded", "warning");
        return;
      }
      if (!paymentForm.roomId) throw new Error("Error 422: Select a valid room unit");

      db.addPayment({ roomId: paymentForm.roomId, amount, status: 'Paid' });
      triggerNotification(`Successfully verified: Payment recorded`);
      setShowPaymentModal(false);
      setPaymentForm({ roomId: '', amount: '' });
      // Explicitly refresh after action
      refreshUserData();
    } catch (e: any) {
      setPaymentError(e.message);
      triggerNotification(e.message, "warning");
    }
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'rooms':
        return <RoomManagement onAction={triggerNotification} onOpenPaymentModal={openPaymentModalWithRoom} />;
      case 'employees':
        return <EmployeeManagement onAction={triggerNotification} />;
      case 'reports':
        return <Reports />;
      case 'feedback':
        return <Feedback />;
      case 'logs':
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Operational Log</h1>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Operator</th>
                    <th className="px-6 py-4">Operation</th>
                    <th className="px-6 py-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {db.getLogs().map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="px-6 py-4 font-bold text-slate-700">{log.userName}</td>
                      <td className="px-6 py-4"><span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest">{log.action}</span></td>
                      <td className="px-6 py-4 text-slate-500">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'payments':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h1 className="text-2xl font-bold text-slate-800">Payments Ledger</h1>
              {(user.permissions.canAddPayments || user.role === 'ADMIN') && (
                <button onClick={() => { setPaymentError(null); setPaymentForm({ roomId: '', amount: '' }); setShowPaymentModal(true); }} className="bg-[#049669] text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-emerald-900/10 hover:bg-[#057a55] transition-all active:scale-95">Record New Payment</button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {db.getPayments().reverse().map(p => (
                <div key={p.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Unit Assignment</span>
                       <h3 className="text-xl font-black text-slate-800">Room {p.roomNumber}</h3>
                     </div>
                     <span className="text-[#049669] font-black text-xl">{CURRENCY} {p.amount.toLocaleString()}</span>
                   </div>
                   <div className="space-y-2 pt-4 border-t border-slate-50 mt-4">
                     <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <i className="far fa-calendar-alt w-4"></i>
                        <span className="font-medium">{new Date(p.date).toLocaleDateString()}</span>
                     </div>
                     <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <i className="far fa-user w-4"></i>
                        <span className="font-bold uppercase tracking-wider">Collected by: {p.recordedBy}</span>
                     </div>
                   </div>
                </div>
              ))}
              {db.getPayments().length === 0 && (
                <div className="col-span-full py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 text-center text-slate-400 italic">No historical payment data found.</div>
              )}
            </div>
          </div>
        )
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="relative">
      <NotificationToast notification={notification} onClose={() => setNotification(null)} />
      
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Record Transaction</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Target Room</label>
                <select 
                  required 
                  className="w-full border border-slate-200 p-4 rounded-2xl outline-none focus:border-indigo-500 bg-slate-50/50"
                  value={paymentForm.roomId}
                  onChange={e => setPaymentForm({...paymentForm, roomId: e.target.value})}
                >
                  <option value="">Select an active room...</option>
                  {db.getRooms().filter(r => r.status === 'Occupied').map(r => (
                    <option key={r.id} value={r.id}>Room {r.roomNumber} (Due: {CURRENCY} {r.currentBalance})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Collected Amount ({CURRENCY} - Max 9,999)</label>
                <div className="relative">
                  <input 
                    required 
                    type="number" 
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00" 
                    max="9999"
                    className={`w-full border border-slate-200 p-4 rounded-2xl outline-none transition-all text-lg font-black ${paymentError ? 'border-rose-500 bg-rose-50 text-rose-700' : 'focus:border-indigo-500 bg-slate-50/50'}`} 
                    value={paymentForm.amount} 
                    onChange={e => {
                      setPaymentForm({...paymentForm, amount: e.target.value});
                      if (paymentError) setPaymentError(null);
                    }} 
                  />
                  {paymentError && <p className="text-rose-500 text-[10px] font-black uppercase mt-2 pl-1">{paymentError}</p>}
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 border border-slate-200 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all">Discard</button>
                <button type="submit" className="flex-1 bg-[#049669] text-white py-4 rounded-2xl font-bold hover:bg-[#057a55] shadow-xl shadow-emerald-900/20 active:scale-95 transition-all">Submit Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Layout user={user} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
        {renderContent()}
      </Layout>
    </div>
  );
};

export default App;
