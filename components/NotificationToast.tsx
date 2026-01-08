
import React, { useEffect } from 'react';
import { Notification } from '../types';

interface Props {
  notification: Notification | null;
  onClose: () => void;
}

const NotificationToast: React.FC<Props> = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (!notification) return null;

  const isSuccess = notification.message.toLowerCase().includes('success') || notification.type === 'success';
  const isError = notification.message.toLowerCase().includes('error') || notification.type === 'warning';

  return (
    <div className="fixed top-6 right-6 z-[200] animate-bounce-in max-w-sm w-full">
      <div className={`backdrop-blur-md px-6 py-5 rounded-[2rem] shadow-2xl border-2 flex items-center gap-4 ${isError ? 'bg-rose-950/90 border-rose-500 text-rose-100' : 'bg-slate-900/90 border-emerald-500 text-emerald-100'}`}>
        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isError ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          <i className={`fas ${isError ? 'fa-triangle-exclamation' : 'fa-check-circle'} text-xl text-white`}></i>
        </div>
        <div className="overflow-hidden">
          <h4 className={`font-black text-[10px] uppercase tracking-widest mb-0.5 ${isError ? 'text-rose-400' : 'text-emerald-400'}`}>
            System Message
          </h4>
          <p className="text-sm font-bold truncate leading-tight">{notification.message}</p>
        </div>
        <button onClick={onClose} className="ml-auto p-2 text-white/30 hover:text-white transition-colors">
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
