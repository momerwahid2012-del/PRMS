
import React, { useEffect, useState } from 'react';
import { db } from '../services/storage';
import { Room, RoomStatus, SystemStats, User, UserRole } from '../types';
import { CURRENCY } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reminders, setReminders] = useState<Room[]>([]);
  const [overdueRooms, setOverdueRooms] = useState<Room[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  
  const user = db.getCurrentUser();
  const isAdmin = user?.role === UserRole.ADMIN;

  useEffect(() => {
    const allRooms = db.getRooms();
    const emps = db.getEmployees();
    const settings = db.getSettings();
    
    setEmployees([...emps].sort((a, b) => b.coins - a.coins));
    setShowLeaderboard(settings.showLeaderboard);
    setRooms(allRooms);
    
    const revenue = allRooms.filter(r => r.status === RoomStatus.OCCUPIED).reduce((acc, r) => acc + r.monthlyRent, 0);
    const expenses = allRooms.reduce((acc, r) => acc + (r.monthlyExpenses || 0), 0);
    const overdue = allRooms.filter(r => r.status === RoomStatus.OCCUPIED && r.currentBalance > 0);

    const computedStats: SystemStats = {
      totalRooms: allRooms.length,
      availableRooms: allRooms.filter(r => r.status === RoomStatus.AVAILABLE).length,
      occupiedRooms: allRooms.filter(r => r.status === RoomStatus.OCCUPIED).length,
      maintenanceRooms: allRooms.filter(r => r.status === RoomStatus.MAINTENANCE).length,
      reservedRooms: allRooms.filter(r => r.status === RoomStatus.RESERVED).length,
      activeEmployees: emps.length,
      projectedRevenue: revenue,
      totalExpenses: expenses,
      netProfit: revenue - expenses,
      overdueCount: overdue.length,
      showLeaderboard: settings.showLeaderboard
    };
    setStats(computedStats);

    const openStays = allRooms.filter(r => r.status === RoomStatus.OCCUPIED && r.isOpenEnded);
    setReminders(openStays);
    setOverdueRooms(overdue);
  }, []);

  const toggleLeaderboard = () => {
    const newValue = !showLeaderboard;
    setShowLeaderboard(newValue);
    db.updateSettings({ showLeaderboard: newValue });
  };

  if (!stats) return <div className="p-8 text-center text-slate-400">Loading metrics...</div>;

  const chartData = [
    { name: 'Revenue', value: stats.projectedRevenue, color: '#3b82f6' },
    { name: 'Expenses', value: stats.totalExpenses, color: '#ef4444' },
    { name: 'Net Profit', value: Math.max(0, stats.netProfit), color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100 animate-in slide-in-from-top duration-500">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <i className="fas fa-triangle-exclamation text-amber-500"></i> Critical Alerts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {overdueRooms.length > 0 && overdueRooms.map(room => (
             <div key={`overdue-${room.id}`} className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex justify-between items-center">
               <div>
                 <p className="text-[10px] font-black text-rose-600 uppercase">Balance Overdue</p>
                 <p className="font-bold text-slate-800">Unit {room.roomNumber}</p>
               </div>
               <p className="text-sm font-black text-rose-700">{CURRENCY} {room.currentBalance.toLocaleString()}</p>
             </div>
           ))}
           {stats.overdueCount === 0 && reminders.length === 0 && (
             <p className="col-span-full py-2 text-center text-slate-400 italic text-sm">Operation clear.</p>
           )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatusSummaryCard title="Available" count={stats.availableRooms} color="emerald" icon="fa-door-open" />
        <StatusSummaryCard title="Occupied" count={stats.occupiedRooms} color="blue" icon="fa-user-check" />
        <StatusSummaryCard title="Reserved" count={stats.reservedRooms} color="purple" icon="fa-calendar-check" />
        <StatusSummaryCard title="Maintenance" count={stats.maintenanceRooms} color="amber" icon="fa-tools" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Financial Overview</h3>
            <div className="h-64 sm:h-80 w-full min-h-[320px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    formatter={(value: number) => [`${CURRENCY} ${value.toLocaleString()}`, 'Amount']} 
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {(showLeaderboard || isAdmin) && (
            <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <i className="fas fa-trophy text-amber-500"></i> Staff Ranking
                </h3>
              </div>
              <div className="space-y-3">
                {employees.map((emp, idx) => (
                  <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-slate-300 w-4 text-center">{idx + 1}</span>
                      <p className="font-bold text-slate-800 text-sm">{emp.fullName}</p>
                    </div>
                    <p className={`text-lg font-black ${emp.coins >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      <i className="fas fa-coins mr-1"></i>{emp.coins}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-slate-900 text-white p-6 shadow-xl">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Total Portfolio Projection</h3>
             <p className={`text-4xl font-black ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
               {stats.netProfit >= 0 ? '+' : ''}{CURRENCY} {stats.netProfit.toLocaleString()}
             </p>
          </div>
          {!isAdmin && user && (
            <div className="rounded-xl bg-indigo-600 text-white p-6 shadow-lg">
              <h3 className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-4">Daily Tracker</h3>
              <p className="text-3xl font-black">{user.coins} Coins</p>
              <div className="mt-6 pt-6 border-t border-white/10">
                 <div className="flex justify-between text-xs mb-1">
                    <span>Daily Progress</span>
                    <span>{Math.round((user.dailyCollected / user.dailyTarget) * 100) || 0}%</span>
                 </div>
                 <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white" style={{ width: `${Math.min(100, (user.dailyCollected / user.dailyTarget) * 100) || 0}%` }}></div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatusSummaryCard = ({ title, count, color, icon }: { title: string, count: number, color: string, icon: string }) => {
  const styles: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100'
  };
  return (
    <div className={`p-4 rounded-2xl border ${styles[color]} shadow-sm`}>
      <div className="flex justify-between items-center mb-1">
        <i className={`fas ${icon} opacity-30`}></i>
        <span className="text-[10px] font-black uppercase">{title}</span>
      </div>
      <p className="text-2xl font-black">{count}</p>
    </div>
  );
};

export default Dashboard;
