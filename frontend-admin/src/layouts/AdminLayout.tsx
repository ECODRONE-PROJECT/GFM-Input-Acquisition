import { useEffect, useState, type MouseEvent } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { clearAdminSession, getAdminSession } from '../lib/adminAuth';
import {
  fetchAdminNotifications,
  markAsRead,
  resolveAdminNotificationActionUrl,
  type AdminNotification,
} from '../lib/adminNotifications';

/**
 * Safely formats a notification timestamp for the drawer.
 */
function safeFormatTime(timestamp: string) {
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const session = getAdminSession();
  const handleLogout = (e: MouseEvent) => {
    e.preventDefault();
    clearAdminSession();
    navigate('/login', { replace: true });
  };
  const adminName = session?.admin?.name || 'Admin User';
  const adminEmail = session?.admin?.email || '';
  const adminInitial = adminName.trim().charAt(0).toUpperCase() || 'A';

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifs = async () => {
    try {
      const data = await fetchAdminNotifications(100, false);
      setNotifications(data.filter((item) => !item.isRead));
    } catch {
      // background fail
    }
  };

  useEffect(() => {
    void fetchNotifs();
    const interval = setInterval(() => void fetchNotifs(), 15000);
    const handleFocus = () => void fetchNotifs();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchNotifs();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleMarkRead = (id: string) => {
    markAsRead(id);
    setNotifications((current) => current.filter((item) => item.id !== id));
    void fetchNotifs();
  };

  const handleToggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
    if (!isDrawerOpen) void fetchNotifs();
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) => 
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      isActive 
        ? "text-primary-container font-bold bg-white shadow-sm" 
        : "text-stone-600 hover:text-primary-container hover:bg-stone-200/50"
    }`;

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex flex-col md:flex-row">
      {/* TopNavBar (Mobile Only) */}
      <header className="md:hidden flex justify-between items-center w-full px-5 py-3 bg-[#f9f9f6] sticky top-0 z-40 shadow-sm shadow-stone-200/50 font-headline tracking-tight border-b border-stone-200/60">
        <div className="text-2xl font-bold text-[#0d631b]">Grow For Me</div>
        <div className="flex items-center gap-4">
          <button onClick={handleToggleDrawer} className="relative group">
            <span className="material-symbols-outlined text-stone-500 group-hover:text-primary-container transition-colors">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-[#f9f9f6]">
                {unreadCount}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2">
            <div className="text-right leading-tight">
              <p className="text-[11px] font-semibold text-stone-700">{adminName}</p>
              <p className="text-[10px] text-stone-500">{adminEmail}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold ring-1 ring-stone-200">
              {adminInitial}
            </div>
          </div>
        </div>
      </header>

      {/* SideNavBar (Desktop) */}
      <aside className="hidden md:flex flex-col p-4 gap-2 bg-[#f4f4f1] h-screen w-64 fixed left-0 top-0 border-r border-stone-200/60 font-headline text-sm font-medium">
        <div className="px-4 py-6 mb-4">
          <div className="flex flex-col items-start">
            <img src="/gfm_logo.png" alt="Grow For Me Logo" className="h-8 object-contain mix-blend-multiply" />
            <p className="text-[10px] text-stone-500 uppercase tracking-widest mt-2 ml-1">Admin Management</p>
          </div>
        </div>

        <div className="mx-2 mb-4 p-3 rounded-xl bg-white ring-1 ring-stone-200/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-sm font-bold">
              {adminInitial}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-stone-800 truncate">{adminName}</p>
              <p className="text-[11px] text-stone-500 truncate">{adminEmail}</p>
            </div>
          </div>
        </div>
        
        <nav className="space-y-1">
          <NavLink to="/admin" end className={navItemClass}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/admin/inventory" className={navItemClass}>
            <span className="material-symbols-outlined">inventory_2</span>
            <span>Inventory</span>
          </NavLink>
          <NavLink to="/admin/deals" className={navItemClass}>
            <span className="material-symbols-outlined">local_offer</span>
            <span>Deals</span>
          </NavLink>
          <NavLink to="/admin/orders" className={navItemClass}>
            <span className="material-symbols-outlined">shopping_cart</span>
            <span>Orders</span>
          </NavLink>
          <NavLink to="/admin/credit" className={navItemClass}>
            <span className="material-symbols-outlined">payments</span>
            <span>Credit Apps</span>
          </NavLink>
          <button onClick={handleToggleDrawer} className={`flex items-center w-full gap-3 px-4 py-3 rounded-xl transition-all ${isDrawerOpen ? 'text-primary-container font-bold bg-white shadow-sm' : 'text-stone-600 hover:text-primary-container hover:bg-stone-200/50'}`}>
            <div className="relative">
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-error text-white text-[8px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <span>Notifications</span>
          </button>
          <NavLink to="/admin/audit" className={navItemClass}>
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </NavLink>
        </nav>
        
        <div className="mt-auto p-4 bg-surface-container-highest rounded-xl cursor-pointer" onClick={handleLogout}>
          <p className="text-xs text-on-surface-variant font-semibold mb-2">System Status</p>
          <div className="flex items-center gap-2 text-[10px] text-primary font-bold">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            OPERATIONAL
          </div>
          <p className="text-xs text-stone-500 mt-2 hover:text-error transition-colors">Sign Out</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="w-full flex-1 md:ml-64 px-4 py-5 md:px-8 md:py-8">
        <Outlet />
      </main>

      {/* Persistent Notification Drawer */}
      {isDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[50] transition-opacity" onClick={() => setIsDrawerOpen(false)} />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-[60] shadow-[-20px_0_50px_rgba(0,0,0,0.1)] border-l border-stone-100 flex flex-col font-headline animate-in slide-in-from-right duration-300">
             <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                <div>
                   <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">Notifications</h2>
                   <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Platform Command Center</p>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center hover:bg-stone-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-stone-600">close</span>
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-20 text-center opacity-40">
                     <span className="material-symbols-outlined text-5xl mb-4">notifications_off</span>
                     <p className="text-xs font-bold uppercase tracking-widest">No active alerts</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const actionTarget = resolveAdminNotificationActionUrl(notif);
                    return (
                    <div 
                      key={notif.id}
                      className={`group p-5 rounded-2xl border transition-all ${notif.isRead ? 'bg-stone-50/50 border-stone-100 opacity-60' : 'bg-white border-primary/10 shadow-sm ring-1 ring-primary/5'}`}
                    >
                       <div className="flex justify-between items-start mb-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${
                             notif.category === 'CREDIT' ? 'bg-blue-100 text-blue-700' :
                             notif.category === 'ORDER' ? 'bg-emerald-100 text-emerald-700' :
                             notif.category === 'DEAL' ? 'bg-amber-100 text-amber-700' :
                             notif.category === 'SECURITY' ? 'bg-red-100 text-red-700' :
                             'bg-stone-100 text-stone-700'
                           }`}>
                            {notif.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                           <h4 className="font-bold text-stone-900 text-sm">{notif.title}</h4>
                           {!notif.isRead && (new Date().getTime() - new Date(notif.timestamp).getTime() < 3600000) && (
                             <span className="px-1 py-0.5 bg-[#0d631b] text-white text-[7px] font-black rounded uppercase tracking-tighter animate-pulse shadow-sm">NEW</span>
                           )}
                        </div>
                        <p className="text-xs text-stone-500 leading-relaxed mb-4">{notif.message}</p>
                       
                        <div className="flex items-center gap-2">
                           {actionTarget && (
                              <NavLink 
                                to={actionTarget} 
                                onClick={() => setIsDrawerOpen(false)}
                                className="px-3 py-1.5 bg-[#0d631b] text-white text-[10px] font-bold rounded-lg"
                              >
                                Take Action
                              </NavLink>
                           )}
                           
                           {!notif.isRead && (
                              <button 
                                onClick={() => handleMarkRead(notif.id)}
                                className="px-3 py-1.5 border border-stone-200 text-stone-500 text-[10px] font-bold rounded-lg hover:bg-stone-50"
                              >
                                Archive
                              </button>
                           )}
                           
                           <div className="ml-auto">
                              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tight">
                                {safeFormatTime(notif.timestamp)}
                              </span>
                           </div>
                        </div>
                    </div>
                    );
                  })
                )}
             </div>

             <div className="p-6 border-t border-stone-100 bg-stone-50/30">
                <NavLink 
                  to="/admin/notifications" 
                  onClick={() => setIsDrawerOpen(false)}
                  className="block w-full py-3 bg-stone-900 text-white text-center rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-lg"
                >
                   View All Archives
                </NavLink>
             </div>
          </aside>
        </>
      )}
    </div>
  );
}
