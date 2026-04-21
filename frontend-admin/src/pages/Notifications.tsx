import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchAdminNotifications,
  markAsRead,
  clearAllNotifications,
  resolveAdminNotificationActionUrl,
  type AdminNotification,
} from '../lib/adminNotifications';

function formatRelativeTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Notifications() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminNotifications(50, true);
      setNotifications(data.filter((item) => !item.isRead));
    } catch {
      // Keep prior data on transient refresh failures.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleMarkRead = (id: string) => {
    markAsRead(id);
    setNotifications((current) => current.filter((item) => item.id !== id));
    void loadData();
  };

  const handleClearAll = () => {
    clearAllNotifications(notifications);
    setNotifications([]);
    void loadData();
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-stone-400 uppercase tracking-widest">Aggregating Alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="max-w-4xl mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-stone-400 mb-2">Platform / Center</p>
          <h1 className="text-4xl font-headline font-extrabold text-stone-900 tracking-tighter">Notifications</h1>
          <p className="text-sm font-medium text-stone-500 mt-2">Active alerts requiring administrative oversight and tracking.</p>
        </div>
        
        {notifications.length > 0 && (
          <button 
            onClick={handleClearAll}
            className="px-5 py-2.5 bg-[#f4f4f1] text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-200 transition-colors border border-stone-200"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white border border-stone-100 rounded-3xl p-20 text-center shadow-sm">
           <span className="material-symbols-outlined text-7xl text-stone-200 mb-4 block">notifications_off</span>
           <h3 className="text-xl font-bold text-stone-900 font-headline">All Clear</h3>
           <p className="text-sm text-stone-500 mt-2">There are no actionable alerts currently requiring your attention.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => {
            const actionTarget = resolveAdminNotificationActionUrl(notif);
            return (
            <div 
              key={notif.id}
              className={`group relative bg-white border rounded-2xl p-6 transition-all shadow-sm flex gap-6 items-start ${
                notif.isRead ? 'opacity-60 border-stone-100' : 'border-primary/10 ring-1 ring-primary/5'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                notif.category === 'CREDIT' ? 'bg-blue-100 text-blue-700' :
                notif.category === 'ORDER' ? 'bg-emerald-100 text-emerald-700' :
                notif.category === 'DEAL' ? 'bg-amber-100 text-amber-700' :
                notif.category === 'SECURITY' ? 'bg-red-100 text-red-700' :
                'bg-stone-100 text-stone-700'
              }`}>
                <span className="material-symbols-outlined text-2xl">
                  {notif.title.toLowerCase().includes('payment') && notif.title.toLowerCase().includes('success') ? 'credit_score' :
                   notif.title.toLowerCase().includes('payment') ? 'account_balance_wallet' :
                   notif.title.toLowerCase().includes('ordered') ? 'receipt_long' :
                   notif.title.toLowerCase().includes('stock') ? 'inventory' :
                   notif.title.toLowerCase().includes('follow') ? 'assignment_late' :
                   notif.category === 'CREDIT' ? 'payments' : 
                   notif.category === 'ORDER' ? 'receipt_long' :
                   notif.category === 'DEAL' ? 'local_offer' :
                   notif.category === 'SYSTEM' ? 'inventory_2' : 'info'}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-stone-900 leading-tight truncate">{notif.title}</h3>
                  {!notif.isRead && (new Date().getTime() - new Date(notif.timestamp).getTime() < 3600000) && (
                    <span className="px-1.5 py-0.5 bg-[#0d631b] text-white text-[8px] font-black rounded uppercase tracking-tighter animate-pulse">NEW</span>
                  )}
                </div>
                <p className="text-sm text-stone-600 leading-relaxed max-w-2xl mb-4">{notif.message}</p>
                
                <div className="flex items-center gap-3">
                  {actionTarget && (
                    <Link 
                      to={actionTarget}
                      className="px-4 py-1.5 bg-[#0d631b] text-white text-[11px] font-bold rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Take Action
                    </Link>
                  )}
                  {!notif.isRead && (
                    <button 
                      onClick={() => handleMarkRead(notif.id)}
                      className="px-4 py-1.5 text-stone-500 hover:text-stone-900 text-[11px] font-bold rounded-lg transition-colors border border-stone-100 hover:bg-stone-50"
                    >
                      Archive & Dismiss
                    </button>
                  )}
                  <div className="ml-auto">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tight whitespace-nowrap">
                      {formatRelativeTime(notif.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
