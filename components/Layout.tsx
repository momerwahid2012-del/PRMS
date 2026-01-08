
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../types';
import { APP_NAME } from '../constants';
import { db } from '../services/storage';

interface LayoutProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, activeTab, setActiveTab, onLogout, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ rooms: any[], users: any[], payments: any[] }>({ rooms: [], users: [], payments: [] });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie', roles: [UserRole.ADMIN, UserRole.EMPLOYEE] },
    { id: 'rooms', label: 'Inventory', icon: 'fa-bed', roles: [UserRole.ADMIN, UserRole.EMPLOYEE] },
    { id: 'payments', label: 'Payments', icon: 'fa-file-invoice-dollar', roles: [UserRole.ADMIN, UserRole.EMPLOYEE] },
    { id: 'employees', label: 'Staff Management', icon: 'fa-users-cog', roles: [UserRole.ADMIN] },
    { id: 'reports', label: 'Analytics', icon: 'fa-file-invoice', roles: [UserRole.ADMIN] },
    { id: 'feedback', label: 'Feedback', icon: 'fa-comment-alt', roles: [UserRole.ADMIN, UserRole.EMPLOYEE] },
    { id: 'logs', label: 'Audit Trail', icon: 'fa-history', roles: [UserRole.ADMIN] },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (item.id === 'payments' && !user.permissions.canViewPayments && user.role !== UserRole.ADMIN) return false;
    return item.roles.includes(user.role);
  });

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const results = db.globalSearch(searchQuery);
      setSearchResults(results);
      setIsSearchOpen(true);
    } else {
      setIsSearchOpen(false);
    }
  }, [searchQuery]);

  const handleResultClick = (tab: string) => {
    setActiveTab(tab);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar aside */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 lg:translate-x-0 lg:static flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo Section */}
        <div className="flex h-24 shrink-0 items-center justify-center border-b border-slate-800 px-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <i className="fas fa-building text-2xl"></i>
            </div>
            <span className="text-2xl font-black tracking-tighter">{APP_NAME}</span>
          </div>
        </div>

        {/* Scrollable Navigation Area */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          {filteredMenuItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => handleTabClick(item.id)} 
              className={`flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-200'}`}
            >
              <i className={`fas ${item.icon} w-5 text-lg ${activeTab === item.id ? 'text-white' : 'text-slate-600'}`}></i> 
              {item.label}
            </button>
          ))}
        </nav>

        {/* User Info & Footer Section - Fixed at Bottom */}
        <div className="shrink-0 border-t border-slate-800 p-6 bg-slate-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-10 w-10 rounded-xl bg-indigo-600/20 flex items-center justify-center font-black text-indigo-400 border border-indigo-600/30">
              {user.fullName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-sm font-black text-slate-100">{user.fullName}</p>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout} 
            className="flex w-full items-center justify-center gap-2 text-rose-400 text-xs font-black bg-rose-950/20 hover:bg-rose-950/40 py-3 rounded-xl transition-all border border-rose-900/30"
          >
            <i className="fas fa-power-off"></i> Logout System
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="shrink-0 flex h-20 items-center border-b bg-white/80 backdrop-blur-md px-4 sm:px-10 shadow-sm z-[60]">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Open menu"
            >
              <i className="fas fa-bars-staggered text-xl"></i>
            </button>
            
            {/* Global Search Bar */}
            <div className="relative flex-1 max-w-md hidden sm:block" ref={searchRef}>
              <div className="relative">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input 
                  type="text" 
                  placeholder="Find units, staff or ledger entries..." 
                  className="w-full bg-slate-100 border-none rounded-2xl py-2.5 pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length > 0 && setIsSearchOpen(true)}
                />
              </div>

              {/* Search Results Dropdown */}
              {isSearchOpen && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[70]">
                  <div className="max-h-[70vh] overflow-y-auto p-2 custom-scrollbar">
                    {searchResults.rooms.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-2">Units</p>
                        {searchResults.rooms.map(r => (
                          <button key={r.id} onClick={() => handleResultClick('rooms')} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors text-left group">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center"><i className="fas fa-door-closed text-xs"></i></div>
                              <span className="text-sm font-bold text-slate-700">Room {r.roomNumber}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Go to Inventory</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.users.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-2">Personnel</p>
                        {searchResults.users.map(u => (
                          <button key={u.id} onClick={() => handleResultClick('employees')} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors text-left group">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><i className="fas fa-user text-xs"></i></div>
                              <span className="text-sm font-bold text-slate-700">{u.fullName}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Manage Staff</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.payments.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-2">Transactions</p>
                        {searchResults.payments.map(p => (
                          <button key={p.id} onClick={() => handleResultClick('payments')} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors text-left group">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center"><i className="fas fa-receipt text-xs"></i></div>
                              <div className="overflow-hidden">
                                <p className="text-sm font-bold text-slate-700 truncate">Room {p.roomNumber} - AED {p.amount}</p>
                                <p className="text-[10px] text-slate-400">{new Date(p.date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">View Ledger</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.rooms.length === 0 && searchResults.users.length === 0 && searchResults.payments.length === 0 && (
                      <div className="p-8 text-center">
                        <i className="fas fa-search text-slate-200 text-3xl mb-3"></i>
                        <p className="text-sm text-slate-400 font-medium">No matches found for "{searchQuery}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <h2 className="text-xl font-black text-slate-800 capitalize tracking-tight ml-auto hidden lg:block">{activeTab.replace('-', ' ')}</h2>
          </div>
          <div className="hidden sm:flex items-center gap-6 ml-6">
             {user.role === UserRole.EMPLOYEE && (
               <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 flex items-center gap-3">
                  <i className="fas fa-coins text-amber-500"></i>
                  <span className="text-sm font-black text-amber-700">{user.coins} Coins</span>
               </div>
             )}
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
               {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}
             </span>
          </div>
        </header>

        {/* Content with Scroll */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar bg-slate-50/50">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        aside .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
        }
        main .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default Layout;
